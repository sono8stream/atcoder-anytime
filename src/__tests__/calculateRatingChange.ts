import { calculateNewRating } from '../utils/calculateRatingChange';

export default test('Validate rating change', () => {
  return calculateNewRating(
    {
      contestID: 'abc101',
      handle: 'MiuraMiuMiu',
      startTimeSeconds: 0,
      score: 600,
      elapsedTime: 2075000000000,
    },
    {
      handle: 'MiuraMiuMiu',
      lastUpdateTime: 0,
      rating: 0,
      records: [
        {
          contestID: 'registration',
          contestName: 'Registration',
          oldRating: 0,
          newRating: 0,
          rank: 1,
          startTime: 0,
          roundedPerformance: 0,
        },
      ],
      registrationTime: 0,
    }
  ).then((contestant) => {
    expect(contestant.newRating).toBe(117);
  });
});
