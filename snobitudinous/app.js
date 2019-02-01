const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const expressMessages = require('express-messages');
const session = require('express-session');
const passport = require('passport');
const config = require('./config/database');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
var methodOverride = require('method-override')

// Init app
const app = express();

// override with the X-HTTP-Method-Override header in the request
app.use(methodOverride('_method'));

mongoose.connect(config.database, { useNewUrlParser: true })
let db = mongoose.connection;

// Load post model
let Post = require('./models/post');
// Load user model
let User = require('./models/user');
// Load topic model
let Topic = require('./models/topic');

// Check connection
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Check for DB errors
db.on('error', (err) => {
  console.log(err);
});

// Load view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Body parser middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

//Set public folder
app.use(express.static(path.join(__dirname, 'public')));

// Express session middleware
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// Express messages middleware
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = expressMessages(req, res);
  next();
});

// Express validator middleware
app.use(expressValidator());

// Passport config
require('./config/passport')(passport);
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', (req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Home route
app.get('/', (req, res) => {
  if(req.isAuthenticated()){
    User.findById(req.user._id).
      populate('subscriptions').
      exec((err, user) => {
        if(err){
          console.log(err);
        } else {
          subscriptions = user.subscriptions;
          query = { topic: { $in: req.user.subscriptions } };
          Post.find(query).
            populate('topic').
            sort({ dateSubmitted: -1 }).
            limit(100).
            exec((err, posts) => {
              if(err){
                console.log(err);
              } else {
                //paginate({ list: posts, size:15 }, (pages) => {
                  res.render('home', {
                    title: 'Your Topics',
                    subscriptions: subscriptions,
                    //pages: pages
                    posts: posts
                  });
                //});
              }
          });
        }
    });
  } else {
    Post.find().
      populate('topic').
      sort({ dateSubmitted: -1 }).
      limit(100).
      exec((err, posts) => {
        if(err){
          console.log(err);
        } else {
          //paginate({ list: posts, size:15 }, (pages) => {
            res.render('home', {
              title: 'All Topics',
              subscriptions: [],
              //pages: pages
              posts: posts
            });
          //});
        }
    });
  }
});

// View all topics
app.get('/all', ensureAuthenticated, (req, res) => {
  Post.find().
    populate('topic').
    sort({ dateSubmitted: -1 }).
    limit(100).
    exec((err, posts) => {
      if(err){
        console.log(err);
      } else {
        //paginate({ list:posts, size:15 }, (pages) => {
          res.render('home', {
            title: 'All Topics',
            //pages: pages
            posts: posts
          });
        //});
      }
  });
});

// Route files
let posts = require('./routes/posts');
let users = require('./routes/users');
let topics = require('./routes/topics');
app.use('/posts', posts);
app.use('/users', users);
app.use('/topics', topics);

// Access Control
function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('danger', 'Please login');
    res.redirect('/users/login');
  }
}

db.once('open', () => {
  Topic.find().
    sort({ name: 1 }).
    exec((err, topics) => {
      if(err){
        console.log(err);
        return;
      }
      app.locals.allTopics = topics;
  });
});

// function paginate(params, cb){
//   let size = params.size;
//   let list = params.list;
//   let pages = [];
//   for(var i = 0; i < list.length; i += size){
//     pages.push(list.slice(i, Math.min(i+size, list.length)));
//   }
//   cb(pages)
// }

module.exports = app;
