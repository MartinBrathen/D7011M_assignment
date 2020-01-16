const express = require('express');
const state = require('../state.js');

const router = express.Router();

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
    
    res.send("" + state.getWindSpeed(lat, long, date));
});

router.get('/weather/world', (req, res) => {
    res.send(state.getWindTable(-90, 90, 0, 360, 60));
});

router.get('/weather', (req, res) => {
    var lat = 0.0;
    var long = 0.0;
    
    res.json({
        "windspeed" : state.getWindSpeed(lat, long, new Date()),
        "unit": "m/s"
    });
});

router.get('/weather/:lat/:long', (req, res) => {

    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        "windspeed" : state.getWindSpeed(lat, long, new Date()),
        "unit": "m/s"
    });
});

router.get('/weather/id', (req, res) => {
    res.json({
        "windspeed" : state.getProsumerWindSpeed(req.user.id),
        "unit": "m/s"
    });
});


router.get('/model/price', (req, res) => {
    // 900 kW/month = 1.25kW
    // 48.25 öre/kWh
    var wind = state.getWindSpeed(0, 0, new Date()); // m/s //avg 5.26
    var consumption = state.getTotalConsumption(); // kW     //avg 1.25 * totalHouseholds
    var scalar = 48.25/5.26/1.25;
    var result = scalar * wind/(consumption + 0.0001); // öre/kWh
    res.json({
        "price" : result,
        "unit" : "öre/kWh",
    });
});

router.get('/consumption', (req, res) => {
    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        consumption : state.getConsumption(),
        'unit' : 'kW',
    });
});

router.get('/consumption/id', (req, res) => {
    res.json({
        consumption : state.getProsumerConsumption(req.user.id),
        'unit' : 'kW',
    });
});

router.get('/buffer', (req, res) => {
    res.json({
        buffer : state.getProsumerBuffer(req.user.id),
        'unit' : 'kWh',
    });
});

router.get('/consumption/total', (req, res) => {
    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        consumption : state.getTotalConsumption(),
        'unit' : 'kW',
    });
});

router.post('/ratio/', (req, res) =>{
    state.setProsumerRatios(req.user.id, req.body);
    res.sendStatus(200);
});

router.get('/ratio', (req, res) => {
    res.json(state.getProsumerRatios(req.user.id));
});

router.get('/powerplant/status', (req, res) => {
    res.json({status: state.powerplant.status});
});

router.get('/powerplant/production', (req, res) => {
    res.json({production: state.powerplant.production, unit: "kW"});
});


// anyones can change this with a post request
// TODO: check so only a manager can do this
router.post('/powerplant/update', (req, res) => {
    let target = req.body.target;

    // clamp target to 0:1000
    if (target < 0){target = 0;}
    else if (target > 1000){target = 1000;}

    if (state.powerplant.status == "stopped" && target > 0) {
        state.powerplant.status = "starting";
    }

    setTimeout(() => {
        state.powerplant.production = target;
        if (target > 0) {
            state.powerplant.status = "running";
        }else if (target == 0) {
            state.powerplant.status = "stopped";
        }
    }, 30000);

    res.json({status: state.powerplant.status});
});

router.get('/price', (req, res) => {
    res.json({
        price : state.getPrice(),
        unit : "öre/kWh",
    });
});

router.post('/price', (req, res) => {
    let newPrice = req.body.price;
    state.setPrice(newPrice);
    res.json({
        price : state.getPrice(),
        unit : "öre/kWh",
    });
});

router.get('/demand', (req, res) => {
    res.json({
        val : state.getDemand(),
        unit : "kW",
    });
});

router.get('/powerplant/ratio', (req, res) => {
    res.json({
        ratio : state.getPlantRatio()
    });
});

router.post('/powerplant/ratio', (req, res) => {
    let ratio = req.body.ratio;
    state.setPlantRatio(ratio);
    res.json({
        ratio : ratio,
    });
});

router.get('/powerplant/buffer', (req, res) => {
    res.json({
        buffer : state.powerplant.buffer,
        unit: "kWh"
    });
});

module.exports = router;
