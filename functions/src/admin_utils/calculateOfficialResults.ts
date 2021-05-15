import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import calculateOfficialConvolutions from '../utils/calculateOfficialConvolutions';

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
      const {
        numeratorConvolution,
        denominatorConvolution,
        participations,
      } = await calculateOfficialConvolutions(handles[i]);

      const profileRef = admin.firestore().collection('users').doc(ids[i]);
      await profileRef.update({
        officialNumeratorConvolution: numeratorConvolution,
        officialDenominatorConvolution: denominatorConvolution,
        officialParticipations: participations,
      });
    }
  }
);
