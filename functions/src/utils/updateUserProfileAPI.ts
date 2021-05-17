import axios from 'axios';
import * as admin from 'firebase-admin';
import NewUserProfile from '../types/newUserProfile';
import calculateOfficialConvolutions from './calculateOfficialConvolutions';

const updateUserProfileAPI = async (
  userID: string,
  handle: string,
  extendRating: boolean
) => {
  const profileRef = admin.firestore().collection('users').doc(userID);

  let rating = 0;
  const url = `https://atcoder.jp/users/${handle}/history/json`;
  const response = await axios.get(url);
  if (response.status !== 200) {
    return null;
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

  return profile;
};

export default updateUserProfileAPI;
