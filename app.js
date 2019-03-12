const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const connectHistoryApiFallback = require('connect-history-api-fallback');
const session = require('express-session');
const MemoryStore = require('session-memory-store')(session);
const ConnectCas = require('connect-cas2');
const ejs = require('ejs');

const indexRouter = require('./routes/index');
const app = express();

// CAS验证
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  name: 'secretname', // 不能动，而且注销登录必须清sessionStorage，否则门户切换用户项目不会随之切换
  secret: 'Hello I am a long long long secret',
  store: new MemoryStore()  // or other session store
}));

const casClient = new ConnectCas({
  debug: true,
  ignore: [
    /\/ignore/
  ],
  match: [],
  servicePrefix: 'http://127.0.0.1:3000',
  serverPath: 'http://ms.do-ok.com:8443',
  paths: {
    validate: '/index',
    serviceValidate: '/cas/serviceValidate',
    proxy: '/cas/proxy',
    login: '/cas/login',
    logout: '/cas/logout',
    proxyCallback: ''
  },
  redirect: false,
  gateway: false,
  renew: false,
  slo: true,
  cache: {
    enable: false,
    ttl: 5 * 60 * 1000,
    filter: []
  },
  fromAjax: {
    header: 'x-client-ajax',
    status: 418
  }
});
app.use(casClient.core());
app.get('/logout', function (req, res, next) {
  casClient.logout()(req, res, next);
});

app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.__express);
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', connectHistoryApiFallback());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/', indexRouter);

app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) { // 这里必须带next参数，否则跳不到error.html而直接报错
  res.locals.message = err.stack;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', {error: err});
});

module.exports = app;
