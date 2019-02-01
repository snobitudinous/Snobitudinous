const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//User Schema
const UserSchema = Schema({
  firstname: String,
  surname: String,
  email: String,
  username: String,
  password: String,
  subscriptions: [{
    type: Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  contributesTo: [{
    type: Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  isAdmin: {
    type: Boolean,
    default: false
  },
  dateJoined: Date
});

const User = module.exports = mongoose.model('User', UserSchema);
