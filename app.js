import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import createHttpError from 'http-errors';

import apiRouter from './routes/api/api.js';
import models from './models.js';
import usersRouter from './routes/users.js';

import authProvider from './auth/AuthProvider.js';
import { REDIRECT_URI, POST_LOGOUT_REDIRECT_URI } from './authConfig.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const oneDay = 1000 * 60 * 60 * 24;

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set this to true on production
        maxAge: oneDay,
    }
}));

app.use((req, res, next) => {
    req.models = models
    next();
});

// auth endpoints for Azure
app.get('/signin', authProvider.login({
    scopes: [],
    redirectUri: REDIRECT_URI,
    successRedirect: '/'
  }));

app.get('/signout', authProvider.logout({
    postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI
}));

app.get('/error', (req, res) => {
    res.status(500).send("There was a server error.");
});

app.get('/unauthorized', (req, res) => {
    res.status(401).send("Permission denied.");
});

app.get('/acquireToken', authProvider.acquireToken({
    scopes: ['User.Read'],
    redirectUri: REDIRECT_URI,
    successRedirect: '/users/profile'
}));

app.post('/redirect', authProvider.handleRedirect());


app.use('/api', apiRouter);
app.use('/users', usersRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createHttpError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(
      `<html>
          <body>
              <h1 style='color: red'>Error!</h1>
              <h2>Message</h2>
              <p>${err.message}</p>
              <h4>Full Details</h4>
              <p>${JSON.stringify(err, null, 2)}</p>
          </body>
      </html>
      `
  );
});

export default app;
