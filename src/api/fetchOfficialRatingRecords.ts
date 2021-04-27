import ContestRecord from 'shared/types/contestRecord';
import firebase from '../firebase';

export const fetchOfficialRatingRecordsAPI = async (handle: string) => {
  const url = `https://atcoder.jp/users/${handle}/history/json`;
  try {
    const response = await firebase.functions().httpsCallable('getExternal')({
      url,
    });

    const result = response.data.result;
    const records: ContestRecord[] = [];
    for (const record of result) {
      records.push({
        contestID: record.ContestScreenName.split('.')[0],
        startTime: 0,
        contestName: record.ContestName,
        rank: record.Place,
        newRating: record.NewRating,
        oldRating: record.OldRating,
        roundedPerformance: record.Performance,
      });
    }
    return records;
  } catch (e) {
    return e;
  }
};
