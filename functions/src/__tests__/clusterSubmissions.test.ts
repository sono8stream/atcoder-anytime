import { clusterSubmissions } from '../utils/clusterSubmissions';
import Submission from 'shared/types/submission';
import UserProfile from 'shared/types/userProfile';

const baseProfile: UserProfile = {
  handle: 'testuser',
  lastUpdateTime: 1000,
  rating: 0,
  records: [{ contestID: 'registration', contestName: 'Registration', oldRating: 0, newRating: 0, rank: 1, startTime: 0, roundedPerformance: 0, isRated: false }],
  registrationTime: 0,
};

const makeSubmission = (contest_id: string, epoch_second: number, result = 'AC'): Submission => ({
  epoch_second,
  problem_id: `${contest_id}_a`,
  contest_id,
  user_id: 'testuser',
  result,
});

describe('clusterSubmissions', () => {
  test('lastUpdateTime 以前の提出は除外される', () => {
    const submissions = [
      makeSubmission('abc001', 500),  // lastUpdateTime(1000) 以前
      makeSubmission('abc002', 1500), // 以後
    ];
    const result = clusterSubmissions(submissions, baseProfile);
    expect(Object.keys(result)).toEqual(['abc002']);
  });

  test('コンテストが最初の提出の時系列順に並ぶ', () => {
    // abc003 の最初の提出が abc002 より古い → abc003 が先に処理されるべき
    const submissions = [
      makeSubmission('abc002', 3000),
      makeSubmission('abc003', 2000), // abc003 の方が早い
      makeSubmission('abc002', 4000), // abc002 の2回目の提出
    ];
    const result = clusterSubmissions(submissions, baseProfile);
    expect(Object.keys(result)).toEqual(['abc003', 'abc002']);
  });

  test('すでに参加済みのコンテストはスキップされる', () => {
    const profileWithRecord: UserProfile = {
      ...baseProfile,
      records: [
        ...baseProfile.records,
        { contestID: 'abc001', contestName: 'ABC001', oldRating: 0, newRating: 100, rank: 10, startTime: 500, roundedPerformance: 100, isRated: true },
      ],
    };
    const submissions = [
      makeSubmission('abc001', 1500), // 参加済み
      makeSubmission('abc002', 2000),
    ];
    const result = clusterSubmissions(submissions, profileWithRecord);
    expect(Object.keys(result)).not.toContain('abc001');
    expect(Object.keys(result)).toContain('abc002');
  });

  test('同じコンテストの複数提出はまとめられる', () => {
    const submissions = [
      makeSubmission('abc001', 1500),
      makeSubmission('abc001', 1600),
      makeSubmission('abc001', 1700),
    ];
    const result = clusterSubmissions(submissions, baseProfile);
    expect(result['abc001']).toHaveLength(3);
  });

  test('提出がない場合は空を返す', () => {
    const result = clusterSubmissions([], baseProfile);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test('各コンテストの提出が epoch_second 昇順で格納される', () => {
    const submissions = [
      makeSubmission('abc001', 1700),
      makeSubmission('abc001', 1500),
      makeSubmission('abc001', 1600),
    ];
    const result = clusterSubmissions(submissions, baseProfile);
    const times = result['abc001'].map((s) => s.epoch_second);
    expect(times).toEqual([1500, 1600, 1700]);
  });
});
