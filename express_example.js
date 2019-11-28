var express = require('express');


var app = express();
app.set('view engine', 'ejs')

const dataRoute = require('./routes/data');

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/test');
mongoose.model('test2', {name: String})

app.use('/data', dataRoute);

app.use('/', (res, req, next) => {
    console.log("recieved request, maybe log?");
    next();
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'hello there' });
});

app.get('/dbtest', (req, res) => {
    mongoose.model('test2').find(function(err, test) {
        res.send(test);
    });
});



var server = app.listen(3000, () => {});

