const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport')

// User Model
const User = require('../models/user');
// Post model
const Post = require('../models/post');
// Topic model
const Topic = require('../models/topic');

// Register form
router.get('/register', (req, res) => {
  res.render('register');
});

//Register process
router.post('/register', (req, res) => {
  let firstname = req.body.firstname;
  let surname = req.body.surname;
  let email = req.body.email;
  let username = req.body.username;
  let password = req.body.password;
  let password2 = req.body.password2;

  req.checkBody('firstname', 'Firstame is required').notEmpty();
  req.checkBody('firstname', 'Firstame must contain only letters').isAlpha();
  req.checkBody('surname', 'Surname is required').notEmpty();
  req.checkBody('surname', 'Surname must contain only letters').isAlpha();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password', 'Password must be between 6 and 20 characters').isLength({ min: 6, max: 20 });
  req.checkBody('password2', 'Passwords do not match').equals(password);

  let errors = req.validationErrors();

  if(errors){
    res.render('register', {
      errors: errors
    });
  } else {
    usernameAvailable(username, (available) => {
      if(available){
        let newUser = new User({
          firstname: firstname,
          surname: surname,
          email: email,
          username: username,
          password: password,
          dateJoined: Date.now()
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if(err){
              console.log(err);
            } else {
              newUser.password = hash;
              newUser.save((err) => {
                if(err){
                  console.log(err);
                  return;
                } else {
                  req.flash('success', 'You are now registered and can log in');
                  res.redirect('/users/login');
                }
              });
            }
          });
        });
      } else {
        req.flash('danger', 'Username taken');
        res.redirect('/users/register');
      }
    });
  }
});

// Login form
router.get('/login', (req, res) => {
  res.render('login');
});

// Login process
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect:  '/',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/users/login');
});

// Format lists of topics, i.e. (X, Y) => "Y and X", (X, Y, Z) => "X, Y and Z", etc...
function punctuate(params, cb){
  let topicList;
  let len = params.topics.length;
  if(len > 0){
    let topicNames = params.topics.map(topic => topic.name);
    if(len === 1){
      topicList = topicNames[0];
    } else {
      topicList = topicNames.slice(0, len-1).join(', ') + ' and ' + topicNames[len-1];
    }
    topicList = topicList.toLowerCase();
    if(params.startCaps){
      topicList = topicList.charAt(0).toUpperCase() + topicList.slice(1);
    }
  } else {
    topicList = false;
  }
  cb(topicList);
}

// Account details
router.get('/account', ensureAuthenticated, (req, res) => {
  User.findById(req.user._id, (err, user) => {
    if(err){
      console.log(err);
    } else {
      res.render('account');
    }
  });
});

// Update account info
router.post('/account', (req, res) => {
  let username = req.body.username;
  let firstname = req.body.firstname;
  let surname = req.body.surname;
  let email = req.body.email;
  let c1 = username.length > 0;
  let c2 = firstname.length > 0;
  let c3 = surname.length > 0;
  let c4 = email.length > 0;
  let updates = { $set: {} };

  if(c1){
    updates.$set.username = username
  }
  if(c2){
    updates.$set.firstname = firstname
    req.checkBody('firstname', 'Firstame must contain only letters').isAlpha();
  }
  if(c3){
    updates.$set.surname = surname
    req.checkBody('surname', 'Surname must contain only letters').isAlpha();
  }
  if(c4){
    updates.$set.email = email
    req.checkBody('email', 'Email is not valid').isEmail();
  }
  if(c1 || c2 || c3 || c4){

    let errors = req.validationErrors();

    if(errors){
      res.render('account', {
        errors: errors
      });
    } else {
      usernameAvailable(username, (available) => {
        if(!(c1) || available){
          User.updateOne({ _id:req.user._id }, updates, (err) => {
            if(err){
              console.log(err);
            } else {
              req.flash('success', 'Account updated');
              res.redirect('/users/account');
            }
          });
        } else {
          req.flash('danger', 'Username taken');
          res.redirect('/users/account');
        }
      });
    }
  }
});

// Load change password
router.get('/account/password', ensureAuthenticated, (req, res) => {
  res.render('password');
});

// Change account password
router.post('/account/password', (req, res) => {
  let currentPassword = req.body.currentPassword;
  let newPassword = req.body.newPassword;
  let newPassword2 = req.body.newPassword2;

  req.checkBody('currentPassword', 'Please enter your current password').notEmpty();
  req.checkBody('newPassword', 'Please enter your new password').notEmpty();
  req.checkBody('newPassword2', 'Please confirm your new password').notEmpty();
  req.checkBody('newPassword', 'Password must be between 6 and 20 characters').isLength({ min: 6, max: 20 });
  req.checkBody('newPassword2', 'Passwords do not match').equals(newPassword);

  let errors = req.validationErrors();

  if(errors){
    res.render('password', {
      errors: errors
    });
  } else {
    bcrypt.compare(currentPassword, req.user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch){
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newPassword, salt, (err, hash) => {
            if(err){
              console.log(err);
            } else {
              query = { _id: req.user._id };
              setPassword = { $set: { password: hash } };
              User.updateOne(query, setPassword, (err) => {
                if(err){
                  console.log(err);
                  return;
                } else {
                  req.flash('success', 'Password updated');
                  res.redirect('/users/account');
                }
              });
            }
          });
        });
      } else {
        req.flash('danger', 'Password incorrect');
        res.redirect('/users/account/password');
      }
    });
  }
});

router.get('/account/subscriptions', ensureAuthenticated, (req, res) => {
  User.findById(req.user._id).
    populate({ path: 'subscriptions', options: { sort: { name: 1 } } }).
    exec((err, user) => {
      if(err){
        console.log(err);
      } else {
        let notSubscribed = req.app.locals.allTopics.slice(0);
        for(var i = 0; i < user.subscriptions.length; i++){
          notSubscribed.splice(notSubscribed.indexOf(user.subscriptions[i]), 1);
        }
        res.render('subscriptions', {
          subscriptions: user.subscriptions,
          notSubscribed: notSubscribed
        });
      }
  });
});

router.post('/account/subscriptions', (req, res) => {
  let topic_id = req.body.topic;
  Topic.findById(topic_id, (err, topic) => {
    if(err){
      console.log(err);
    } else {
      if(!req.user.subscriptions.map(sub => sub.toString()).includes(topic_id)){
        let query = { _id: req.user._id };
        let subscribe = { $push: { subscriptions: topic } };
        User.updateOne(query, subscribe, (err) => {
          if(err){
            console.log(err);
          } else {
            req.flash('success', 'Subscribed to '+topic.name.toLowerCase());
            res.redirect('/users/account/subscriptions');
          }
        });
      } else {
        req.flash('warning', 'Already subscribed to '+topic.name.toLowerCase());
        res.redirect('/users/account/subscriptions');
      }
    }
  });
});

router.post('/account/subscriptions/:id', (req, res) => {
  let query = { _id: req.user._id };
  Topic.findById(req.params.id, (err, topic) => {
    if(err){
      console.log(err);
    } else {
      let unsub = { $pull: { subscriptions: req.params.id } };

      User.updateOne(query, unsub, (err) => {
        if(err){
          console.log(err);
        } else {
          req.flash('success', 'Unsubscribed from '+topic.name.toLowerCase());
          res.redirect('/users/account/subscriptions');
        }
      });
    }
  });
});

router.get('/account/contributions', ensureAuthenticated, (req, res) => {
  res.render('contributions');
});

router.post('/account/contributions', (req, res) => {
  let code = req.body.code;
  if(code){
    code = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
    Topic.findOne({ name: code }, (err, topic) => {
      if(err){
        console.log(err);
      } else {
        if(topic){
          User.updateOne({ _id: req.user._id }, { $push: { contributesTo: topic._id } }, (err) => {
            if(err){
              console.log(err);
            } else {
              req.flash('success', 'You are now a contributor to ' + topic.name + '!');
              res.redirect('/users/account');
            }
          });
        } else {
          req.flash('danger', 'Invalid code');
          res.redirect('/users/account/contributions');
        }
      }
    });
  } else {
    req.flash('danger', 'You must enter a code');
    res.redirect('/users/account/contributions');
  }
});

// View user's posts
router.get('/:id', (req, res) => {
  User.findById(req.params.id).
    populate('subscriptions').
    populate('contributesTo').
    exec((err, user) => {
      if(err){
        console.log(err);
      } else {
        Post.find({ author: user._id }).
          sort({ dateSubmitted: -1 }).
          exec((err, posts) => {
            if(err){
              console.log(err);
            } else {
              let subscriptionsParams = {
                topics: user.subscriptions,
                startCaps: true
              };
              let contributionsParams = {
                topics: user.contributesTo,
                startCaps: false
              }
              punctuate(subscriptionsParams, (subscriptions) => {
                punctuate(contributionsParams, (contributions) => {
                  res.render('user', {
                    thisUser: user,
                    subscriptions: subscriptions,
                    contributions: contributions,
                    posts: posts,
                    dateJoined: user.dateJoined.toDateString().slice(4)
                  });
                });
              });
            }
        });
      }
  });
});

// Check username availability
function usernameAvailable(username, cb){
  User.findOne({ username: username }, (err, user) => {
    if(err){
      console.log(err);
    } else {
      let available;
      if(user){
        available = false;
      } else {
        available = true;
      }
      cb(available);
    }
  });
}

// Access Control
function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('danger', 'Please login');
    res.redirect('/users/login');
  }
}

module.exports = router;
