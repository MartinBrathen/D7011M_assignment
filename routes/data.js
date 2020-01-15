const express = require('express');

const router =express.Router();

const fastnoise = require('fastnoisejs');

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/prosumer');
const user = require('../models/user');

const noise = fastnoise.Create(1337);
noise.SetNoiseType(fastnoise.Simplex);

var consCycle = 3.14/2;

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
    
    res.send("" + getWindSpeed(lat, long, date));
});

router.get('/weather/world', (req, res) => {
    res.send(getWindTable(-90, 90, 0, 360, 60));
});

router.get('/weather', (req, res) => {
    var lat = 0.0;
    var long = 0.0;
    
    res.json({
        "windspeed" : getWindSpeed(lat, long, new Date()),
        "unit": "m/s"
    });
});

router.get('/weather/:lat/:long', (req, res) => {

    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        "windspeed" : getWindSpeed(lat, long, new Date()),
        "unit": "m/s"
    });
});

router.get('/weather/:id', (req, res) => {
    res.json({
        "windspeed" : prosumers.get(req.params.id).windSpeed,
        "unit": "m/s"
    });
});


router.get('/price', (req, res) => {
    // 900 kW/month = 1.25kW
    // 48.25 öre/kWh
    var wind = getWindSpeed(0, 0, new Date()); // m/s //avg 5.26
    var consumption = getTotalConsumption(); // kW     //avg 1.25 * totalHouseholds
    var scalar = 48.25 / 5.26 / 1.25;
    var result = scalar * wind/(consumption + 0.0001); // öre/kWh
    res.json({
        "price" : result,
        "unit" : "öre/kWh",
    });
});



function getWindSpeed(long, lat, date){
    //date is js Date 
    // 1 day = 24h = 1440m = 86400s = 86400000ms

    //scale changes size of windy areas, higher scale makes winds more localized
    var scale = 400;
    
    //var timeScale = 1/8640000;
    var timeScale = 1/10000;
    var offset = date.getTime() % 100000 * timeScale;
    

    //assume earth is sphere
    //https://stackoverflow.com/questions/1185408/converting-from-longitude-latitude-to-cartesian-coordinates
    var x = Math.cos(long/180*Math.PI) * Math.cos(lat/180*Math.PI);
    var y = Math.sin(long/180*Math.PI) * Math.cos(lat/180*Math.PI);
    var z = Math.sin(lat/180*Math.PI);
    var val = noise.GetNoise(x*scale + offset, y*scale + offset, z*scale + offset); //returns windspeed on range [-1, 1]
    //map to realistic number
    val = (val + 1); // [0, 2]
    val = val * 5.26; // [0, 10.52] m/s
    return val; 
}

function map(x, a, b, c, d){
    return (x-a)/(b-a)*(d-c)+c;
}

function getWindTable(minlat, maxlat, minlong, maxlong, vertcells){
    var str = '<table style = "border-collapse:collapse;">';
    var inc = (maxlat - minlat) / vertcells;
    for (var y = minlat; y < maxlat; y += inc) {
        str += '<tr style ="padding:0px;margin:0px;">';
        for (var x = minlong; x < maxlong; x+=inc){
            var val = getWindSpeed(x, y, new Date());
            val = map(val, 0, 10.52, 0, 255);
            str += '<td style="width:6px;height:6px;padding:0px;margin:0px;background:rgb('+val+','+val+','+val+');"></td>';
        }
        str += '</tr>';
    }
    str += '</table>';
    return str;
}

router.get('/consumption', (req, res) => {
    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        consumption : getConsumption(),
        'unit' : 'kW',
    });
});

router.get('/consumption/id', (req, res) => {
    res.json({
        consumption : prosumers(req.params.id).consumption,
        'unit' : 'kW',
    });
});

router.get('/buffer/id', (req, res) => {
    res.json({
        consumption : prosumers(req.params.id).buffer,
        'unit' : 'kW',
    });
});

router.get('/consumption/total', (req, res) => {
    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        consumption : getTotalConsumption(),
        'unit' : 'kW',
    });
});

function getTotalConsumption(nrOfConsumers = 1000) {
    var temp = 0;
    for (i = 0; i < nrOfConsumers; i += 1) {
        temp += getConsumption();
    }
    return temp;
}
/**
 * returns int
 */
function getConsumption() {
    consCycle += randomG(3) * 0.0005;
    return (Math.cos(consCycle) + 1);
}

function randomG(v){ 
    var r = 0;
    for(var i = v; i > 0; i --){
        r += Math.random();
    }
    return r / v;
}


// state
var prosumers = new Map();
var excessPower;
const k = 0.2;

async function initState() {

    var tempProsumers = await user.find().select({username: 1, coordinates: 1, overRatio: 1, underRatio: 1});



    for (var p of tempProsumers) {
        if (p.coordinates == null) {
            p.coordinates = {lat: 0.0, long: 0.0};
        }
        if (p.overRatio == null) {
            p.overRatio = 0;
        }
        if (p.underRatio == null) {
            p.underRatio = 0;
        }
        if (p.buffer == null) {
            p.buffer = 0;
        }
        prosumers.set(p.id, {username: p.username, coordinates: p.coordinates, overRatio: p.overRatio, underRatio: p.underRatio});
    }

    setInterval(updateState, 1000);
}

function updateState() {

    var totalProduction = 0;

    for (var p of prosumers) {

        p = p[1];
        
        p.windSpeed = getWindSpeed(p.coordinates.lat, p.coordinates.long, new Date());
        p.production = p.windSpeed * k;
        p.consumption = getConsumption();

        var netProduction = p.production - p.consumption;
        var ratio = netProduction >= 0 ? p.overRatio : p.underRatio;

        if (p.buffer >= netProduction * ratio) {
            p.buffer += netProduction * ratio;
            p.outProduction = netProduction * (1 - ratio);
        } else {
            p.outProduction = netProduction * (1 - ratio) + p.buffer;
            p.buffer = 0;
        }
        
        if (p.outProduction >= 0) {
            totalProduction += p.outProduction;
        }
    }

    for (const p of prosumers) {
        if (p.outProduction < 0) {
            totalProduction += p.outProduction;
        }
        if (totalProduction < 0) {
            //TODO: report outage
            console.log('outage: ' + p.username);
        }
    }
    
    // 
    excessPower = totalProduction;
}


setTimeout(initState);


module.exports = router;
