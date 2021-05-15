import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import accessToAtCoder from '../utils/accessToAtCoder';

interface ResultResponse {
  Performance: number;
  IsRated: boolean;
}

// How to debug
// curl --request POST --header "Content-Type: application/json" --data '{\"data\":{}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/calculateOfficialResults"
export const calculateOfficialResults = functions.https.onCall(
  async (data, context) => {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();
    const ids: string[] = [];
    const handles: string[] = [];
    snapshot.forEach((doc) => {
      ids.push(doc.id);
      handles.push(doc.data().handle);
    });

    for (let i = 0; i < handles.length; i++) {
      const resultsUrl = `https://atcoder.jp/users/${handles[i]}/history/json`;
      const resultsResponse = await accessToAtCoder(resultsUrl);

      const results = resultsResponse.result as ResultResponse[];
      const [
        numeratorConvolution,
        denominatorConvolution,
        participations,
      ] = calculateRatingConvolutions(results.slice(0, results.length - 1));

      const numerator =
        Math.pow(2, results[results.length - 1].Performance / 800) +
        0.9 * numeratorConvolution;
      const denominator = 1 + 0.9 * denominatorConvolution;

      console.log([
        numeratorConvolution,
        denominatorConvolution,
        800 * Math.log2(numerator / denominator),
      ]);

      const profileRef = admin.firestore().collection('users').doc(ids[i]);
      await profileRef.update({
        officialNumeratorConvolution: numerator,
        officialDenominatorConvolution: denominatorConvolution,
        officialParticipations: participations,
      });
    }
  }
);

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
