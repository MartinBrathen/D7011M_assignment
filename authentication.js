const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/prosumer');
const user = require('./models/user');

passport.use(new LocalStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

const exported = {
    checkAuthenticated(req, res, next){
        // req.isAuthenticated() is from passport
        if (req.isAuthenticated()){
            next();
        }else{
            res.redirect('/login');
        }
    },
    
    checkNotAuthenticated(req, res, next){
        if (req.isAuthenticated()){
            return res.redirect('/dashboard');
        }else{
            next();
        }
    },
    
    checkManager(req, res, next){
        // req.isAuthenticated() is from passport
        if (req.user.manager){
            next();
        }else{
            res.redirect('/login');
        }
    },
    
    userNameTest(req, res, next) {
        if (req.isAuthenticated()){
            res.locals.username = req.user.username;
        }
        next();
    },
};

module.exports = exported;