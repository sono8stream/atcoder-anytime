import axios from 'axios';
import UserData from './config';

const login2 = async () => {
  const res = await axios.get('https://atcoder.jp/login');
  const cookies = res.headers['set-cookie'].map(
    (cookie) =>
      /^\s*(?:Set-Cookie:\s*)?(.*)$/i.exec(cookie)[1].trim().split(';')[0]
  );
  const cookieStr = cookies.join('; ');
  console.log(cookieStr);

  const res2 = await axios.get('https://atcoder.jp/login', {
    headers: {
      Cookie: cookieStr,
      Accept: 'text/html',
    },
  });
  const csrfToken = getToken(res2.data);
  console.log(getToken(res.data), getToken(res2.data));

  const username = UserData.username;
  const password = UserData.password;
  const params = new URLSearchParams();
  params.append('csrf_token', csrfToken);
  params.append('username', username);
  params.append('password', password);

  // Configパラメータは必須
  const res3 = await axios
    .post('https://atcoder.jp/login', params, {
      headers: {
        Cookie: cookieStr,
        Accept: 'text/html',
      },
      maxRedirects: 0,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 302,
    })
    .catch((e) => e);
  const cookies2 = res3.headers['set-cookie'].map(
    (cookie) =>
      /^\s*(?:Set-Cookie:\s*)?(.*)$/i.exec(cookie)[1].trim().split(';')[0]
  );
  const loginCookieStr = cookies2.join('; ');
  console.log(loginCookieStr);

  const res4 = await axios.get(
    'https://atcoder.jp/contests/arc056/standings/virtual/json',
    {
      headers: {
        Cookie: loginCookieStr,
      },
    }
  );
  console.log(res4);
};

const getToken = (data: string) => {
  const queKey = 'csrf_token" value="';
  const idx = data.indexOf(queKey);
  console.log(idx);
  const lastIdx = data.indexOf('"', idx + queKey.length);
  const tokenLen = lastIdx - (idx + queKey.length);
  const csrfToken = data.substr(idx + queKey.length, tokenLen);
  return csrfToken;
};

login2();
