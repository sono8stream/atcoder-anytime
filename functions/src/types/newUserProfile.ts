import UserProfile from 'shared/types/UserProfile';

export default interface NewUserProfile extends UserProfile {
  officialNumeratorConvolution: number;
  officialDenominatorConvolution: number;
  officialParticipations: number;
}
