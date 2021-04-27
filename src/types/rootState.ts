import ContestRecord from 'shared/types/contestRecord';
import UserProfile from 'shared/types/userProfile';
import AccountInfo from './accountInfo';
import AvailableContestInfo from './availableContestInfo';

export default interface RootState {
  profile: UserProfile;
  availableContests: AvailableContestInfo[];
  officialRatingRecords: ContestRecord[];
  isUpdatingRating: boolean;
  users: { [id: string]: UserProfile };
  account: AccountInfo;
}
