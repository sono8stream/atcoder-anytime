import firebase from '../firebase';

export const fetchRealRating = async (handle: string): Promise<number> => {
  const url = `https://atcoder.jp/users/${handle}/history/json`;
  try {
    const response = await firebase.functions().httpsCallable('getExternal')({
      url,
    });
    const json = response.data.result; // await response.json();
    if (json.length === 0) {
      return -1;
    }
    return json[json.length - 1].NewRating;
  } catch (e) {
    return -1;
  }
};
