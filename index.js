var request = require("request");
var fs = require("fs");
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    DoorState = homebridge.hap.Characteristic.CurrentDoorState;
    DoorStateTarget = homebridge.hap.Characteristic.TargetDoorState;

    homebridge.registerAccessory("homebridge-homeds-http-garagedoor", "HomeDSHttpGarageDoor", HomeDSAccessory);
}

function HomeDSAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.stateUrl = config["stateUrl"];
    this.openUrl = config["openUrl"];
    this.closeUrl = config["closeUrl"];
    this.curState = 'OPEN';
    this.poolingInterval = config["poolingInterval"];

    this.method = config["method"];

    this.garageservice = new Service.GarageDoorOpener(this.name, this.name);
    this.currentDoorState = this.garageservice.getCharacteristic(DoorState);
    this.targetDoorState = this.garageservice.getCharacteristic(DoorStateTarget);

    if (this.method == undefined) {this.method = 'get'}

    this.garageservice
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', this.getState.bind(this));

    this.garageservice
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));

    this.init();

}

HomeDSAccessory.prototype = {

    init: function() {
        this.log('Init HomeDSHttpGarageDoor');
        setTimeout(this.monitorState.bind(this), 1000);
    },
    monitorState: function() {

        request[this.method]({
            url: this.stateUrl
        }, function(err, response, body) {

            if (!err && response.statusCode == 200) {

            	body = JSON.parse(body);

                var curState = body.result.toUpperCase();
                this.log('Monitor state %s', curState);

                if (curState != this.curState) {
                    this.log('State change from %s to %s', this.curState, curState);
                    this.garageservice.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState[curState]);

                    if (curState == 'CLOSED' || curState == 'CLOSING') {
                        this.garageservice.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
                    }

                    if (curState == 'OPEN' || curState == 'OPENING') {
                        this.garageservice.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN);
                    }

                    

                }



                this.curState = curState;

            } else {
                this.log('Server error');
            }

        }.bind(this));

        setTimeout(this.monitorState.bind(this), this.poolingInterval);

    },
    getState: function(callback) {
        this.log('Get current state');

        callback(null, 1);
/*
        // this.monitorState(callback);

        this.log("Getting current state...");
        // console.log(DoorStateTarget);
        // this.currentDoorState.setValue(DoorState.OPEN);

        // callback(null, DoorState.CLOSING);

        request[this.method]({
            url: this.stateUrl
        }, function(err, response, body) {
            if (!err && response.statusCode == 200) {

                
                body = JSON.parse(body);
                var curState = body.result.toLowerCase();

                var realState = 0;
                switch (curState) {
                    case 'open':
                        realState = 0;
                        break;
                    case 'closed':
                        realState = 1;
                        break;
                    case 'opening':
                    default:
                        realState = 0;

                }

                callback(null, realState);

            } else {
                this.log("Error getting state: %s", err);
                callback(null);
            }
        }.bind(this));
        // return true;*/

    },
    setClose: function() {
        this.currentDoorState.setValue(DoorState.CLOSED);
        // this.targetDoorState.setValue(DoorState.CLOSED);
    },

    setOpen: function() {
        this.currentDoorState.setValue(DoorState.OPEN);
        // this.targetDoorState.setValue(DoorState.OPEN);
    },
    setState: function(state, callback) {
        var doorState = (state == DoorStateTarget.CLOSED) ? "closed" : "open";

        this.log('Target state ' + DoorStateTarget.CLOSED);
        this.log('Need state ' + state);

        this.log("Set state to %s", doorState);
        this.log("CurState %s", this.targetDoorState.value);

        if (this.targetDoorState.value != state) {
            this.log('Делаем');
            request[this.method]({
                url: (doorState == "closed") ? this.closeUrl : this.openUrl
            }, function(err, response, body) {
                if (!err && response.statusCode == 200) {

                // this.garageservice.setCharacteristic(Characteristic.TargetDoorState, state);


                    callback(null,state);
                } else {
                    this.log("Error server set state");
                    callback(null,state);
                }
            }.bind(this));
        } else {
            callback(null,state);
        }

    }

}

HomeDSAccessory.prototype.getServices = function() {
    return [this.garageservice];
}
