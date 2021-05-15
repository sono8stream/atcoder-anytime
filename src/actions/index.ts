import { Dispatch } from 'redux';
import ContestRecord from 'shared/types/contestRecord';
import UserProfile from 'shared/types/userProfile';
import actionCreatorFactory from 'typescript-fsa';
import { fetchAvailableContestInfoAPI } from '../api/availableContestInfo';
import { fetchOfficialRatingRecordsAPI } from '../api/fetchOfficialRatingRecords';
import { fetchUsersAPI } from '../api/fetchUsers';
import { fetchProfileAPI } from '../api/userProfile';
import firebase from '../firebase';
import AccountInfo from '../types/accountInfo';
import AvailableContestInfo from '../types/availableContestInfo';
import RootState from '../types/rootState';

const actionCreator = actionCreatorFactory();

export const updateProfileActions = actionCreator.async<
  { id: string },
  UserProfile,
  {}
>('CreateProfile');

export const updateProfile = (
  userID: string,
  profile: UserProfile,
  onStart?: () => void,
  onDone?: () => void,
  onFailed?: () => void
) => async (dispatch: Dispatch) => {
  dispatch(updateProfileActions.started({ id: userID }));
  if (onStart) {
    onStart();
  }
  try {
    const storeRef = firebase.firestore().collection('users').doc(userID);
    await storeRef.set(profile, { merge: true });
    dispatch(
      updateProfileActions.done({ params: { id: userID }, result: profile })
    );
    if (onDone) {
      onDone();
    }
  } catch (e) {
    console.log(e);
    dispatch(
      updateProfileActions.failed({ params: { id: userID }, error: {} })
    );
    if (onFailed) {
      onFailed();
    }
  }
};

export const updateContestRecordsActions = actionCreator.async<
  boolean,
  UserProfile,
  { value: Error }
>('UpdateContestRecord');

export const addContestRecordAction = actionCreator<{
  id: string;
  record: ContestRecord;
}>('AddContestRecord');

export const updateContestRecords = (
  onStart?: () => void,
  onDone?: () => void,
  onFailed?: () => void
) => async (dispatch: Dispatch, getState: () => RootState) => {
  dispatch(updateContestRecordsActions.started(false));
  if (onStart) {
    onStart();
  }
  const userID = getState().account.id;
  try {
    const response = await firebase.functions().httpsCallable('updateRating')({
      userID,
    });
    console.log(response);
    if (response.data) {
      dispatch(
        updateContestRecordsActions.done({
          params: true,
          result: response.data,
        })
      );
      if (onDone) {
        onDone();
      }
    } else {
      throw new Error('Invalid response data');
    }
  } catch (e) {
    dispatch(
      updateContestRecordsActions.failed({
        params: true,
        error: { value: e },
      })
    );
    if (onFailed) {
      onFailed();
    }
  }
};

export const loginActions = actionCreator.async<{}, {}, { error: Error }>(
  'Login'
);

export const login = (
  provider: firebase.auth.AuthProvider,
  onStart?: () => void,
  onDone?: () => void,
  onFailed?: () => void
) => async (dispatch: Dispatch) => {
  dispatch(loginActions.started({}));
  if (onStart) {
    onStart();
  }
  try {
    const userCredential = await firebase.auth().signInWithPopup(provider);
    if (!userCredential.user) {
      throw new Error();
    }
    dispatch(
      changeAccountInfo({
        email: userCredential.user.email as string,
        id: userCredential.user.uid,
      })
    );

    dispatch(loginActions.done({ params: {}, result: {} }));
    if (onDone) {
      onDone();
    }
  } catch (error) {
    dispatch(loginActions.failed({ params: {}, error: { error } }));
    if (onFailed) {
      onFailed();
    }
  }
};

export const logoutActions = actionCreator.async<{}, {}, { error: Error }>(
  'Logout'
);

export const logout = () => async (dispatch: Dispatch) => {
  dispatch(logoutActions.started({}));
  try {
    await firebase.auth().signOut();
    dispatch(logoutActions.done({ params: {}, result: {} }));
  } catch (error) {
    dispatch(loginActions.failed({ params: {}, error: { error } }));
  }
};

export const changeAccountInfo = actionCreator<AccountInfo>(
  'ChangeAccountInfo'
);

export const fetchProfileActions = actionCreator.async<
  {},
  UserProfile,
  { error: Error }
>('FetchProfile');

export const fetchProfile = (
  userID: string,
  onDone?: () => void,
  onFailed?: () => void
) => async (dispatch: Dispatch) => {
  dispatch(fetchProfileActions.started({}));
  try {
    const profile = await fetchProfileAPI(userID);
    if (profile) {
      dispatch(fetchProfileActions.done({ params: {}, result: profile }));
      if (onDone) {
        onDone();
      }
    } else {
      throw new Error('Cannot fetch');
    }
  } catch (error) {
    dispatch(fetchProfileActions.failed({ params: {}, error: { error } }));
    if (onFailed) {
      onFailed();
    }
  }
};

export const fetchAvailableContestInfoActions = actionCreator.async<
  {},
  AvailableContestInfo[],
  { error: Error }
>('FetchAvailableContestInfo');

export const fetchAvailableContestInfo = () => async (dispatch: Dispatch) => {
  dispatch(fetchAvailableContestInfoActions.started({}));
  try {
    const contestInfoList = await fetchAvailableContestInfoAPI();

    if (contestInfoList) {
      dispatch(
        fetchAvailableContestInfoActions.done({
          params: {},
          result: contestInfoList,
        })
      );
    } else {
      throw new Error('Cannot fetch');
    }
  } catch (error) {
    dispatch(
      fetchAvailableContestInfoActions.failed({ params: {}, error: { error } })
    );
  }
};

export const fetchOfficialRatingRecordsActions = actionCreator.async<
  {},
  ContestRecord[],
  { error: Error }
>('FetchOfficialRatingInfo');

export const fetchOfficialRatingRecords = (handle: string) => async (
  dispatch: Dispatch
) => {
  dispatch(fetchOfficialRatingRecordsActions.started({}));
  try {
    const officialRatingRecords = await fetchOfficialRatingRecordsAPI(handle);

    if (officialRatingRecords) {
      dispatch(
        fetchOfficialRatingRecordsActions.done({
          params: {},
          result: officialRatingRecords,
        })
      );
    } else {
      throw new Error('Cannot fetch');
    }
  } catch (error) {
    dispatch(
      fetchOfficialRatingRecordsActions.failed({ params: {}, error: { error } })
    );
  }
};

export const fetchUsersActions = actionCreator.async<
  {},
  { [id: string]: UserProfile },
  { error: Error }
>('FetchUsersAction');

export const fetchUsers = (
  onDone?: (users: { [id: string]: UserProfile }) => void,
  onFailed?: () => void
) => async (dispatch: Dispatch) => {
  dispatch(fetchUsersActions.started({}));
  try {
    const users = await fetchUsersAPI();

    if (users) {
      dispatch(
        fetchUsersActions.done({
          params: {},
          result: users,
        })
      );
      if (onDone) {
        onDone(users);
      }
    } else {
      throw new Error('Cannot fetch');
    }
  } catch (error) {
    dispatch(fetchUsersActions.failed({ params: {}, error: { error } }));
    if (onFailed) {
      onFailed();
    }
  }
};
