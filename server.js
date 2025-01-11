/* eslint-env node */

// Room server
const http = require('http');
const path = require('path');
const express = require('express');
const session = require('express-session');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const FirebaseTokenGenerator = require('firebase-token-generator');
const { Issuer, generators } = require('openid-client');

const firebaseTokenGenerator = new FirebaseTokenGenerator(
  process.env.FIREBASE_SECRET,
);

const app = express();
const secret = process.env.SECRET;
const base = ['dist'];

let cognitoClient;

async function initializeCognitoClient() {
  try {
    const issuer = await Issuer.discover(
      'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_AmunJQmrs',
    );
    cognitoClient = new issuer.Client({
      client_id: '60cpanerdf09pthdkisjlimqf4',
      client_secret: process.env.COGNITO_SECRET,
      redirect_uris: ['http://localhost:8080/callback'],
      response_types: ['code'],
    });
    console.log('Cognito client initialized.');
  } catch (error) {
    console.error('Error initializing Cognito client:', error);
  }
}

// Initialize Cognito client before starting the server
initializeCognitoClient().catch(console.error);

app.enable('trust proxy');

app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cookieSession({
    cookie: {
      // secure: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    secret,
    proxy: true,
  }),
);
app.use(compression());
app.use(
  session({
    secret,
    resave: false,
    saveUninitialized: false,
  }),
);

const checkAuth = (req, res, next) => {
  req.isAuthenticated = req.session.userInfo;
  next();
};

//
// Web server
//
base.forEach((dir) => {
  const subdirs = ['assets'];

  subdirs.forEach((subdir) => {
    app.use(
      `/${subdir}`,
      express.static(`${dir}/${subdir}`, {
        maxAge: 31104000000, // ~1 year
      }),
    );
  });
});

//
// API server
//
app.get('/', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, base[0], 'index.html'), () => {
    res.locals.isAuthenticated = req.isAuthenticated;
    res.locals.userInfo = req.session.userInfo || {};
  });
});

app.get('/rooms/:id', (req, res) => {
  const root = path.join(__dirname, base[0]);
  res.sendFile(`${root}/index.html`);
});

app.get('/room', (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.ip;
  const name = crypto.createHmac('md5', secret).update(ip).digest('hex');

  res.json({ name });
});

app.get('/api/session', (req, res) => {
  res.json({
    isAuthenticated: req.session.isAuthenticated,
    userInfo: req.session.userInfo || null,
  });
});

app.get('/auth', (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.ip;
  const uid = uuidv4();
  const token = firebaseTokenGenerator.createToken(
    { uid, id: uid }, // will be available in Firebase security rules as 'auth'
    { expires: 32503680000 }, // 01.01.3000 00:00
  );

  res.json({ id: uid, token, public_ip: ip });
});

app.get('/login', async (req, res) => {
  const state = generators.state();
  const nonce = generators.nonce();

  req.session.state = state;
  req.session.nonce = nonce;

  const authUrl = cognitoClient.authorizationUrl({
    scope: 'openid profile email',
    state,
    nonce,
  });

  res.redirect(authUrl);
});

app.get('/logout', (req, res) => {
  req.session.userInfo = undefined;
  req.session.isAuthenticated = false;
  const logoutUrl = `https://us-east-2amunjqmrs.auth.us-east-2.amazoncognito.com/logout?client_id=60cpanerdf09pthdkisjlimqf4&logout_uri=http://localhost:8080/callback`;
  res.redirect(logoutUrl);
});

// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

app.get(getPathFromURL('http://localhost:8080/callback'), async (req, res) => {
  try {
    const params = cognitoClient.callbackParams(req);
    const tokenSet = await cognitoClient.callback(
      'http://localhost:8080/callback',
      params,
      {
        nonce: req.session.nonce,
        state: req.session.state,
      },
    );

    req.session.userInfo = await cognitoClient.userinfo(tokenSet.access_token);
    req.session.isAuthenticated = true;

    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/');
  }
});

http
  .createServer(app)
  .listen(process.env.PORT)
  .on('listening', () => {
    console.log(
      `Started HugoShare web server at http://localhost:${process.env.PORT}...`,
    );
  });
