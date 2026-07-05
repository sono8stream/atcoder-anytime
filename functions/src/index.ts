import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

export * from './getExternal';

export * from './updateRating';

export * from './updateUserProfile';

export * from './admin_utils/calculateOfficialResults';

export * from './admin_utils/recalculateProfiles';
