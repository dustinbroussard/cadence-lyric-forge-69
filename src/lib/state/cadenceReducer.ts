import { Reducer } from 'react';

export interface CadenceState {
  userInput: string;
  currentStage: number;
  stageData: Record<string, string>;
}

export type CadenceAction =
  | { type: 'SET_USER_INPUT'; payload: string }
  | { type: 'SET_STAGE_DATA'; stage: string; payload: string }
  | { type: 'RESET_ALL' };

export const initialCadenceState: CadenceState = {
  userInput: '',
  currentStage: 0,
  stageData: {}
};

export const cadenceReducer: Reducer<CadenceState, CadenceAction> = (state, action) => {
  switch (action.type) {
    case 'SET_USER_INPUT':
      return { ...state, userInput: action.payload };
    case 'SET_STAGE_DATA':
      return { ...state, stageData: { ...state.stageData, [action.stage]: action.payload } };
    case 'RESET_ALL':
      return { ...initialCadenceState };
    default:
      return state;
  }
};
