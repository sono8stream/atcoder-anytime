import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';
import firebaseConfig from './firebase-config';

const isProd = process.env.REACT_APP_ENV === 'production';

if (!firebase.apps.length) {
  firebase.initializeApp(isProd ? firebaseConfig.production : firebaseConfig.develop);
}

if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  firebase.functions().useFunctionsEmulator('http://127.0.0.1:5001');
}

export default firebase;
