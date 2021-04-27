import ParticipationInfo from 'shared/types/participationInfo';
import UserProfile from 'shared/types/userProfile';
import firebase from '../firebase';

interface Submission {
  contest_id: string;
  problem_id: string;
  user_id: string;
  epoch_second: number;
}

// コンテスト情報だけでなく，最後にチェックした提出の時刻も一緒に返したい
// ただし，終了していないバチャの提出があった場合はそこで処理を打ち切る
export const getParticipateVirtuals = async (
  profile: UserProfile
): Promise<ParticipationInfo[]> => {
  const handle = profile.handle;
  const lastUpdateTime = profile.lastUpdateTime;
  const url = `https://kenkoooo.com/atcoder/atcoder-api/results?user=${handle}`;
  const response = await fetch(url);
  const json = await response.json();
  const submissions = json as Submission[];

  const checkedContests = new Set<string>();
  for (const record of profile.records) {
    checkedContests.add(record.contestID);
  }

  const virtuals = new Array<ParticipationInfo>();
  submissions.sort((a, b) => b.epoch_second - a.epoch_second);
  for (const submission of submissions) {
    if (submission.epoch_second < lastUpdateTime) {
      break;
    }

    // virtualの結果は1つしか存在しない
    // すでにチェックしたコンテストはスキップ
    const contestID = submission.contest_id;
    if (checkedContests.has(contestID)) {
      continue;
    }
    checkedContests.add(contestID);

    const participation = await checkParticipation(
      handle,
      contestID,
      submission.problem_id,
      submission.epoch_second
    ).catch((e) => e);
    if (participation === null) {
      continue;
    }

    if (participation.startTimeSeconds > lastUpdateTime) {
      virtuals.push(participation);
    }
  }
  return virtuals.reverse();
};

const checkParticipation = async (
  handle: string,
  contestID: string,
  problemID: string,
  submissionTime: number
) => {
  const standingUrl = `https://atcoder.jp/contests/${contestID}/standings/virtual/json`;
  const standingResponse = await firebase
    .functions()
    .httpsCallable('getExternal')({
    url: standingUrl,
  });

  const divisor = 1000000000;
  const data = standingResponse.data.result;
  for (const user of data.StandingsData) {
    if (
      user.UserScreenName === handle &&
      user.IsRated &&
      user.Additional['standings.virtualElapsed'] === -1
    ) {
      const startTimeSeconds =
        submissionTime - user.TaskResults[problemID].Elapsed / divisor;
      return {
        contestID,
        handle,
        startTimeSeconds,
        score: user.TotalResult.Score as number,
        elapsedTime: user.TotalResult.Elapsed / divisor,
      };
    }
  }

  return {
    contestID,
    handle,
    startTimeSeconds: 0,
    score: 0,
    elapsedTime: 0,
  };
};
