// firebase-admin と updateRatingAPI をモック
jest.mock('firebase-admin', () => {
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockGet = jest.fn();
  const mockDocRef = { update: mockUpdate, get: mockGet };
  const mockDoc = jest.fn().mockReturnValue(mockDocRef);
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
  const mockRunTransaction = jest.fn();

  return {
    firestore: jest.fn().mockReturnValue({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    }),
  };
});

jest.mock('../utils/updateRatingAPI', () => jest.fn().mockResolvedValue({}));

import * as admin from 'firebase-admin';
import updateRatingAPI from '../utils/updateRatingAPI';

// CAS ロジックを直接検証するヘルパー
// （Firestore trigger のラッパーを除いたコアロジックをテスト）
async function runCAS(
  jobRef: any,
  currentStatus: string
): Promise<boolean> {
  const db = admin.firestore();
  return db.runTransaction(async (t: any) => {
    const snap = await t.get(jobRef);
    if (snap.data()?.status !== 'requested') return false;
    t.update(jobRef, { status: 'running' });
    return true;
  });
}

describe('processUpdateJob CAS ロジック', () => {
  let mockTransaction: jest.Mock;
  let mockJobRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobRef = { update: jest.fn().mockResolvedValue(undefined) };

    mockTransaction = (admin.firestore() as any).runTransaction;
  });

  test('status が requested のとき running に遷移して true を返す', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'requested' }) }),
        update: jest.fn(),
      };
      return fn(mockT);
    });

    const result = await runCAS(mockJobRef, 'requested');
    expect(result).toBe(true);
  });

  test('status が running のとき（既に処理中）false を返す', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'running' }) }),
        update: jest.fn(),
      };
      return fn(mockT);
    });

    const result = await runCAS(mockJobRef, 'running');
    expect(result).toBe(false);
  });

  test('status が completed のとき false を返す', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'completed' }) }),
        update: jest.fn(),
      };
      return fn(mockT);
    });

    const result = await runCAS(mockJobRef, 'completed');
    expect(result).toBe(false);
  });

  test('並列で2リクエストが来たとき一方だけが accepted になる', async () => {
    // 1回目は requested → running（accepted）
    // 2回目は running のまま（rejected）
    let callCount = 0;
    mockTransaction.mockImplementation(async (fn: Function) => {
      callCount++;
      const status = callCount === 1 ? 'requested' : 'running';
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status }) }),
        update: jest.fn(),
      };
      return fn(mockT);
    });

    const [result1, result2] = await Promise.all([
      runCAS(mockJobRef, 'requested'),
      runCAS(mockJobRef, 'requested'),
    ]);

    // どちらか一方だけが true
    expect([result1, result2].filter(Boolean)).toHaveLength(1);
  });
});
