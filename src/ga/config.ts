const isProd = process.env.REACT_APP_ENV === 'production';
const trackID = isProd
  ? (process.env.REACT_APP_GA_TRACKING_ID_PRODUCTION ?? '')
  : (process.env.REACT_APP_GA_TRACKING_ID_DEVELOP ?? '');

export default trackID;
