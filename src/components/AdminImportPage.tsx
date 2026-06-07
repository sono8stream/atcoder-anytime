import firebase from 'firebase/app';
import React, { useState } from 'react';
import { Button, Header, Message, Progress, Segment } from 'semantic-ui-react';

const COLLECTIONS = ['users'];

const getProductionDb = () => {
  const config = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG_PRODUCTION ?? '{}');
  const appName = 'production-import';
  const existing = firebase.apps.find((a) => a.name === appName);
  const app = existing ?? firebase.initializeApp(config, appName);
  return app.firestore();
};

const AdminImportPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const appendLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    setLog([]);
    setProgress(0);

    try {
      const productionDb = getProductionDb();
      const devDb = firebase.firestore();

      for (let ci = 0; ci < COLLECTIONS.length; ci++) {
        const collectionName = COLLECTIONS[ci];
        appendLog(`[${collectionName}] 読み込み中...`);

        const snapshot = await productionDb.collection(collectionName).get();
        appendLog(`[${collectionName}] ${snapshot.size} 件取得`);

        const docs = snapshot.docs;
        let count = 0;

        // 500件ずつバッチ書き込み
        while (count < docs.length) {
          const batch = devDb.batch();
          const chunk = docs.slice(count, count + 500);
          chunk.forEach((doc) => {
            batch.set(devDb.collection(collectionName).doc(doc.id), doc.data());
          });
          await batch.commit();
          count += chunk.length;
          appendLog(`[${collectionName}] ${count}/${docs.length} 件書き込み完了`);
          setProgress(Math.round(((ci + count / docs.length) / COLLECTIONS.length) * 100));
        }
      }

      appendLog('完了！');
      setStatus('done');
      setProgress(100);
    } catch (e: any) {
      appendLog(`エラー: ${e.message}`);
      setStatus('error');
    }
  };

  return (
    <Segment>
      <Header as="h2">Production → Dev データインポート</Header>
      <Message warning>
        <Message.Header>注意</Message.Header>
        <p>dev の既存データは上書きされます。このページは develop 環境専用です。</p>
      </Message>

      <Button
        primary={true}
        loading={status === 'running'}
        disabled={status === 'running'}
        onClick={runImport}
        content="インポート開始"
      />

      {status !== 'idle' && (
        <div style={{ marginTop: '1em' }}>
          <Progress percent={progress} indicating={status === 'running'} success={status === 'done'} error={status === 'error'} />
          <Segment style={{ maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85em' }}>
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </Segment>
        </div>
      )}
    </Segment>
  );
};

export default AdminImportPage;
