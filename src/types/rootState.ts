import AccountInfo from './accountInfo';
import AvailableContestInfo from './availableContestInfo';
import ContestRecord from './contestRecord';
import UserProfile from './userProfile';

export default interface RootState {
  profile: UserProfile;
  availableContests: AvailableContestInfo[];
  officialRatingRecords: ContestRecord[];
  isUpdatingRating: boolean;
  users: { [id: string]: UserProfile };
  account: AccountInfo;
}
