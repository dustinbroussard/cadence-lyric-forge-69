import { describe, it, expect } from 'vitest';
import { cadenceReducer, initialCadenceState } from '../src/lib/state/cadenceReducer';

describe('cadenceReducer', () => {
  it('sets user input', () => {
    const state = cadenceReducer(initialCadenceState, { type: 'SET_USER_INPUT', payload: 'hi' });
    expect(state.userInput).toBe('hi');
  });

  it('sets stage data', () => {
    const state = cadenceReducer(initialCadenceState, { type: 'SET_STAGE_DATA', stage: 'foo', payload: 'bar' });
    expect(state.stageData.foo).toBe('bar');
  });

  it('resets all', () => {
    const state = cadenceReducer({ ...initialCadenceState, userInput: 'hi' }, { type: 'RESET_ALL' });
    expect(state).toEqual(initialCadenceState);
  });
});
