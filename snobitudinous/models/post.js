const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Post schema
const postSchema = Schema({
  title: String,
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  topic: {
    type: Schema.Types.ObjectId,
    ref: 'Topic'
  },
  imageFile: {
    type: String,
    ref: 'Upload'
  },
  body: String,
  dateSubmitted: Date,
  comments: [{
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    body: String,
    dateSubmitted: Date
  }]
});

let Post = module.exports = mongoose.model('Post', postSchema);
