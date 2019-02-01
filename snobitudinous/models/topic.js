const mongoose = require('mongoose');

//User Schema
const TopicSchema = mongoose.Schema({
  name: String,
  description: String
});

const User = module.exports = mongoose.model('Topic', TopicSchema);
