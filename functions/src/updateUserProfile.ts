import * as functions from 'firebase-functions';
import updateUserProfileAPI from './utils/updateUserProfileAPI';

// How to debug
// To change profile, need auth id token
// curl --request POST -H "Content-Type: application/json" -H "Authorization: Bearer <ID token>" --data '{\"data\":{\"handle\":\"MiuraMiuMiu\",\"extendRating\":true}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/updateUserProfile"
export const updateUserProfile = functions.https.onCall(
  async (data, context) => {
    const { handle, extendRating } = data;
    if (!context.auth || !handle) {
      console.log('User ID or handle is not specified');
      return;
    }
    const userID = context.auth.uid;

    const newProfile = updateUserProfileAPI(userID, handle, extendRating);

    return newProfile;
  }
);
