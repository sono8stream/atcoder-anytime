import axios from 'axios';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import login from './utils/login';

export const getExternal = functions.https.onCall(async (data, context) => {
  const url = data.url;
  console.log(url);

  if (url.startsWith('https://atcoder.jp')) {
    const doc = admin.firestore().collection('loginCookie').doc('cookie');
    const snapshot = await doc.get();
    const cookie = snapshot.data() as { string: string };
    let response = await axios.get(url, {
      headers: {
        Cookie: cookie.string,
      },
      maxRedirects: 0,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 302,
    });
    if (response.status === 302) {
      const loginCookieStr = await login();
      response = await axios.get(url, {
        headers: {
          Cookie: loginCookieStr,
        },
      });
    }
    const json = response.data;
    return { result: json };
  }
  if (url.startsWith('https://kenkoooo.com')) {
    const response = await axios.get(url);
    const json = response.data;
    return { result: json };
  }

  return { result: 'Invalid URL' };
});
