const express = require('express');
const state = require('../state.js');
const auth = require('../authentication.js');
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

router.get('/weather/:lat/:long', (req, res) => {

    var lat = req.params.lat;
    var long = req.params.long;
    
    res.json({
        "windspeed" : state.getWindSpeed(lat, long, new Date()),
        "unit": "m/s"
    });
});

router.get('/weather/:id', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    res.json({
        "windspeed" : state.getProsumerWindSpeed(req.params.id),
        "unit": "m/s"
    });
});

router.get('/weather', auth.checkAuthenticated, (req, res) => {
    res.json({
        "windspeed" : state.getProsumerWindSpeed(req.user.id),
        "unit": "m/s"
    });
});


router.get('/model/price', auth.checkAuthenticated, (req, res) => {
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

router.get('/consumption/:id', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    res.json({
        consumption : state.getProsumerConsumption(req.params.id),
        'unit' : 'kW',
    });
});

router.get('/consumption', auth.checkAuthenticated, (req, res) => {
    res.json({
        consumption : state.getProsumerConsumption(req.user.id),
        'unit' : 'kW',
    });
});

router.get('/buffer/:id', auth.checkAuthenticated, auth.checkManager, (req, res) => {
    res.json({
        buffer : state.getProsumerBuffer(req.params.id),
        'unit' : 'kWh',
    });
});

router.get('/buffer', auth.checkAuthenticated, (req, res) => {
    res.json({
        buffer : state.getProsumerBuffer(req.user.id),
        'unit' : 'kWh',
    });
});

router.post('/ratio', auth.checkAuthenticated, (req, res) =>{
    state.setProsumerRatios(req.user.id, req.body);
    res.sendStatus(200);
});

router.get('/ratio/:id', auth.checkAuthenticated, (req, res) => {
    res.json(state.getProsumerRatios(req.params.id));
});

router.get('/ratio', auth.checkAuthenticated, (req, res) => {
    res.json(state.getProsumerRatios(req.user.id));
});

router.get('/powerplant/status', (req, res) => {
    res.json({status: state.powerplant.status});
});

router.get('/powerplant/production', auth.checkAuthenticated, (req, res) => {
    res.json({production: state.powerplant.production, unit: "kW"});
});

router.get('/outages', auth.checkAuthenticated, (req, res) => {
    res.json({outages: state.getOutages()});
});

router.post('/powerplant/update', auth.checkManager, (req, res) => {
    let target = req.body.target;
    let changed = false;
    if (target != state.powerplant.target){
        state.powerplant.target = target;
        // clamp target to 0:1000
        if (target < 0){target = 0;}
        else if (target > 1000){target = 1000;}

        if (state.powerplant.status == "stopped" && target > 0) {
            state.powerplant.status = "starting";
        }

        setTimeout(() => {
            if (target == state.powerplant.target){
                state.powerplant.production = target;
                if (target > 0) {
                    state.powerplant.status = "running";
                }else if (target == 0) {
                    state.powerplant.status = "stopped";
                }
            }
        }, 30000);

        changed = true;
    }

    res.json({status: state.powerplant.status, changed: changed});
});

router.get('/price', (req, res) => {
    res.json({
        price : state.getPrice(),
        unit : "öre/kWh",
    });
});

router.post('/price', auth.checkManager, (req, res) => {
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

router.get('/powerplant/ratio', auth.checkManager, (req, res) => {
    res.json({
        ratio : state.getPlantRatio()
    });
});

router.post('/powerplant/ratio', auth.checkManager, (req, res) => {
    let ratio = req.body.ratio;
    state.setPlantRatio(ratio);
    res.json({
        ratio : ratio,
    });
});

router.get('/powerplant/buffer', auth.checkManager, (req, res) => {
    res.json({
        buffer : state.powerplant.buffer,
        unit: "kWh"
    });
});

module.exports = router;
