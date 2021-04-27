export default interface ContestRecord {
  contestID: string;
  contestName: string;
  oldRating: number;
  newRating: number;
  rank: number;
  startTime: number;
  roundedPerformance: number;
}
