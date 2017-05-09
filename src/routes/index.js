import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { createStore, Provider } from '@gasbuddy/react';
import { Html } from '../ServerHtml';
import { Router } from '../common/router';
import reducers, { Action } from '../common/reducers';

const DOCTYPE = '<!DOCTYPE html>\n';

export default function (router) {
  router.get('*', async (req, res) => {
    const store = createStore({
      reducers,
      apiMiddleware: () => next => (action) => {
        if (action.meta && action.meta.apiAction) {
          throw new Error('Server side API renders not yet supported.');
        }
        return next(action);
      },
    });

    if (req.user) {
      await store.dispatch({
        type: Action.Auth.LoginCompleted,
        payload: {
          body: {
            identifier: req.session.auth.identifier,
          },
        },
      });
    }
    const preloadedState = store.getState();

    const context = {}; // this is a shared object!

    const markup = ReactDOMServer.renderToStaticMarkup(
      <Html
        helmetProps={{
          title: 'Advent.js Code Editor',
          meta: [{
            name: 'viewport',
            content: 'width=device-width, initial-scale=1',
          }],
          link: [
            { rel: 'stylesheet', href: '//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.2/semantic.min.css' },
          ],
          script: [
            { innerHTML: `window.PreloadedState = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')};` },
          ],
        }}
      >
        <StaticRouter location={req.url} context={context}>
          <Provider store={store}>
            <Router />
          </Provider>
        </StaticRouter>
      </Html>,
    );

    if (context.url) {
      res.redirect(context.url);
    } else {
      res.send(DOCTYPE + markup);
    }
  });
}
