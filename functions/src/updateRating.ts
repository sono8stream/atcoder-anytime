import axios from 'axios';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import ParticipationInfo from 'shared/types/participationInfo';
import Submission from 'shared/types/submission';
import UserProfile from 'shared/types/userProfile';
import accessToAtCoder from './utils/accessToAtCoder';
import calculateNewRating from './utils/calculateNewRating';
import getParticipateVirtuals from './utils/getParticipateVirtuals';

export const updateRating = functions.https.onCall(async (data, context) => {
  const userID = data.userID;
  if (!userID) {
    return;
  }

  const profileRef = admin.firestore().collection('users').doc(userID);
  const profileSnapShot = await profileRef.get();
  if (!profileSnapShot.exists) {
    return;
  }
  const profile = profileSnapShot.data() as UserProfile;

  const allSubmissions = await getSubmissions(profile.handle);
  const submissions = filterSubmissions(allSubmissions, profile);

  for (const submission of submissions) {
    const participation = await checkParticipation(
      profile.handle,
      submission
    ).catch((e) => e);
    if (participation === null) {
      await profileRef.update({
        lastUpdateTime: submission.epoch_second,
      });
      continue;
    }
    if (!participation.elapsedTime || participation.elapsedTime === -1) {
      break;
    }

    // レート計算
    const contestResult = await calculateNewRating(
      participation,
      profile
    ).catch((e) => e);
    console.log(contestResult);
    if (!contestResult.contestName) {
      break;
    }

    const newRecord = {
      contestID: participation.contestID,
      startTime: participation.startTimeSeconds,
      contestName: contestResult.contestName,
      rank: contestResult.rank,
      newRating: contestResult.newRating,
      oldRating: profile.rating,
      roundedPerformance: contestResult.roundedPerformance,
    };

    profile.records.unshift(newRecord);
    await profileRef.update({
      lastUpdateTime: submission.epoch_second,
      rating: contestResult.newRating,
      records: profile.records,
    });

    profile.rating = contestResult.newRating;
  }

  return profile;
});

const getSubmissions = async (handle: string): Promise<Submission[]> => {
  const url = `https://kenkoooo.com/atcoder/atcoder-api/results?user=${handle}`;
  const response = await axios
    .get(url, {
      headers: {
        'accept-encoding': 'gzip',
      },
    })
    .catch((e) => e.response);

  if (response.data) {
    return response.data as Submission[];
  }

  return [] as Submission[];
};

const filterSubmissions = (
  allSubmissions: Submission[],
  profile: UserProfile
): Submission[] => {
  const valids = allSubmissions.filter(
    (s) => s.epoch_second > profile.lastUpdateTime
  );
  valids.sort((a, b) => b.epoch_second - a.epoch_second);

  const checkedContests = new Set<string>();
  for (const record of profile.records) {
    checkedContests.add(record.contestID);
  }

  const filtered: Submission[] = [];
  for (const submission of valids) {
    // virtualの結果は1つしか存在しない
    // すでにチェックしたコンテストはスキップ
    if (checkedContests.has(submission.contest_id)) {
      continue;
    }

    filtered.push(submission);
    checkedContests.add(submission.contest_id);
  }

  return filtered.reverse();
};

const checkParticipation = async (
  handle: string,
  submission: Submission
): Promise<ParticipationInfo | null> => {
  const contestID = submission.contest_id;
  const problemID = submission.problem_id;
  const submissionTime = submission.epoch_second;

  const standingUrl = `https://atcoder.jp/contests/${contestID}/standings/virtual/json`;
  const standingResponse = await accessToAtCoder(standingUrl);

  const divisor = 1000000000;
  const data = standingResponse.result;

  for (const user of data.StandingsData) {
    if (
      user.UserScreenName === handle &&
      user.IsRated &&
      user.Additional['standings.virtualElapsed'] === -1
    ) {
      const startTimeSeconds =
        submissionTime - user.TaskResults[problemID].Elapsed / divisor;
      return {
        contestID,
        handle,
        startTimeSeconds,
        score: user.TotalResult.Score as number,
        elapsedTime:
          user.Additional['standings.virtualElapsed'] === -1
            ? user.TotalResult.Elapsed / divisor
            : -1, // 未終了
      };
    }
  }

  // 不参加
  return null;
};
