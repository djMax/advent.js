import { combineReducers } from 'redux';
import auth from './auth';

export { Action } from './actions';

export default combineReducers({
  auth,
});
