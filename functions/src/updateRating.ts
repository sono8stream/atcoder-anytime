import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import updateRatingAPI from './utils/updateRatingAPI';

const TIMEOUT_SECONDS = 540;
const DEADLINE_BUFFER_SECONDS = 30; // タイムアウト30秒前に打ち切り

export const updateRating = functions.runWith({ timeoutSeconds: TIMEOUT_SECONDS }).https.onCall(async (data, context) => {
  const userID = data.userID;
  if (!userID) return;

  const jobRef = admin.firestore()
    .collection('users').doc(userID)
    .collection('meta').doc('updateJob');

  // CAS: 実行中・リクエスト済みの場合は排他制御
  const accepted = await admin.firestore().runTransaction(async (t) => {
    const snap = await t.get(jobRef);
    const status = snap.data()?.status;
    if (status === 'running' || status === 'requested') return false;
    t.set(jobRef, {
      status: 'running',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!accepted) {
    throw new functions.https.HttpsError('already-exists', 'すでに更新処理が実行中です');
  }

  const deadlineMs = Date.now() + (TIMEOUT_SECONDS - DEADLINE_BUFFER_SECONDS) * 1000;

  try {
    const result = await updateRatingAPI(userID, deadlineMs);

    if (result.timedOut) {
      // 打ち切り: job doc を 'requested' に戻してクライアントに再トリガーさせる
      await jobRef.update({
        status: 'requested',
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

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
    throw e;
  }
});
