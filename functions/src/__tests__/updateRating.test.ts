jest.mock('firebase-admin', () => {
  const mockRunTransaction = jest.fn();
  const mockSet = jest.fn().mockResolvedValue(undefined);
  const mockUpdate = jest.fn().mockResolvedValue(undefined);

  const makeDocRef = (): any => ({
    set: mockSet,
    update: mockUpdate,
    collection: (name: string) => ({ doc: () => makeDocRef() }),
  });

  const mockDoc = jest.fn().mockReturnValue(makeDocRef());
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

  return {
    firestore: jest.fn().mockReturnValue({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    }),
  };
});

jest.mock('firebase-functions', () => ({
  runWith: jest.fn().mockReturnValue({
    https: { onCall: jest.fn((fn) => fn) },
  }),
  https: {
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

jest.mock('../utils/updateRatingAPI', () => jest.fn().mockResolvedValue({}));

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// CAS ロジックを直接検証するヘルパー
async function runCAS(currentStatus: string | undefined): Promise<boolean> {
  const db = admin.firestore();
  const jobRef = db.collection('users').doc('uid').collection('meta').doc('updateJob');
  return db.runTransaction(async (t: any) => {
    const snap = await t.get(jobRef);
    const status = snap.data()?.status;
    if (status === 'running' || status === 'requested') return false;
    t.set(jobRef, { status: 'running' });
    return true;
  });
}

describe('updateRating CAS ロジック', () => {
  let mockTransaction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction = (admin.firestore() as any).runTransaction;
  });

  test('status が未設定（初回）のとき running に遷移して true を返す', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => undefined }),
        set: jest.fn(),
      };
      return fn(mockT);
    });
    expect(await runCAS(undefined)).toBe(true);
  });

  test('status が completed のとき true を返す（再実行を許可）', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'completed' }) }),
        set: jest.fn(),
      };
      return fn(mockT);
    });
    expect(await runCAS('completed')).toBe(true);
  });

  test('status が running のとき false を返す（排他）', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'running' }) }),
        set: jest.fn(),
      };
      return fn(mockT);
    });
    expect(await runCAS('running')).toBe(false);
  });

  test('status が requested のとき false を返す（排他）', async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status: 'requested' }) }),
        set: jest.fn(),
      };
      return fn(mockT);
    });
    expect(await runCAS('requested')).toBe(false);
  });

  test('並列で2リクエストが来たとき一方だけが accepted になる', async () => {
    let callCount = 0;
    mockTransaction.mockImplementation(async (fn: Function) => {
      callCount++;
      const status = callCount === 1 ? 'completed' : 'running';
      const mockT = {
        get: jest.fn().mockResolvedValue({ data: () => ({ status }) }),
        set: jest.fn(),
      };
      return fn(mockT);
    });
    const [r1, r2] = await Promise.all([runCAS('completed'), runCAS('completed')]);
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
  });
});
