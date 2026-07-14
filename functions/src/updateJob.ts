import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import updateRatingAPI from './utils/updateRatingAPI';

export const processUpdateJob = functions.firestore
  .document('users/{uid}/meta/updateJob')
  .onWrite(async (change, context) => {
    const after = change.after.data();
    if (!after || after.status !== 'requested') return;

    const uid = context.params.uid;
    const jobRef = change.after.ref;

    // CASトランザクション: requested → running（他のトリガーが先に処理していたら何もしない）
    const accepted = await admin.firestore().runTransaction(async (t) => {
      const snap = await t.get(jobRef);
      if (snap.data()?.status !== 'requested') return false;
      t.update(jobRef, {
        status: 'running',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (!accepted) return;

    try {
      await updateRatingAPI(uid);
      await jobRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      await jobRef.update({
        status: 'failed',
        error: String(e),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
