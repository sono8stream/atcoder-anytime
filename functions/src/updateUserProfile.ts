import axios from 'axios';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import NewUserProfile from './types/newUserProfile';
import calculateOfficialConvolutions from './utils/calculateOfficialConvolutions';

// How to debug
// To change profile, need auth id token
// curl --request POST -H "Content-Type: application/json" -H "Authorization: Bearer <ID token>" --data '{\"data\":{\"handle\":\"MiuraMiuMiu\",\"extendRating\":true}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/updateUserProfile"
export const updateUserProfile = functions.https.onCall(
  async (data, context) => {
    console.log(context.auth?.uid);
    const { handle, extendRating } = data;
    if (!context.auth || !handle) {
      console.log('User ID or handle is not specified');
      return;
    }
    const userID = context.auth.uid;

    const profileRef = admin.firestore().collection('users').doc(userID);

    let rating = 0;
    const url = `https://atcoder.jp/users/${handle}/history/json`;
    const response = await axios.get(url);
    if (response.status !== 200) {
      return;
    }

    if (extendRating && response.data.length > 0) {
      rating = response.data[response.data.length - 1].NewRating;
    }

    let officialParticipations = 0;
    let officialNumeratorConvolution = 0;
    let officialDenominatorConvolution = 0;
    if (extendRating) {
      const convolutions = await calculateOfficialConvolutions(handle);
      officialParticipations = convolutions.participations;
      officialNumeratorConvolution = convolutions.numeratorConvolution;
      officialDenominatorConvolution = convolutions.denominatorConvolution;
    }

    const time = Math.floor(new Date().getTime() / 1000);
    const profile: NewUserProfile = {
      handle,
      lastUpdateTime: time,
      rating,
      records: [
        {
          contestID: 'registration',
          contestName: 'Registration',
          oldRating: 0,
          newRating: rating,
          rank: 1,
          startTime: time,
          roundedPerformance: rating,
          isRated: false,
        },
      ],
      registrationTime: time,
      officialParticipations,
      officialNumeratorConvolution,
      officialDenominatorConvolution,
    };

    await profileRef.set(profile);
  }
);
