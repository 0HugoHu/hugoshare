/* eslint-env node */
const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieSession = require('cookie-session');
const compression = require('compression');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const FirebaseTokenGenerator = require('firebase-token-generator');
const { Issuer, generators } = require('openid-client');

// Configuration
const isProduction = process.env.NODE_ENV === 'prod';
const callbackBaseUrl = isProduction
  ? `https://p2p.hugohu.site`
  : `https://localhost:${process.env.PORT}`;

const keyfileBaseUrl = isProduction
  ? '/home/ec2-user/certs'
  : path.join(__dirname, '');

// Configure AWS SDK
const s3 = new AWS.S3();

// SSL credentials
const privateKey = fs.readFileSync(`${keyfileBaseUrl}/privkey.pem`, 'utf8');
const certificate = fs.readFileSync(`${keyfileBaseUrl}/fullchain.pem`, 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Firebase and Cognito setup
const firebaseTokenGenerator = new FirebaseTokenGenerator(
  process.env.FIREBASE_SECRET,
);
let cognitoClient;

// Initialize Cognito Client
async function initializeCognitoClient() {
  try {
    const issuer = await Issuer.discover(
      'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_AmunJQmrs',
    );
    cognitoClient = new issuer.Client({
      client_id: '60cpanerdf09pthdkisjlimqf4',
      client_secret: process.env.COGNITO_SECRET,
      redirect_uris: [`${callbackBaseUrl}/callback`],
      response_types: ['code'],
    });
    console.log('Cognito client initialized.');
  } catch (error) {
    console.error('Error initializing Cognito client:', error);
  }
}

// Initialize Cognito client
initializeCognitoClient().catch(console.error);

// Express app setup
const app = express();
const secret = process.env.SECRET;

// Middlewares
app.enable('trust proxy');
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cookieSession({
    cookie: { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
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

// Auth middleware
// eslint-disable-next-line consistent-return
const checkAuth = (req, res, next) => {
  req.isAuthenticated = req.session.userInfo;
  next();
};

app.use('/api', checkAuth);

// Static assets setup
const base = ['dist'];
base.forEach((dir) => {
  const subdirs = ['assets'];
  subdirs.forEach((subdir) => {
    app.use(
      `/${subdir}`,
      express.static(path.join(dir, subdir), { maxAge: 31104000000 }),
    ); // ~1 year
  });
});

// Web routes
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

app.get('/my-files', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, base[0], 'index.html'), () => {
    res.locals.isAuthenticated = req.isAuthenticated;
    res.locals.userInfo = req.session.userInfo || {};
  });
});

// API routes
app.get('/api/session', (req, res) => {
  res.json({
    isAuthenticated: req.session.isAuthenticated,
    userInfo: req.session.userInfo || null,
  });
});

app.get('/auth', (req, res) => {
  const uid = uuidv4();
  const token = firebaseTokenGenerator.createToken(
    { uid, id: uid }, // will be available in Firebase security rules as 'auth'
    { expires: 32503680000 }, // 01.01.3000 00:00
  );
  res.json({ id: uid, token, public_ip: req.ip });
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
  const logoutUrl = `https://us-east-2amunjqmrs.auth.us-east-2.amazoncognito.com/logout?client_id=60cpanerdf09pthdkisjlimqf4&logout_uri=${callbackBaseUrl}/callback`;
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

// Callback route for Cognito login
app.get(getPathFromURL(`${callbackBaseUrl}/callback`), async (req, res) => {
  try {
    const params = cognitoClient.callbackParams(req);
    const tokenSet = await cognitoClient.callback(
      `${callbackBaseUrl}/callback`,
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

// eslint-disable-next-line consistent-return
app.post('/api/get-presigned-url', (req, res) => {
  const { key, fileType } = req.body;

  const params = {
    Bucket: 'hugo-share',
    Key: key,
    Expires: 60, // URL expiration time in seconds
    ContentType: fileType,
  };

  // Generate the pre-signed URL
  // eslint-disable-next-line consistent-return
  s3.getSignedUrl('putObject', params, (err, url) => {
    if (err) {
      return res
        .status(500)
        .json({ error: 'Failed to generate pre-signed URL' });
    }
    res.json({ presignedUrl: url });
  });
});

// eslint-disable-next-line consistent-return
app.get('/api/list-files', async (req, res) => {
  const { continuationToken } = req.query;

  const userId = req.session.userInfo?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  const params = {
    Bucket: 'hugo-share',
    Prefix: `user/${userId}/uploads/`,
    MaxKeys: 20, // Number of files per request
    ContinuationToken: continuationToken || undefined,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const files = await Promise.all(
      data.Contents.map(async (item) => {
        const fileKey = item.Key;
        const fileName = fileKey.split('/').pop().split('_').pop();

        // Generate the signed URL here directly
        const signedUrlParams = {
          Bucket: 'hugo-share',
          Key: fileKey,
          Expires: 60, // URL expiration time (1 minute)
        };

        // Generate the signed URL for download
        const downloadUrl = await new Promise((resolve, reject) => {
          s3.getSignedUrl('getObject', signedUrlParams, (err, url) => {
            if (err) {
              reject(err);
            }
            resolve(url);
          });
        });

        return {
          key: fileKey,
          fileName,
          downloadUrl,
          lastModified: item.LastModified,
          size: item.Size,
        };
      }),
    );

    res.json({
      files,
      isTruncated: data.IsTruncated,
      nextContinuationToken: data.NextContinuationToken,
    });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Error listing files.' });
  }
});

// Start HTTPS server
https.createServer(credentials, app).listen(process.env.PORT, () => {
  console.log(`Started HugoShare web server at ${callbackBaseUrl}...`);
});
