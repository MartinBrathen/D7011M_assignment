if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');

const initializePassport = require('./passport-config');
initializePassport(passport, dbGetUserByName, dbGetUserById);



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

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
//mongoose.connect('mongodb://localhost:27017/test');
mongoose.model('test2', {name: String})



app.use('/data', dataRoute);

app.use('/', (res, req, next) => {
    // console.log("recieved request, maybe log?");
    next();
});

app.get('/', (req, res) => {
    res.send(req.user.name);
});

app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', { title: 'hello there', name: req.user.name });
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

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const pwd = await bcrypt.hash(req.body.password, 10);
        dbAddUser(req.body.name, pwd);
        res.redirect('/login');
    } catch (error) {
        res.redirect('/register');
    }
});

app.get('/logout', checkAuthenticated, (req, res) => {
    req.logOut(); // from passport
    req.redirect('/login');
});

function dbAddUser(name, pwd){
    console.log(`name: ${name} pwd:${pwd}`);
}

function dbGetUserByName(name){
    return {
        _id: '5ddf8d002e2e694576f84b88',
        name: 'anton',
        password: '$2b$10$BkqhoW3CKuJCe36i3VUNR.1WdgWGCQG9YM2E4ZOY7edw.woqkZ/Aq'
    };
}

function dbGetUserById(id){
    return {
        _id: '5ddf8d002e2e694576f84b88',
        name: 'anton',
        password: '$2b$10$BkqhoW3CKuJCe36i3VUNR.1WdgWGCQG9YM2E4ZOY7edw.woqkZ/Aq'
    };
}

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
        return res.redirect('/');
    }else{
        next();
    }
}



var server = app.listen(3000, () => {});

