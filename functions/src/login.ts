import axios from 'axios';
import * as admin from 'firebase-admin';

import UserData from './config';

const login = async () => {
  const res = await axios.get('https://atcoder.jp/login', {
    headers: {
      Cookie: '', // 安定動作のためには必ずCookie初期化
    },
  });
  const cookies = res.headers['set-cookie'].map(
    (cookie: string) =>
      (/^\s*(?:Set-Cookie:\s*)?(.*)$/i.exec(cookie) as string[])[1]
        .trim()
        .split(';')[0]
  );
  const cookieStr = cookies.join('; ');
  const csrfToken = getToken(res.data);

  const params = new URLSearchParams();
  params.append('csrf_token', csrfToken);
  params.append('username', UserData.username);
  params.append('password', UserData.password);

  // Configパラメータは必須
  const res2 = await axios
    .post('https://atcoder.jp/login', params, {
      headers: {
        Cookie: cookieStr,
        Accept: 'text/html',
      },
      maxRedirects: 0,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 302,
    })
    .catch((e) => {
      throw e;
    });

  const cookies2 = res2.headers['set-cookie'].map(
    (cookie: string) =>
      (/^\s*(?:Set-Cookie:\s*)?(.*)$/i.exec(cookie) as string[])[1]
        .trim()
        .split(';')[0]
  );
  const loginCookieStr = cookies2.join('; ');

  const doc = admin.firestore().collection('loginCookie').doc('cookie');
  await doc.update({
    string: loginCookieStr,
  });

  return loginCookieStr;
};

const getToken = (data: string) => {
  const queKey = 'csrf_token" value="';
  const idx = data.indexOf(queKey);
  const lastIdx = data.indexOf('"', idx + queKey.length);
  const tokenLen = lastIdx - (idx + queKey.length);
  const csrfToken = data.substr(idx + queKey.length, tokenLen);
  return csrfToken;
};

export default login;
