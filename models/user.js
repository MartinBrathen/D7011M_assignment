const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {type: String},
  password: {type: String},
  picture: {type: String},
  latitude: {type: Number, default: 0},
  longitude: {type: Number, default: 0},
  manager: {type: Boolean, default: false},
})

const passportLocalMongoose = require('passport-local-mongoose');

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('user', userSchema)