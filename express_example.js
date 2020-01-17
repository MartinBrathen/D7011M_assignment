if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

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

io.on('connection', (socket) => {
    console.log("manager connected");
    socket.emit('msg', { msg: 'you are connected as a manager' });
});

app.use('/', (res, req, next) => {
    // console.log("recieved request, maybe log?");
    next();
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/dashboard/:id', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    let p = state.getProsumerById(req.params.id);
    res.render('dashboard', { title: 'hello there', id: req.params.id, name: p.username, picture: p.picture, manager: true});
});

app.get('/dashboard', auth.checkAuthenticated, (req, res) => {
    if (req.user.manager) {
        return res.redirect('/powerplant');
    }
    res.render('dashboard', { title: 'hello there', id: req.user.id, name: req.user.name, picture: req.user.picture, manager: false});
});

app.post('/pictureUrl', auth.checkAuthenticated, (req, res) => {

    user.findById(req.user.id, (err, myUser) => {

        myUser.picture = req.body.picture.trim();
        myUser.save((err) => {

        });
        res.redirect('/dashboard');
    });
});

app.post('/blockProsumer', auth.checkAuthenticated, (req, res) => {
    console.log(req.body.time + ", " + req.body.id);
    if (req.body.time >= 10 && req.body.time <= 100) {
        state.blockProsumer(req.body.id, req.body.time); 
    }
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

app.post(
    '/login',
    auth.checkNotAuthenticated, 
    passport.authenticate('local', {failureRedirect: '/login',failureFlash: true}), 
    (req, res) => {
        state.setOnline(req.user.id, true);
        io.emit('userConnect', {id: req.user.id, name: req.user.username});
        res.redirect('/dashboard');
    }
);


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
    state.setOnline(req.user.id, false);
    io.emit('userDisconnect', {id: req.user.id, name: req.user.username});
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
            if (err) {

                req.flash('error', err.message);
            
                res.redirect('/profile/edit');
            }else {
                state.updateProsumer({id: myUser.id, lat: myUser.latitude, long: myUser.longitude, name: myUser.username});
                res.redirect('/dashboard');
            }
        });
        
    });
});

app.post('/deleteProsumer', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    
    user.findByIdAndRemove(req.body.id, (err) => {
        if (err) {
            console.log(err);
            return;
        }
        state.deleteProsumerById(req.body.id);
        console.log("success");
        return res.sendStatus(200);
    });
    // user.findById(req.user.id, (err, myUser) => {
    //     console.log(myUser.id);
    // });
});

app.post('/profile/delete', auth.checkAuthenticated, (req, res) => {
    
    user.findByIdAndRemove(req.user.id, (err) => {
        if (err) {
            console.log(err);
            return res.redirect('/profile/edit');
        }
        state.deleteProsumerById(req.user.id);
        console.log("success");
        req.logout();
        return res.redirect('/register');
    });
    // user.findById(req.user.id, (err, myUser) => {
    //     console.log(myUser.id);
    // });
});

app.get('/powerplant', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    // console.log(state.getProsumers());
    res.render('powerplant.ejs', {title: 'coal = good', id: req.user.id, name: req.user.name, picture: req.user.picture, prosumers: state.getProsumers()});
});

server.listen(3000, () => {});

