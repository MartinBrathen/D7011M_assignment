if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash');
const session = require('express-session');

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/prosumer');
const user = require('./models/user');

passport.use(new LocalStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

//const initializePassport = require('./passport-config');
//initializePassport(passport, dbGetUserByName, dbGetUserById);

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: false})); // allows form data to be accessed in request
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // save vars even if nothing is changed
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const dataRoute = require('./routes/data');

app.use('/data', dataRoute);
app.use(express.static(__dirname + '/public'));

// app.use((res, req, next) => {
//     console.log("hello");
//     if (req.isAuthenticated()){
//         res.locals.username = req.user.username;
//         console.log(req.user.username);
//     }
//     next();
// });

app.use('/', (res, req, next) => {
    // console.log("recieved request, maybe log?");
    next();
});

app.get('/', (req, res) => {
    res.send(req.user);
});

app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', { title: 'hello there', name: req.user.name,  picture: req.user.picture});
});

app.post('/pictureUrl', checkAuthenticated, (req, res) => {

    user.findById(req.user.id, (err, myUser) => {

        myUser.picture = req.body.picture.trim();
        myUser.save((err) => {

        });
        res.redirect('/dashboard');
    });
});

app.get('/dbtest', (req, res) => {
    mongoose.model('test2').find(function(err, test) {
        res.send(test);
    });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
}));


app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
});

app.post('/register', checkNotAuthenticated, function(req, res, next) {
    console.log(req.body.name);
    user.register(new user({username: req.body.name}), req.body.password, function(err) {
        if (err) {
            console.log('error: ' , err);
            req.flash('error', err.message);
            
            return res.redirect("/register")
        }
        
        res.redirect('/login');
    });
});

app.get('/logout', checkAuthenticated, (req, res) => {
    req.logOut(); // from passport
    res.redirect('/login');
});




app.get('/profile/edit', checkAuthenticated, userNameTest, (req, res) => {
    res.render('edit_profile');
});

app.post('/profile/edit', checkAuthenticated, (req, res) => {
    
    
    user.findById(req.user.id, (err, myUser) => {
        if (req.body.lat != '') {
            myUser.latitude = req.body.lat.trim();   
        }

        if (req.body.long != '') {
            myUser.longitude = req.body.long.trim();
        }

        if (req.body.profilepic != '') {
            myUser.picture = req.body.profilepic.trim();
        }

        if (req.body.username != '') {
            myUser.username = req.body.username.trim();
        }
        
        myUser.save((err) => {

        });
        res.redirect('/dashboard');
    });
});




function checkAuthenticated(req, res, next){
    // req.isAuthenticated() is from passport
    if (req.isAuthenticated()){
        next();
    }else{
        res.redirect('/login');
    }
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/dashboard');
    }else{
        next();
    }
}

function userNameTest(req, res, next) {
    if (req.isAuthenticated()){
        res.locals.username = req.user.username;
    }
    next();
}



var server = app.listen(3000, () => {});

