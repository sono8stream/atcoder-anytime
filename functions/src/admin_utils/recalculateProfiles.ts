import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import NewUserProfile from '../types/newUserProfile';
import accessToAtCoder from '../utils/accessToAtCoder';
import updateRatingAPI from '../utils/updateRatingAPI';
import updateUserProfileAPI from '../utils/updateUserProfileAPI';

// How to debug
// curl --request POST --header "Content-Type: application/json" --data '{\"data\":{}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/calculateOfficialResults"
export const reinitializeProfiles = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    const migrationLogRef = admin
      .firestore()
      .collection('migrationStates')
      .doc('profile');
    const migratedSnapshot = await migrationLogRef.get();
    let migratedIds: { [key: string]: boolean } = {};
    if (migratedSnapshot.exists && migratedSnapshot.data() !== undefined) {
      migratedIds = migratedSnapshot.data()?.ids;
    }

    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();
    const ids: string[] = [];
    const profiles: NewUserProfile[] = [];
    snapshot.forEach((doc) => {
      ids.push(doc.id);
      profiles.push(doc.data() as NewUserProfile);
    });

    for (let i = 0; i < ids.length; i++) {
      if (migratedIds[ids[i]]) {
        continue;
      }

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
      if (extendRating) {
        const contestRecords = await accessToAtCoder(
          `https://atcoder.jp/users/${profiles[i].handle}/history/json`
        );
        let firstRating = 0;
        for (const record of contestRecords.result) {
          if (Date.parse(record.EndTime) / 1000 > registration) {
            break;
          }
          firstRating = record.NewRating;
        }
        console.log(firstRating);
        newProfile.records[0].newRating = firstRating;
        newProfile.records[0].roundedPerformance = firstRating;
        newProfile.rating = firstRating;
      }

      await usersRef.doc(ids[i]).update(newProfile);

      migratedIds[ids[i]] = true;
      await migrationLogRef.set({ ids: migratedIds });
    }
  });

export const updateRatingsRegularly = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('0 * * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const migrationLogRef = admin
      .firestore()
      .collection('migrationStates')
      .doc('rating');
    const migratedSnapshot = await migrationLogRef.get();
    let migratedIds: { [key: string]: boolean } = {};
    if (migratedSnapshot.exists && migratedSnapshot.data() !== undefined) {
      migratedIds = migratedSnapshot.data()?.ids;
    }

    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();
    const ids: string[] = [];
    snapshot.forEach((doc) => {
      ids.push(doc.id);
    });
    if (ids.length === Object.keys(migratedIds).length) {
      await migrationLogRef.set({});
    }

    for (const id of ids) {
      if (migratedIds[id]) {
        continue;
      }

      await updateRatingAPI(id);
      migratedIds[id] = true;
      await migrationLogRef.set({ ids: migratedIds });
    }
  });
