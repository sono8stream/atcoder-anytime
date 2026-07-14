import {
  setIsUpdatingRating,
  updateContestRecordsActions,
} from '../actions';
import rootReducer from '../reducers';

const initialState = rootReducer(undefined, { type: '@@INIT' });

describe('isUpdatingRating reducer', () => {
  test('初期状態は false', () => {
    expect(initialState.isUpdatingRating).toBe(false);
  });

  test('setIsUpdatingRating(true) で true になる', () => {
    const state = rootReducer(initialState, setIsUpdatingRating(true));
    expect(state.isUpdatingRating).toBe(true);
  });

  test('setIsUpdatingRating(false) で false になる', () => {
    const started = rootReducer(initialState, setIsUpdatingRating(true));
    const state = rootReducer(started, setIsUpdatingRating(false));
    expect(state.isUpdatingRating).toBe(false);
  });

  test('job doc が requested → running → completed と遷移するとき正しく制御される', () => {
    // requested: true
    const onRequested = rootReducer(initialState, setIsUpdatingRating(true));
    expect(onRequested.isUpdatingRating).toBe(true);

    // running: true（変わらず）
    const onRunning = rootReducer(onRequested, setIsUpdatingRating(true));
    expect(onRunning.isUpdatingRating).toBe(true);

    // completed: false
    const onCompleted = rootReducer(onRunning, setIsUpdatingRating(false));
    expect(onCompleted.isUpdatingRating).toBe(false);
  });

  test('updateContestRecordsActions.started でも true になる（後方互換）', () => {
    const state = rootReducer(initialState, updateContestRecordsActions.started(false));
    expect(state.isUpdatingRating).toBe(true);
  });

  test('updateContestRecordsActions.failed でも false になる（後方互換）', () => {
    const started = rootReducer(initialState, updateContestRecordsActions.started(false));
    const state = rootReducer(started, updateContestRecordsActions.failed({ params: true, error: { value: new Error() } }));
    expect(state.isUpdatingRating).toBe(false);
  });
});
