const express = require('express');

const router =express.Router();

const fastnoise = require('fastnoisejs');

const noise = fastnoise.Create(1337);
noise.SetNoiseType(fastnoise.Simplex);


router.get('/', (req, res) => {
    res.send('/weather or /price');
});


// router.use('/weather/:lat/:long', (req, res, next) => {
//     req.params.year = null;
//     next();
// });

//        :lat   :long  :date
//weather/{d}.{d}/{d}.{d}/YYYYMMDDhhmmss
router.get('/weather/:lat/:long/:year-:month-:day::hr::min::sec', (req, res) => {
    ///weather/:lat/:long/:year(\d{4})?:month(\d{2})?:day(\d{2})?:hr(\d{2})?:min(\d{2})?:sec(\d{2})?
    console.log("test");
    var lat = req.params.lat;
    var long = req.params.long;
    var date;

    date = req.params;
    var year = parseInt(date.year);
    var month = parseInt(date.month) -1;
    var day = parseInt(date.day);
    var hr = parseInt(date.hr);
    var min = parseInt(date.min);
    var sec = parseInt(date.sec);
    date = new Date(year, month, day, hr, min, sec);
    
    console.log(date);
    
    res.send("" + windSpeed(lat, long, date));
});

router.get('/weather/:lat/:long', (req, res) => {
    var lat = req.params.lat;
    var long = req.params.long;
    
    res.send("" + windSpeed(lat, long, new Date()));
});



function windSpeed(long, lat, date){
    //date is js Date 
    // 1 day = 24h = 1440m = 86400s = 86400000ms

    //scale changes size of windy areas, higher scale makes winds more localized
    var scale = 400;
    var timeScale = 1/8640000;
    var offset = date.getTime() * timeScale;

    //assume earth is sphere
    //https://stackoverflow.com/questions/1185408/converting-from-longitude-latitude-to-cartesian-coordinates
    var x = Math.cos(long/180*Math.PI) * Math.cos(lat/180*Math.PI);
    var y = Math.sin(long/180*Math.PI) * Math.cos(lat/180*Math.PI);
    var z = Math.sin(lat/180*Math.PI);

    var val = noise.GetNoise(x*scale + offset, y*scale + offset, z*scale + offset); //returns windspeed on range [-1, 1]

    //map to realistic number
    return val;
}

function map(x, a, b, c, d){
    return (x-a)/(b-a)*(d-c)+c;
}

function getWindTable(minlat, maxlat, minlong, maxlong, vertcells){
    var str = '<table style = "border-collapse:collapse;">';
    var inc = (maxlat - minlat) / vertcells;
    for (var y = minlat; y < maxlat; y+=inc){
        str += '<tr style ="padding:0px;margin:0px;">';
        for (var x = minlong; x < maxlong; x+=inc){
            var val = windSpeed(x, y, parseInt(date));
            val = (val+1)*255/2;
            str += '<td style="width:6px;height:6px;padding:0px;margin:0px;background:rgb('+val+','+val+','+val+');"></td>';
        }
        str += '</tr>';
    }
    str += '</table>';
    return str;
}

module.exports = router;