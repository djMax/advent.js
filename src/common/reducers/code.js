/* global window */
import { Action } from './actions';

const defaultState = { rooms: {} };

export default function (codeState = defaultState, action) {
  const { status } = codeState;
  const { error, body } = action.payload || {};

  switch (action.type) {
    case Action.Code.CodePending:
      return {
        ...codeState,
        loading: true,
      };
    case Action.Code.CodeCompleted:
      console.error(action);
      return {
        ...codeState,
        loading: false,
      };
    default:
      break;
  }
  return codeState;
}
