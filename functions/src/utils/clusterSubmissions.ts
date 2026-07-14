import Submission from 'shared/types/submission';
import UserProfile from 'shared/types/userProfile';

export const clusterSubmissions = (
  allSubmissions: Submission[],
  profile: UserProfile
): { [key: string]: Submission[] } => {
  const valids = allSubmissions.filter(
    (s) => s.epoch_second > profile.lastUpdateTime
  );
  valids.sort((a, b) => a.epoch_second - b.epoch_second);

  const participatedContests = new Set<string>();
  for (const record of profile.records) {
    participatedContests.add(record.contestID);
  }

  const filtered: { [key: string]: Submission[] } = {};
  for (const submission of valids) {
    if (participatedContests.has(submission.contest_id)) {
      continue;
    }
    if (!(submission.contest_id in filtered)) {
      filtered[submission.contest_id] = [];
    }
    filtered[submission.contest_id].push(submission);
  }

  return filtered;
};
