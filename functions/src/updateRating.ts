import * as functions from 'firebase-functions';

import updateRatingAPI from './utils/updateRatingAPI';

//  提出から参加したコンテストを検出し，レート変動させる
// How to debug
//  curl --request POST --header "Content-Type: application/json" --data '{\"data\":{\"userID\":\"L657lEpiZKhCJOu6tINUQdmVNsj2\"}}' "http://localhost:5000/atcoder-anytime-dev/us-central1/updateRating"
export const updateRating = functions.https.onCall(async (data, context) => {
  const userID = data.userID;
  if (!userID) {
    return;
  }

  const newProfile = updateRatingAPI(userID);

  return newProfile;
});
