import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// job doc に書き込んで即返却。実処理は processUpdateJob (Firestore trigger) が担う
export const updateRating = functions.https.onCall(async (data, context) => {
  const userID = data.userID;
  if (!userID) return;

  await admin.firestore()
    .collection('users').doc(userID)
    .collection('meta').doc('updateJob')
    .set({
      status: 'requested',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
});
