import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import UserProfile from './types/userProfile';
import { calculateNewRating } from './utils/calculateNewRating';
import getParticipateVirtuals from './utils/getParticipateVirtuals';

export const updateContestRecords = functions.https.onCall(
  async (data, context) => {
    const userID = data.userID;
    console.log(data.userID);

    const profileRef = admin.firestore().collection('users').doc(userID);
    const profileSnapShot = await profileRef.get();
    if (!profileSnapShot.exists) {
      return;
    }

    const profile = profileSnapShot.data() as UserProfile;

    const { handle, lastUpdateTime } = profile;
    let oldRating = profile.rating;
    const participationInfoList = await getParticipateVirtuals(profile);
    const nowTime = Math.floor(new Date().getTime() / 1000);
    let updateTime = lastUpdateTime;
    for (const participationInfo of participationInfoList) {
      try {
        const contestResult = await calculateNewRating(
          participationInfo,
          profile
        ).catch((e) => null);
        console.log(contestResult);
        if (!contestResult) {
          continue;
        }

        const newRecord = {
          contestID: participationInfo.contestID,
          startTime: participationInfo.startTimeSeconds,
          contestName: contestResult.contestName,
          rank: contestResult.rank,
          newRating: contestResult.newRating,
          oldRating,
          roundedPerformance: contestResult.roundedPerformance,
        };

        updateTime = Math.max(updateTime, participationInfo.startTimeSeconds);

        /*
      await profileRef.set(
        {
          lastUpdateTime: updateTime,
          rating: contestResult.newRating,
          records: [newRecord, ...profile.records],
        },
        { merge: true }
      );
      */
        console.log(contestResult.newRating);
        oldRating = contestResult.newRating;
      } catch (e) {
        console.log(e);
        continue;
      }
    }
  }
);
