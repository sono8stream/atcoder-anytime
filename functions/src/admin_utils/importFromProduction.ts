/**
 * productionのFirestoreデータをdevにコピーするスクリプト
 *
 * 事前準備:
 *   1. productionのサービスアカウントキーをダウンロード
 *      Firebase Console > プロジェクト設定 > サービスアカウント > 新しい秘密鍵を生成
 *      → functions/src/config/atcoder-anytime-production-firebase-adminsdk.json として保存
 *   2. devのサービスアカウントキーも同様に用意
 *      → functions/src/config/atcoder-anytime-dev-firebase-adminsdk.json として保存
 *
 * 実行方法:
 *   cd functions
 *   npm run build
 *   node lib/src/admin_utils/importFromProduction.js
 */

import * as admin from 'firebase-admin';

const productionAccount = require('../../src/config/atcoder-anytime-production-firebase-adminsdk.json');
const devAccount = require('../../src/config/atcoder-anytime-dev-firebase-adminsdk.json');

const productionApp = admin.initializeApp(
  { credential: admin.credential.cert(productionAccount) },
  'production'
);

const devApp = admin.initializeApp(
  { credential: admin.credential.cert(devAccount) },
  'dev'
);

const productionDb = productionApp.firestore();
const devDb = devApp.firestore();

const COLLECTIONS = ['users'];

const importCollection = async (collectionName: string) => {
  console.log(`Importing ${collectionName}...`);
  const snapshot = await productionDb.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`  ${collectionName}: empty`);
    return;
  }

  const batch = devDb.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.set(devDb.collection(collectionName).doc(doc.id), doc.data());
    count++;

    // Firestoreのバッチ上限は500件
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  ${collectionName}: ${count} docs committed`);
    }
  }

  await batch.commit();
  console.log(`  ${collectionName}: ${count} docs imported`);
};

const main = async () => {
  for (const collection of COLLECTIONS) {
    await importCollection(collection);
  }
  console.log('Done.');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
