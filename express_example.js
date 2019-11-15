var express = require('express');


var app = express();
//app.set('view engine', 'pug')

const dataRoute = require('./routes/data');

app.use('/data', dataRoute);

app.get('/:opt', function (req, res){
    
    
    res.json(
        {
            "test":"123", 
            "struct": {
                "int":1,
                "bool":true,
            },
        }
    );
});

var server = app.listen(3000, () => {});

