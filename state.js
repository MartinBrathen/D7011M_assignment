const fastnoise = require('fastnoisejs');

var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/prosumer');
const user = require('./models/user');

const noise = fastnoise.Create(1337);
noise.SetNoiseType(fastnoise.Simplex);

// state
/**
 * powerplant
 * status: stopped|running|starting
 * ratio: % sent to the buffer
 */
var powerplant = {status: "stopped", buffer: 0, production: 0, maxBuffer: 1000, ratio: .5};

// electricity price  set by a a manager
var price = 1;

var prosumers = new Map();
var excessPower = null; // demand
const k = 0.2;
var consCycle = 3.14/2;

const exposed = {
    powerplant,
    getWindSpeed(long, lat, date){
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
    },

    getTotalConsumption(nrOfConsumers = 1000) {
        var temp = 0;
        for (i = 0; i < nrOfConsumers; i += 1) {
            temp += this.getConsumption();
        }
        return temp;
    },

    getConsumption(){
        consCycle += randomG(3) * 0.0005;
        return (Math.cos(consCycle) + 1);
    },

    getProsumerWindSpeed(id) {
        return prosumers.get(id).windSpeed;
    },
    
    getProsumerConsumption(id) {
        return prosumers.get(id).consumption;
    },

    setProsumerRatios(id, ratios) {
        var p = prosumers.get(id);
        if(ratios.over != null) {
            p.overRatio = ratios.over;
        }
        if(ratios.under != null) {
            p.underRatio = ratios.under;
        }
    },

    getProsumerRatios(id) {
        var p = prosumers.get(id);
        return {over: p.overRatio, under: p.underRatio};
    },

    getProsumerBuffer(id) {
        return prosumers.get(id).buffer;
    },

    blockProsumer(id, t) {
        prosumers.get(id).blocked = true;
        setTimeout((id) => {prosumers.get(id).blocked = false;}, t, id);
    },

    getDemand() {
        return excessPower;
    },
    
    getPrice() {
        return price;
    },
    
    setPrice(newPrice){
        price = newPrice;
    },
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
            var val = exposed.getWindSpeed(x, y, new Date());
            val = map(val, 0, 10.52, 0, 255);
            str += '<td style="width:6px;height:6px;padding:0px;margin:0px;background:rgb('+val+','+val+','+val+');"></td>';
        }
        str += '</tr>';
    }
    str += '</table>';
    return str;
}




function randomG(v) { 
    var r = 0;
    for(var i = v; i > 0; i --){
        r += Math.random();
    }
    return r / v;
}

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
        p.bufferSize = 1000;
        p.blocked = false;
        prosumers.set(p.id, p);
    }

    setInterval(updateState, 1000);
}

function updateState() {

    var totalProduction = 0;

    for (var p of prosumers) {

        // netProduction - internal
        // outProductin - external (buffer accounted for)

        p = p[1];
        
        p.windSpeed = exposed.getWindSpeed(p.coordinates.lat, p.coordinates.long, new Date());
        p.production = p.windSpeed * k;
        p.consumption = exposed.getConsumption();

        var netProduction = p.production - p.consumption;

        if (netProduction >= 0) {
            // buffer has room for all extra energy
            if(netProduction * p.overRatio <= p.bufferSize - p.buffer) {
                p.buffer += netProduction * p.overRatio;
                p.outProduction = netProduction * (1 - p.overRatio);
            } else { // not all energy can be stored in buffer
                p.outProduction = netProduction - (p.bufferSize - p.buffer);
                p.buffer = p.bufferSize;
            }
        } else { // buffer has enough energy
            if(netProduction * p.underRatio >= -p.buffer) {
                p.buffer += netProduction * p.underRatio;
                p.outProduction = netProduction * (1 - p.underRatio);
            } else { // buffer does not have enough energy
                p.outProduction = netProduction + p.buffer;
                p.buffer = 0;
            }
        }

        if (p.outProduction >= 0 && p.blocked == false) {
            totalProduction += p.outProduction;
        }
    }

    // check for outage

    for (const p of prosumers) {
        if (p.outProduction < 0) {
            totalProduction += p.outProduction;
        }
        if (totalProduction < 0) {
            //TODO: report outage. Do not report outage if buffer is enough, also remove p.outProduction in this case
            console.log('outage: ' + p.username);
        }
    }

    excessPower = totalProduction;
}


setTimeout(initState);

module.exports = exposed;
