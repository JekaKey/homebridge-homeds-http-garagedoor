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
    this.curState = undefined;
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
        setTimeout(this.monitorState.bind(this), 10000);
    },
    monitorState: function() {

        request[this.method]({
            url: this.stateUrl
        }, function(err, response, body) {

            if (!err && response.statusCode == 200) {

            	body = JSON.parse(body);

                var curState = body.result.toLowerCase();
                this.log('monitor state %s', body);
                this.log('Current door state %s', this.currentDoorState.value);
                this.log('Target door state %s', this.targetDoorState.value);

                var realState = 0;
                switch (curState) {
                    case 'open':
                        realState = 0;
                        break;
                    case 'closed':
                        realState = 1;
                        break;
                    case 'opening':
                        realState = 2;
                        this.targetDoorState.setValue(0);
                        break;
                    case 'closing':
                        realState = 3;
                        this.targetDoorState.setValue(1);
                        break;
                    default:
                        this.log('Unkown state');

                }

                if (this.currentDoorState.value != realState) {
                    this.log('Устанавливаем статус');
                    this.currentDoorState.setValue(realState);

                    if (realState == 0 && this.targetDoorState != DoorStateTarget.OPEN) {
                        this.targetDoorState.setValue(0);
                    }

                    if (realState == 1 && this.targetDoorState != DoorStateTarget.CLOSED) {
                        this.targetDoorState.setValue(1);
                    }

                }

            } else {
                this.log('Server error');
            }

        }.bind(this));

        setTimeout(this.monitorState.bind(this), this.poolingInterval);

    },
    getState: function(callback) {

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
        // return true;

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

                    if (doorState == "closed") {
                        this.log('Закрываем');
                        this.currentDoorState.setValue(DoorState.CLOSING);
                        // setTimeout(this.setClose.bind(this), 4000);
                    } else {

                        this.log('Открываем');
                        this.currentDoorState.setValue(DoorState.OPENING);
                        // setTimeout(this.setOpen.bind(this), 4000);
                    }

                    callback(null);
                } else {
                    this.log("Error server set state");
                    callback(null);
                }
            }.bind(this));
        } else {
            callback(null);
        }

    }

}

HomeDSAccessory.prototype.getServices = function() {
    return [this.garageservice];
}
