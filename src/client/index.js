/* global window */
import { entryPoint } from '@gasbuddy/react';
import { Router } from '../common/router';
import appReducer from '../common/reducers';

// Global styles
import './css/advent.css';

entryPoint({
  reducers: appReducer,
  router: Router,
  routerPath: '../common/router',
  initialState: window.PreloadedState,
});
