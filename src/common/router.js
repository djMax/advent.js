import { RouterThunk } from '@gasbuddy/react';

import {
  Main,
  Unknown,
} from './components';

const routes = {
  routes: [
    { path: '/', component: Main, exact: true },
    { path: '/rooms/:name', component: Main, exact: true },
  ],
  final: {
    routes: [
      { component: Unknown, path: '//' },
    ],
  },
};

export const Router = RouterThunk(routes);
