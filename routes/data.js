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
    
    res.send("" + getWindSpeed(lat, long, date));
});

router.get('/weather', (req, res) => {
    res.send(getWindTable(-90, 90, 0, 360, 60));
});

router.get('/weather/:lat/:long', (req, res) => {

    var lat = req.params.lat;
    var long = req.params.long;
    
    res.send("" + getWindSpeed(lat, long, new Date()));
});


router.get('/price', (req, res) => {
    // 900 kW/month = 1.25kW
    // 48.25 öre/kWh
    var wind = getWindSpeed(0, 0, new Date()); // m/s //avg 5.26
    var consumption = getTotalConsumption(); // kW     //avg 1.25
    var scalar = 48.25/5.26/1.25;
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
    var timeScale = 1/8640000;
    var offset = date.getTime() * timeScale;

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
    return randomG(3) * 2;
}
function randomG(v){ 
    var r = 0;
    for(var i = v; i > 0; i --){
        r += Math.random();
    }
    return r / v;
}


module.exports = router;
