import accessToAtCoder from './accessToAtCoder';

interface ResultResponse {
  Performance: number;
  IsRated: boolean;
}

const calculateOfficialConvolutions = async (handle: string) => {
  const resultsUrl = `https://atcoder.jp/users/${handle}/history/json`;
  const resultsResponse = await accessToAtCoder(resultsUrl);

  const results = resultsResponse.result as ResultResponse[];
  const [
    numeratorConvolution,
    denominatorConvolution,
    participations,
  ] = calculateRatingConvolutions(results);

  return { numeratorConvolution, denominatorConvolution, participations };
};

const calculateRatingConvolutions = (results: ResultResponse[]) => {
  let numerator = 0;
  let denominator = 0;
  let rate = 1;
  let officialCnt = 0;

  for (const result of results.reverse()) {
    if (!result.IsRated) {
      continue;
    }

    numerator += Math.pow(2, result.Performance / 800) * rate;
    denominator += rate;
    rate *= 0.9;
    officialCnt++;
  }

  return [numerator, denominator, officialCnt];
};

export default calculateOfficialConvolutions;
