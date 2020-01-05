const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  picture: String
})

const passportLocalMongoose = require('passport-local-mongoose');

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('user', userSchema)