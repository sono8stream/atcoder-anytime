import axios from 'axios';
import * as admin from 'firebase-admin';

import Submission from 'shared/types/submission';
import UserProfile from 'shared/types/userProfile';
import NewUserProfile from '../types/newUserProfile';
import ParticipationInfo from '../types/participationInfo';
import accessToAtCoder from './accessToAtCoder';
import calculateNewRating from './calculateNewRating';
import { clusterSubmissions } from './clusterSubmissions';

interface TaskResult {
  Penalty: number;
  Elapsed: number;
  Status: number;
}

type UpdateResult = { timedOut: boolean; cancelled: boolean };

//  提出から参加したコンテストを検出し，レート変動させる
//  deadlineMs: この時刻を過ぎたら打ち切り（callable タイムアウト対策）
//  jobRef: キャンセル検知用（updateUserProfile 実行時に 'cancelled' に変わる）
const updateRatingAPI = async (
  userID: string,
  deadlineMs?: number,
  jobRef?: admin.firestore.DocumentReference
): Promise<UpdateResult> => {
  const profileRef = admin.firestore().collection('users').doc(userID);

  const profileSnapShot = await profileRef.get();
  if (!profileSnapShot.exists) {
    return { timedOut: false, cancelled: false };
  }
  const profile = profileSnapShot.data() as NewUserProfile;

  const t0 = Date.now();
  const allSubmissions = await getSubmissions(profile.handle);
  console.log(`[perf] getSubmissions: ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const submissions = clusterSubmissions(allSubmissions, profile);
  const allContests = await fetchAllContests();
  console.log(`[perf] fetchAllContests: ${Date.now() - t1}ms, contests to process: ${Object.keys(submissions).length}`);

  for (const contestID of Object.keys(submissions)) {
    // タイムアウトが近づいたら打ち切り（lastUpdateTime は各コンテスト後に保存済みなので再開可能）
    if (deadlineMs && Date.now() >= deadlineMs) {
      console.log(`Approaching timeout, stopping at ${contestID}`);
      return { timedOut: true, cancelled: false };
    }

    // ハンドル再登録によるキャンセルチェック
    if (jobRef) {
      const jobSnap = await jobRef.get();
      if (jobSnap.data()?.status !== 'running') {
        console.log(`Job cancelled at ${contestID}`);
        return { timedOut: false, cancelled: true };
      }
    }

    const tContest = Date.now();
    let participation: ParticipationInfo | null;
    try {
      participation = await checkParticipation(
        profile.handle,
        submissions[contestID]
      );
    } catch (e) {
      // スタンディング取得失敗はスキップして次のコンテストへ
      console.error(`checkParticipation failed for ${contestID}:`, e);
      continue;
    }
    console.log(`[perf] ${contestID} checkParticipation: ${Date.now() - tContest}ms`);

    if (participation === null) {
      await profileRef.update({
        // 最初の提出までは進める
        lastUpdateTime: submissions[contestID][0].epoch_second,
      });
      continue;
    }

    if (!participation.isFinished) {
      break;
    }

    // レート計算
    const tRating = Date.now();
    const contestResult = await calculateNewRating(participation, profile);
    console.log(`[perf] ${contestID} calculateNewRating: ${Date.now() - tRating}ms`);

    const newRecord = {
      contestID: participation.contestID,
      startTime: participation.startTimeSeconds,
      contestName: allContests[participation.contestID] || '',
      rank: contestResult.rank,
      newRating: contestResult.newRating,
      oldRating: profile.rating,
      roundedPerformance: contestResult.roundedPerformance,
      isRated: contestResult.isRated,
    };

    const tWrite = Date.now();
    profile.lastUpdateTime = submissions[contestID][0].epoch_second;
    profile.records.unshift(newRecord);
    profile.rating = contestResult.newRating;
    await profileRef.update(profile as any);
    console.log(`[perf] ${contestID} firestoreWrite: ${Date.now() - tWrite}ms  total: ${Date.now() - tContest}ms`);
  }

  return { timedOut: false, cancelled: false };
};

const getSubmissions = async (handle: string): Promise<Submission[]> => {
  const url = `https://kenkoooo.com/atcoder/atcoder-api/results?user=${handle}`;
  const response = await axios
    .get(url, {
      headers: {
        'accept-encoding': 'gzip',
      },
    })
    .catch((e) => e.response);

  if (response.data) {
    return response.data as Submission[];
  }

  return [] as Submission[];
};


const checkParticipation = async (
  handle: string,
  submissions: Submission[]
): Promise<ParticipationInfo | null> => {
  const contestID = submissions[0].contest_id;

  const standingUrl = `https://atcoder.jp/contests/${contestID}/standings/virtual/json`;
  const standingResponse = await accessToAtCoder(standingUrl);

  const divisor = 1000000000;
  const data = standingResponse.result;

  for (const user of data.StandingsData) {
    if (user.UserScreenName === handle) {
      const startTimeSeconds = checkStartTimeSeconds(
        user.TaskResults,
        submissions
      );

      return {
        contestID,
        handle,
        startTimeSeconds,
        score: user.TotalResult.Score as number,
        elapsedTime: user.TotalResult.Elapsed / divisor,
        isRated: user.IsRated,
        isFinished: user.Additional['standings.virtualElapsed'] === -1,
      };
    }
  }

  // 不参加
  return null;
};

// コンテスト中に解いた問題と一致する問題があればそこを基準に開始時刻を計算する
// 1. AC提出でtaskResultsにマッチするものを優先
// 2. ACがなければ WA含む全提出でマッチを試みる（古いコンテストでIDフォーマットが異なる場合の対策）
// 3. それでも見つからない場合は最も早い提出の時刻を開始時刻とする
const checkStartTimeSeconds = (
  taskResults: { [contestID: string]: TaskResult },
  submissions: Submission[]
) => {
  const divisor = 1000000000;

  // Pass 1: AC提出のみ
  for (const submission of submissions) {
    if (submission.result !== 'AC') continue;
    if (taskResults[submission.problem_id]) {
      return submission.epoch_second - taskResults[submission.problem_id].Elapsed / divisor;
    }
  }

  // Pass 2: WA含む全提出（ACでマッチしなかった場合）
  for (const submission of submissions) {
    if (taskResults[submission.problem_id]) {
      return submission.epoch_second - taskResults[submission.problem_id].Elapsed / divisor;
    }
  }

  // Fallback: 最初の提出時刻
  return submissions[0].epoch_second;
};

const fetchAllContests = async () => {
  const url = 'https://kenkoooo.com/atcoder/resources/contests.json';
  const response = await axios
    .get(url, {
      headers: {
        'accept-encoding': 'gzip',
      },
    })
    .catch((e) => e.response);
  const contestDict: { [id: string]: string } = {};
  response.data.forEach((contest: any) => {
    contestDict[contest.id] = contest.title;
  });
  return contestDict;
};

export default updateRatingAPI;
