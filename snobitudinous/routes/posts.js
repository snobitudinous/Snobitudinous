const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const crypto = require('crypto');
const config = require('../config/database');
const mongoose = require('mongoose');

// Post model
const Post = require('../models/post');
// User model
const User = require('../models/user');
// Topic model
const Topic = require('../models/topic');

// Access DB
let db = mongoose.connection;

// Add route
router.get('/submit', ensureAuthenticated, (req, res) => {
  User.findById(req.user._id).
    populate('contributesTo').
    exec((err, user) => {
      if(err){
        console.log(err);
      } else {
        res.render('submit_post', {
          contributions: user.contributesTo,
        });
      }
    }
  );
});

// Create storage engine
 const storage = new GridFsStorage({
  url: config.database,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// Init gfs
let gfs;

// Init stream
db.once('open', () => {
  gfs = Grid(db.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Add submit POST route
router.post('/submit', upload.single('postImg'), (req, res) => {

  req.checkBody('title', 'Title is required').notEmpty();

  // Get errors
  let errors = req.validationErrors();

  if(errors){
    res.render('submit_post', {
      title: 'Submit Post',
      errors: errors
    });
  } else {
    let post = new Post({
      title: req.body.title,
      author: req.user._id,
      body: req.body.body,
      topic: req.body.topic,
      dateSubmitted: Date.now()
    });
    if(req.file !== undefined){
      post.imageFile = req.file.filename;
    }
    post.save((err) => {
      if(err){
        console.log(err);
        return;
      } else {
        req.flash('success', 'Post Added');
        res.redirect('/');
      }
    });
  }
});

// Get single post
router.get('/:id', (req, res) => {
  Post.findById(req.params.id).
    populate('author').
    populate('topic').
    populate('comments.author').
    exec((err, post) => {
      if(err){
        console.log(err);
      } else {
        if(post != null){
          res.render('post', {
            post: post,
            dateSubmitted: post.dateSubmitted.toDateString().slice(4),
            imageExists: post.imageFile !== undefined
          });
        } else {
          res.redirect('/');
        }
      }
  });
});

// Post comment
router.post('/:id', ensureAuthenticated, (req, res) => {
  let comment = {
    author: req.user._id,
    body: req.body.comment,
    dateSubmitted: Date.now()
  };

  let query = { _id: req.params.id };
  let addComment = { $push: { comments: comment }};

  Post.update(query, addComment, (err) => {
    if(err){
      console.log(err);
      return;
    } else {
      req.flash('success', 'Comment added');
      res.redirect('/posts/'+req.params.id);
    }
  });
});

// Get post image
router.get('/:id/image/', (req, res) => {
  Post.findById(req.params.id, (err, post) => {
    if(err){
      console.log(err);
    } else {
      imageFile = post.imageFile;
      if(imageFile){
        gfs.files.findOne({ filename: imageFile }, (err, file) => {
          const readstream = gfs.createReadStream(file.filename);
          readstream.pipe(res);
        });
      } else {
        return res.status(404).json({
          err: 'No such image'
        })
      }
    }
  });
});

// Delete post
router.delete('/:id', (req, res) => {
  if(!req.user._id){
    res.status(500).send();
  }

  let query = { _id: req.params.id };

  Post.findById(req.params.id, (err, post) => {
    if(post.author.toString() != req.user._id.toString()){
      res.status(500).send();
    } else {
      Post.deleteOne(query, (err) => {
        if(err){
          console.log(err);
        } else {
          res.send('Success');
        }
      });
    }
  });
});

// // Load edit form
// router.get('/edit/:id', ensureAuthenticated, (req, res) => {
//   Post.findById(req.params.id, (err, post) => {
//     if(post.author != req.user._id){
//       req.flash('danger', 'Not Authorised');
//       res.redirect('/');
//     }
//     res.render('edit_post', {
//       title: 'Edit Post',
//       post: post
//     });
//   });
// });

// Edit post
// router.put('/:id/edit', (req, res) => {
//   let title = req.body.titleEditor;
//   let body = req.body.bodyEditor;
//   console.log(req.body);
//   req.checkBody('titleEditor', 'Title is required').notEmpty();
//
//   // Get errors
//   let errors = req.validationErrors();
//
//   if(errors){
//     Post.findById(req.params.id).
//       populate('author').
//       populate('topic').
//       populate('comments.author').
//       exec((err, post) => {
//         if(err){
//           console.log(err);
//         } else {
//           res.render('post', {
//             post: post,
//             dateSubmitted: post.dateSubmitted.toDateString().slice(4),
//             imageExists: post.imageFile !== undefined,
//             errors: errors
//           });
//         }
//     });
//   } else {
//
//     let query = { _id:req.params.id };
//     let changes = { $set : { title: title, body: body } };
//
//     Post.updateOne(query, changes, (err) => {
//       if(err){
//         console.log(err);
//       } else {
//         res.send('success');
//       }
//     });
//   }
// });

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
