const express = require('express');
const router = express.Router();

// Topic model
let Topic = require('../models/topic');
// Post model
let Post = require('../models/post');
// User model
let User = require('../models/user');

router.get('/:id', (req, res) => {
  Topic.findById(req.params.id, (err, topic) => {
    if(err){
      console.log(err);
    } else {
      Post.find({ topic: topic._id }).
        sort('dateSubmitted').
        limit(100).
        exec((err, posts) => {
          if(err){
            console.log(err);
          } else {
            let changeSubStatus;
            let btnClass;
            if(req.user){
              if(req.user.subscriptions.map(sub => sub.toString()).includes(req.params.id)){
                changeSubStatus = '- Unsubscribe';
                btnClass = 'btn-outline-secondary';
              } else {
                changeSubStatus = '+ Subscribe';
                btnClass = 'btn-outline-primary';
              }
            }
            //paginate({ list: posts, size: 15 }, (pages) => {
              res.render('topics', {
                thisTopic: topic,
                posts: posts,
                changeSubStatus: changeSubStatus,
                btnClass: btnClass
              });
            //});
          }
      });
    }
  });
});

router.post('/:id', (req, res) => {
  let unsubscribe = req.user.subscriptions.map(t => t.toString()).includes(req.params.id);
  let query = { _id: req.user._id };
  let changeSubStatus;
  let message;
  if(unsubscribe){
    changeSubStatus = { $pull: { subscriptions: req.params.id }};
    message = 'Unsubscribed from ';
  } else {
    changeSubStatus = { $push: { subscriptions: req.params.id }};
    message = 'Subscribed to ';
  }

  User.updateOne(query, changeSubStatus, (err) => {
    if(err){
      console.log(err);
      return;
    } else {
      Topic.findById(req.params.id, (err, topic) => {
        if(err){
          console.log(err);
        } else {
          req.flash('success', message+topic.name);
          res.redirect('/topics/'+req.params.id);
        }
      });
    }
  })
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

module.exports = router;
