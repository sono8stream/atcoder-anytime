import UserProfile from 'shared/types/userProfile';

export default interface NewUserProfile extends UserProfile {
  officialNumeratorConvolution: number;
  officialDenominatorConvolution: number;
  officialParticipations: number;
}
