import { combineReducers } from 'redux';
import auth from './auth';
import code from './code';

export { Action } from './actions';

export default combineReducers({
  auth,
  code,
});
