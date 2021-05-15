import ContestRecord from 'shared/types/contestRecord';
import NewUserProfile from '../types/newUserProfile';
import ParticipationInfo from '../types/participationInfo';
import accessToAtCoder from './accessToAtCoder';

interface ContestStandings {
  StandingsData: [
    {
      UserScreenName: string;
      Rank: number;
      IsRated: boolean;
      Rating: number;
      TotalResult: {
        Score: number;
        Elapsed: number;
      };
    }
  ];
}

const calculateNewRating = async (
  participationInfo: ParticipationInfo,
  profile: NewUserProfile
): Promise<{
  rank: number;
  roundedPerformance: number;
  newRating: number;
  isRated: boolean;
}> => {
  console.log(participationInfo.contestID);
  const [rank, upperIdx] = await calculateRank(participationInfo);

  const contestResults = await fetchContestResults(participationInfo.contestID);
  console.log(contestResults);
  if (contestResults === false || !participationInfo.isRated) {
    // unrated
    return {
      rank,
      newRating: profile.rating,
      roundedPerformance: 0,
      isRated: false,
    };
  }

  const roundedPerformance = await calculateRoundedPerformance(
    participationInfo,
    upperIdx,
    contestResults
  );
  console.log(rank, roundedPerformance);

  const newRating = await calculateRating(profile, roundedPerformance);
  return {
    rank,
    newRating,
    roundedPerformance,
    isRated: true,
  };
};

const calculateRank = async (participationInfo: ParticipationInfo) => {
  const { contestID, score, elapsedTime } = participationInfo;
  const url = `https://atcoder.jp/contests/${contestID}/standings/json`;
  const response = await accessToAtCoder(url);

  const result = response.result as ContestStandings;
  const standingData = result.StandingsData;

  if ((standingData.length as number) === 0) {
    return [1, 0];
  }

  const divisor = 1000000000;
  for (let i = 0; i < standingData.length; i++) {
    const targetScore = standingData[i].TotalResult.Score;
    const targetElapsed = standingData[i].TotalResult.Elapsed / divisor;
    if (score === targetScore && elapsedTime === targetElapsed) {
      return [standingData[i].Rank, i - 1];
    }
    if (
      score > targetScore ||
      (score === targetScore && elapsedTime < targetElapsed)
    ) {
      return [standingData[i].Rank, i - 1];
    }
  }
  return [
    standingData[standingData.length - 1].Rank + 1,
    standingData.length - 1,
  ];
};

const fetchContestResults = async (contestID: string) => {
  const url = `https://atcoder.jp/contests/${contestID}/results/json`;
  const response = await accessToAtCoder(url).catch((e) => e);

  console.log(response.result);
  if (response.result) {
    // レート変動が行われたか検証
    const zeroPerformances = response.result.reduce(
      (prev: number, user: any) => {
        return prev + user.Performance === 0 ? 1 : 0;
      },
      0
    );

    console.log(zeroPerformances, response.result.length);
    if (zeroPerformances === response.result.length) {
      return false;
    }

    return response.result;
  } else {
    return false;
  }
};

// ここでレーティング変動結果にアクセス
// 初めてコンテスト名とレート変動対象のコンテストかどうかわかる
const calculateRoundedPerformance = async (
  participationInfo: ParticipationInfo,
  upperIdx: number,
  contestResults: any
) => {
  let upperPerformance = 0;
  for (let i = upperIdx; i >= 0; i--) {
    if (contestResults[i].IsRated) {
      upperPerformance = contestResults[i].Performance;
      break;
    }
  }

  let lowerPerformance = 0;
  for (let i = upperIdx + 1; i < contestResults.length; i++) {
    if (contestResults[i].IsRated) {
      lowerPerformance = contestResults[i].Performance;
      break;
    }
  }

  if (upperPerformance === 0) {
    return lowerPerformance;
  }
  if (lowerPerformance === 0) {
    return upperPerformance;
  }
  return Math.round((lowerPerformance + lowerPerformance) / 2);
};

const calculateRating = (
  profile: NewUserProfile,
  roundedPerformance: number
) => {
  const rawRating = getRawRating(profile, roundedPerformance);
  console.log(rawRating);
  const beginnerCorrectedRating = getBeginnerCorrectedRating(
    profile.records.length + profile.officialParticipations,
    rawRating
  );
  const lowerCorrectedRating = getLowerCorrectedRating(beginnerCorrectedRating);
  const finalRating = Math.round(lowerCorrectedRating);
  console.log(finalRating);
  return finalRating;
};

const getRawRating = (profile: NewUserProfile, roundedPerformance: number) => {
  let numer = Math.pow(2, roundedPerformance / 800);
  let denom = 1;
  let ratio = 0.9;

  // 非破壊的に逆順ループ
  for (const contest of profile.records.slice().reverse()) {
    // unratedを無視
    if (!contest.isRated) {
      continue;
    }

    console.log(contest);
    numer += Math.pow(2, contest.roundedPerformance / 800) * ratio;
    denom += ratio;
    ratio *= 0.9;
  }
  if (profile.officialParticipations > 0) {
    numer += profile.officialNumeratorConvolution * ratio;
    denom += profile.officialDenominatorConvolution * ratio;
  }
  const g = numer / denom;
  return 800 * Math.log2(g);
};

// 参加回数が少ない場合の補正
const getBeginnerCorrectedRating = (
  participationCnt: number,
  rawRating: number
) => {
  const downDelta =
    ((Math.sqrt(1 - Math.pow(0.81, participationCnt)) /
      (1 - Math.pow(0.9, participationCnt)) -
      1) /
      (Math.sqrt(19) - 1)) *
    1200;
  return rawRating - downDelta;
};

// レートが400以下の場合の補正
const getLowerCorrectedRating = (beginnerCorrectedRating: number) => {
  if (beginnerCorrectedRating > 400) {
    return beginnerCorrectedRating;
  }

  return 400 / Math.exp((400 - beginnerCorrectedRating) / 400);
};

export default calculateNewRating;
