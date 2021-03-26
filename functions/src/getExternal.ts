import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import UserData from './config';

const supportedOrigins = ['https://atcoder.jp', 'https://kenkoooo.com'];

export const getExternal = functions.https.onCall(async (data, context) => {
  const url = data.url;
  console.log(url);
  if (!url || !checkSupported(url)) {
    return { result: 'Invalid URL' };
  }

  const response = await fetch(url);
  const json = await response.json();
  return { result: json };
});

const checkSupported = (url: string) => {
  for (const origin of supportedOrigins) {
    console.log(origin);
    if (url.startsWith(origin)) {
      return true;
    }
    console.log('not satisfied');
  }
  return false;
};
