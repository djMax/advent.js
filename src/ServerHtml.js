import PT from 'prop-types';
import Helmet from 'react-helmet';
import React, { cloneElement } from 'react';
import { renderToString } from 'react-dom/server';

export const Html = (props) => {
  const {
    children,
    helmetProps,
    rootId,
    language,
    ...otherProps
  } = props;

  const childrenWithProps = cloneElement(children, otherProps);

  // ugh - this is to seed helmet
  renderToString(<Helmet {...helmetProps} />);

  const markup = renderToString(childrenWithProps);

  const {
    htmlAttributes,
    title,
    meta,
    link,
    script,
  } = Helmet.renderStatic();

  return (
    <html lang={language} {...(htmlAttributes.toComponent()) }>
      <head>
        {title.toComponent()}
        {meta.toComponent()}
        {link.toComponent()}
        <link href="http://fonts.googleapis.com/css?family=VT323" rel="stylesheet" type="text/css" />
        {process.env.NODE_ENV === 'production' ?
          <link rel="stylesheet" href="/bundle.css" /> :
          null}
      </head>
      <body>
        <div
          id={rootId}
          dangerouslySetInnerHTML={{ __html: markup }} // eslint-disable-line react/no-danger
        />
        {script.toComponent()}
        <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
        <script src="/vendor.bundle.js" />
        <script src="/client.bundle.js" />
      </body>
    </html>
  );
};

Html.propTypes = {
  children: PT.element.isRequired,
  helmetProps: PT.shape(Helmet.propTypes),
  rootId: PT.string,
  language: PT.string,
};

Html.defaultProps = {
  helmetProps: {},
  rootId: 'container',
  language: 'en-US',
};
