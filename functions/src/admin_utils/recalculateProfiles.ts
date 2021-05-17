import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import NewUserProfile from '../types/newUserProfile';
import updateRatingAPI from '../utils/updateRatingAPI';
import updateUserProfileAPI from '../utils/updateUserProfileAPI';

// How to debug
// curl --request POST --header "Content-Type: application/json" --data '{\"data\":{}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/calculateOfficialResults"
export const recalculateProfiles = functions.https.onCall(
  async (data, context) => {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();
    const ids: string[] = [];
    const profiles: NewUserProfile[] = [];
    snapshot.forEach((doc) => {
      ids.push(doc.id);
      profiles.push(doc.data() as NewUserProfile);
    });

    for (let i = 0; i < ids.length; i++) {
      const registration = profiles[i].registrationTime;
      const extendRating =
        profiles[i].records[profiles[i].records.length - 1].newRating > 0;
      const newProfile = await updateUserProfileAPI(
        ids[i],
        profiles[i].handle,
        extendRating
      );
      if (newProfile === null) {
        continue;
      }
      newProfile.lastUpdateTime = registration;
      newProfile.registrationTime = registration;
      newProfile.records[0].startTime = registration;
      await usersRef.doc(ids[i]).update(newProfile);

      await updateRatingAPI(ids[i]);
    }
  }
);
