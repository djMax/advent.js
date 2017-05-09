/* global window */
import { Action } from './actions';

export const LoginStatus = {
  LoggedOut: 0,
  InProgress: 1,
  Failed: 2,
  LoggedIn: 3,
};

const defaultState = {
  status: LoginStatus.LoggedOut,
};

export default function (authState = defaultState, action) {
  const { status } = authState;
  const { error, body } = action.payload || {};

  switch (action.type) {
    case Action.Auth.LoginCompleted:
      if (!error && status !== LoginStatus.LoggedIn) {
        return {
          status: LoginStatus.LoggedIn,
          as: body.identifier,
          groups: body.groups,
        };
      } else if (error) {
        if (status !== LoginStatus.Failed || authState.failure !== body.error) {
          return {
            status: LoginStatus.Failed,
            failure: body.error.message,
          };
        }
      }
      break;
    case Action.Auth.LoginPending:
      if (authState.status !== LoginStatus.InProgress) {
        return { status: LoginStatus.InProgress };
      }
      break;
    case Action.Auth.LoggedOut:
      if (authState.status !== LoginStatus.LoggedOut) {
        if (window) {
          window.location = '/';
        }
        // Otherwise we're server side, what to do?
        return { status: LoginStatus.LoggedOut };
      }
      break;
    default:
      break;
  }
  return authState;
}
