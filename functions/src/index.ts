import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
let credential = admin.credential.applicationDefault();
// ローカルデバッグ時などは認証情報を使う
if (config.projectId === 'atcoder-anytime-dev') {
  const account = require('../src/config/atcoder-anytime-dev-firebase-adminsdk.json');
  credential = admin.credential.cert(account);
}

admin.initializeApp({ credential });

export * from './getExternal';

export * from './updateRating';

export * from './updateUserProfile';

export * from './admin_utils/calculateOfficialResults';

export * from './admin_utils/recalculateProfiles';
