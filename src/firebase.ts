import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';
import firebaseConfig from './firebase-config';

const isProd = process.env.REACT_APP_ENV === 'production';

if (!firebase.apps.length) {
  firebase.initializeApp(isProd ? firebaseConfig.production : firebaseConfig.develop);
}

export default firebase;
