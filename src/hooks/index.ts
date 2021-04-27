import { useSelector } from 'react-redux';
import ContestRecord from 'shared/types/contestRecord';
import UserProfile from 'shared/types/userProfile';
import AccountInfo from '../types/accountInfo';
import AvailableContestInfo from '../types/availableContestInfo';
import RootState from '../types/rootState';

export const useAccountInfo = (): AccountInfo => {
  return useSelector((state: RootState) => state.account);
};

export const useProfile = (): UserProfile => {
  return useSelector((state: RootState) => state.profile);
};

export const useAvailableContests = (): AvailableContestInfo[] => {
  return useSelector((state: RootState) => state.availableContests);
};

export const useOfficialRatingRecords = (): ContestRecord[] => {
  return useSelector((state: RootState) => state.officialRatingRecords);
};

export const useIsUpdatingRating = (): boolean => {
  return useSelector((state: RootState) => state.isUpdatingRating);
};

export const useUsers = (): { [id: string]: UserProfile } => {
  return useSelector((state: RootState) => state.users);
};
