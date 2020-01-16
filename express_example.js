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

const state = require('./state');

const auth = require('./authentication');

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

app.get('/dashboard', auth.checkAuthenticated, (req, res) => {
    if (req.user.manager) {
        return res.redirect('/powerplant');
    }
    res.render('dashboard', { title: 'hello there', id: req.user.id, name: req.user.name, picture: req.user.picture});
});

app.post('/pictureUrl', auth.checkAuthenticated, (req, res) => {

    user.findById(req.user.id, (err, myUser) => {

        myUser.picture = req.body.picture.trim();
        myUser.save((err) => {

        });
        res.redirect('/dashboard');
    });
});

app.put('/blockProsumer/:id/:time', auth.checkAuthenticated, (req, res) => {
    state.blockProsumer(req.params.id, req.params.time);
    res.sendStatus(200);
});

app.get('/dbtest', (req, res) => {
    mongoose.model('test2').find(function(err, test) {
        res.send(test);
    });
});

app.get('/login', auth.checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.post('/login', auth.checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
}));


app.get('/register', auth.checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
});

app.post('/register', auth.checkNotAuthenticated, function(req, res, next) {
    user.register(new user({username: req.body.name}), req.body.password, function(err) {
        if (err) {
            console.log('error: ' , err);
            req.flash('error', err.message);
            
            return res.redirect("/register")
        }
        
        res.redirect('/login');
    });
});

app.get('/logout', auth.checkAuthenticated, (req, res) => {
    req.logOut(); // from passport
    res.redirect('/login');
});




app.get('/profile/edit', auth.checkAuthenticated, auth.userNameTest, (req, res) => {
    res.render('edit_profile');
});

app.post('/profile/edit', auth.checkAuthenticated, (req, res) => {
    
    
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

app.post('/profile/delete', auth.checkAuthenticated, (req, res) => {
    
    user.findByIdAndRemove(req.user.id, (err) => {
        if (err) {
            console.log(err);
            return res.redirect('/profile/edit');
        }
        console.log("success");
        req.logout();
        return res.redirect('/register');
    });
    // user.findById(req.user.id, (err, myUser) => {
    //     console.log(myUser.id);
    // });
});

app.get('/powerplant', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    res.render('powerplant.ejs', {title: 'coal = good', id: req.user.id, name: req.user.name, picture: req.user.picture});
});

var server = app.listen(3000, () => {});

