import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as fs from 'fs';
import * as path from 'path';

const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
let credential = admin.credential.applicationDefault();
// ローカルデバッグ時のみサービスアカウントJSONを使う（ファイルが存在する場合）
if (config.projectId === 'atcoder-anytime-dev') {
  const keyPath = path.join(__dirname, '../src/config/atcoder-anytime-dev-firebase-adminsdk.json');
  if (fs.existsSync(keyPath)) {
    const account = require(keyPath);
    credential = admin.credential.cert(account);
  }
}

admin.initializeApp({ credential });

export * from './getExternal';

export * from './updateRating';

export * from './updateJob';

export * from './updateUserProfile';

export * from './admin_utils/calculateOfficialResults';

export * from './admin_utils/recalculateProfiles';
