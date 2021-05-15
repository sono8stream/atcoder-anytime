export default interface ParticipationInfo {
  contestID: string;
  handle: string;
  startTimeSeconds: number;
  score: number;
  elapsedTime: number;
  isRated: boolean;
  isFinished: boolean;
}
