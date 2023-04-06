const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  status_code: {
    type: Number,
    required: true
  },
  response_time: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('logs', logSchema);
