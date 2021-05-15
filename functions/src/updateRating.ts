import axios from 'axios';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import Submission from 'shared/types/submission';
import UserProfile from 'shared/types/userProfile';
import ContestRecord from '../../shared/src/types/contestRecord';
import NewUserProfile from './types/newUserProfile';
import ParticipationInfo from './types/participationInfo';
import accessToAtCoder from './utils/accessToAtCoder';
import calculateNewRating from './utils/calculateNewRating';

interface TaskResult {
  Penalty: number;
  Elapsed: number;
  Status: number;
}

//  提出から参加したコンテストを検出し，レート変動させる
// How to debug
//  curl --request POST --header "Content-Type: application/json" --data '{\"data\":{\"userID\":\"L657lEpiZKhCJOu6tINUQdmVNsj2\"}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/updateRating"
export const updateRating = functions.https.onCall(async (data, context) => {
  const userID = data.userID;
  if (!userID) {
    return;
  }

  const profileRef = admin.firestore().collection('users').doc(userID);
  const profileSnapShot = await profileRef.get();
  if (!profileSnapShot.exists) {
    return;
  }
  const profile = profileSnapShot.data() as NewUserProfile;

  const allSubmissions = await getSubmissions(profile.handle);
  const submissions = clusterSubmissions(allSubmissions, profile);
  const allContests = await fetchAllContests();

  for (const contestID of Object.keys(submissions)) {
    const participation = await checkParticipation(
      profile.handle,
      submissions[contestID]
    ).catch((e) => e);

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
    const contestResult = await calculateNewRating(participation, profile);

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

    profile.lastUpdateTime = submissions[contestID][0].epoch_second;
    profile.records.unshift(newRecord);
    profile.rating = contestResult.newRating;
    await profileRef.update(profile);
  }

  return profile;
});

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

const clusterSubmissions = (
  allSubmissions: Submission[],
  profile: UserProfile
): { [key: string]: Submission[] } => {
  const valids = allSubmissions.filter(
    (s) => s.epoch_second > profile.lastUpdateTime
  );
  valids.sort((a, b) => a.epoch_second - b.epoch_second);

  const participatedContests = new Set<string>();
  for (const record of profile.records) {
    participatedContests.add(record.contestID);
  }

  const filtered: { [key: string]: Submission[] } = {};
  for (const submission of valids) {
    // virtualの結果は1つしか存在しない
    // 過去に参加したコンテストはスキップ
    if (participatedContests.has(submission.contest_id)) {
      continue;
    }

    if (!(submission.contest_id in filtered)) {
      filtered[submission.contest_id] = [];
    }
    filtered[submission.contest_id].push(submission);
  }

  return filtered;
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
// WAだけしかない場合など，適切な開始時刻が得られない場合は
// 最も早い提出の時刻を開始時刻とする
const checkStartTimeSeconds = (
  taskResults: { [contestID: string]: TaskResult },
  submissions: Submission[]
) => {
  let startTimeSeconds = submissions[0].epoch_second;
  const divisor = 1000000000;

  for (const submission of submissions) {
    if (submission.result !== 'AC') {
      continue;
    }

    if (taskResults[submission.problem_id]) {
      startTimeSeconds =
        submission.epoch_second -
        taskResults[submission.problem_id].Elapsed / divisor;
      break;
    }
  }

  return startTimeSeconds;
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
