import Contestant from '../types/contestant';
import ContestRecord from '../types/contestRecord';
import ParticipationInfo from '../types/participationInfo';
import UserProfile from '../types/userProfile';
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
  profile: UserProfile
): Promise<Contestant> => {
  const [rank, upperIdx] = await calculateRank(participationInfo);
  const [roundedPerformance, contestName] = await calculateRoundedPerformance(
    participationInfo,
    upperIdx
  );
  console.log(rank, roundedPerformance);
  const newRating = await calculateRating(profile, roundedPerformance);
  return {
    handle: profile.handle,
    contestName,
    rank,
    newRating,
    roundedPerformance,
  };
};

const calculateRank = async (participationInfo: ParticipationInfo) => {
  const { contestID, score, elapsedTime } = participationInfo;
  const url = `https://atcoder.jp/contests/${contestID}/standings/json`;
  const response = await accessToAtCoder(url);

  const result = response.result as ContestStandings;
  const standingData = result.StandingsData;
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

const calculateRoundedPerformance = async (
  participationInfo: ParticipationInfo,
  upperIdx: number
) => {
  const { contestID } = participationInfo;
  const url = `https://atcoder.jp/contests/${contestID}/results/json`;
  const response = await accessToAtCoder(url);

  const result = response.result;
  const contestName = result[0].ContestName;
  let upperPerformance = 0;
  for (let i = upperIdx; i >= 0; i--) {
    if (result[i].IsRated) {
      upperPerformance = result[i].Performance;
      break;
    }
  }

  let lowerPerformance = 0;
  for (let i = upperIdx + 1; i < result.length; i++) {
    if (result[i].IsRated) {
      lowerPerformance = result[i].Performance;
      break;
    }
  }

  if (upperPerformance === 0 && lowerPerformance === 0) {
    throw Error('No rated participants');
  }
  if (upperPerformance === 0) {
    return [lowerPerformance, contestName];
  }
  if (lowerPerformance === 0) {
    return [upperPerformance, contestName];
  }
  return [Math.round((lowerPerformance + lowerPerformance) / 2), contestName];
};

const calculateRating = (profile: UserProfile, roundedPerformance: number) => {
  const { records } = profile;
  const rawRating = getRawRating(records, roundedPerformance);
  console.log(rawRating);
  /*
  const beginnerCorrectedRating = getBeginnerCorrectedRating(
    records,
    rawRating
  );
  */
  const lowerCorrectedRating = getLowerCorrectedRating(rawRating);
  const finalRating = Math.round(lowerCorrectedRating);
  console.log(finalRating);
  return finalRating;
};

const getRawRating = (records: ContestRecord[], roundedPerformance: number) => {
  let numer = Math.pow(2, roundedPerformance / 800) * 0.9;
  let denom = 0.9;
  let ratio = 0.9 * 0.9;
  for (const contest of records.reverse()) {
    if (
      contest.contestID === 'registration' &&
      contest.roundedPerformance === 0
    ) {
      break;
    }
    console.log(contest);
    numer += Math.pow(2, contest.roundedPerformance / 800) * ratio;
    denom += ratio;
    ratio *= 0.9;
  }
  const g = numer / denom;
  return 800 * Math.log2(g);
};

// 参加回数が少ない場合の補正
const getBeginnerCorrectedRating = (
  records: ContestRecord[],
  rawRating: number
) => {
  const participations = records.length;
  const downDelta =
    ((Math.sqrt(1 - Math.pow(0.81, participations)) /
      (1 - Math.pow(0.9, participations)) -
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
