var express = require('express');


var app = express();
app.set('view engine', 'ejs')

const dataRoute = require('./routes/data');

app.use('/data', dataRoute);

app.use('/', (res, req, next) => {
    console.log("recieved request, maybe log?");
    next();
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'hello there' });
});



var server = app.listen(3000, () => {});

