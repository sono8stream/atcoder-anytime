import * as admin from 'firebase-admin';

// ローカルデバッグ時などは認証情報を使う
let credential: admin.credential.Credential;
try {
  const account = require('../src/config/atcoder-anytime-dev-firebase-adminsdk.json');
  credential = admin.credential.cert(account);
} catch (e) {
  credential = admin.credential.applicationDefault();
}

admin.initializeApp({ credential });

export * from './getExternal';

export * from './updateRating';
