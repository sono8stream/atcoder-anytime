import axios from 'axios';
import * as admin from 'firebase-admin';

import login from './login';

// アクセスできなかったらerrorを返す
const accessToAtCoder = async (url: string) => {
  const doc = admin.firestore().collection('loginCookie').doc('cookie');
  const snapshot = await doc.get();
  const cookie = snapshot.data() as { string: string };
  const canAccess = true;
  let response = await axios.get(url, {
    headers: {
      Cookie: cookie.string,
    },
    maxRedirects: 0,
  });

  if (!canAccess || response.status === 302) {
    const loginCookieStr = await login();
    response = await axios.get(url, {
      headers: {
        Cookie: loginCookieStr,
      },
    });
  }
  const json = response.data;
  return { result: json };
};

export default accessToAtCoder;
