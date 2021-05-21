import accessToAtCoder from './accessToAtCoder';

interface ResultResponse {
  Performance: number;
  IsRated: boolean;
  EndTime: string;
  NewRating: number;
}

const calculateOfficialConvolutions = async (handle: string, time: number) => {
  const resultsUrl = `https://atcoder.jp/users/${handle}/history/json`;
  const resultsResponse = await accessToAtCoder(resultsUrl);

  const results = resultsResponse.result as ResultResponse[];
  const [
    numeratorConvolution,
    denominatorConvolution,
    participations,
    rating,
  ] = calculateRatingConvolutions(results, time);

  return {
    numeratorConvolution,
    denominatorConvolution,
    participations,
    rating,
  };
};

const calculateRatingConvolutions = (
  results: ResultResponse[],
  checkTime: number
) => {
  let numerator = 0;
  let denominator = 0;
  let rate = 1;
  let officialCnt = 0;
  let rating = 0;

  for (const result of results.reverse()) {
    if (Date.parse(result.EndTime) / 1000 > checkTime || !result.IsRated) {
      continue;
    }

    numerator += Math.pow(2, result.Performance / 800) * rate;
    denominator += rate;
    rate *= 0.9;
    officialCnt++;
    if (rating === 0) {
      rating = result.NewRating;
    }
  }

  return [numerator, denominator, officialCnt, rating];
};

export default calculateOfficialConvolutions;
