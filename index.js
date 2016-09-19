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

    this.garageservice = new Service.GarageDoorOpener(this.name, this.name);
    this.currentDoorState = this.garageservice.getCharacteristic(DoorState);
    this.targetDoorState = this.garageservice.getCharacteristic(DoorStateTarget);

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

        setTimeout(this.monitorState.bind(this), this.poolingInterval);
    },
    monitorState: function() {
        console.log('monitor state');

        request.get({
            url: this.stateUrl
        }, function(err, response, body) {

            if (!err && response.statusCode == 200) {

                var curState = body;
                // console.log(this.targetDoorState.getValue());

                if (curState != this.curState) {

                    console.log('State is %s', curState);

                    switch (curState) {
                        case 'open':
                            this.currentDoorState.setValue(DoorState.OPEN);
                            this.targetDoorState.setValue(DoorStateTarget.OPEN);
                            break;
                        case 'opening':
                            this.currentDoorState.setValue(DoorState.OPENING);
                            this.targetDoorState.setValue(DoorStateTarget.OPEN);
                            break;
                        case 'closed':
                            this.currentDoorState.setValue(DoorState.CLOSED);
                            this.targetDoorState.setValue(DoorStateTarget.CLOSED);
                            break;
                        case 'closing':
                            this.currentDoorState.setValue(DoorState.CLOSING);
                            this.targetDoorState.setValue(DoorStateTarget.CLOSED);
                            break;
                        default:
                            console.log('Error state');
                    }

                    this.curState = curState;

                }

            } else {
                this.log('Server error');
            }

        }.bind(this));

        setTimeout(this.monitorState.bind(this), this.poolingInterval);

    },
    getState: function(callback) {
        this.log("Getting current state...");
        // console.log(DoorStateTarget);
        // this.currentDoorState.setValue(DoorState.OPEN);

        callback(null, DoorState.CLOSED);
        // request.get({
        // 	url: this.statusurl
        // }, function(err, response, body) {
        // 	if (!err && response.statusCode == 200) {
        // 		var json = JSON.parse(body);
        // 		var state = json.state; // "open" or "closed"
        // 		this.log("Door state is %s", state);
        // 		var closed = state == "closed"
        // 		// this.currentDoorState.setValue(DoorState.CLOSED);
        // 		callback(null, DoorState.OPEN); // success
        // 	} else {
        // 		this.log("Error getting state: %s", err);
        // 		callback(err);
        // 	}
        // }.bind(this));
        return true;

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

        console.log('Target state ' + DoorStateTarget.CLOSED);
        console.log('Need state ' + state);

        this.log("Set state to %s", doorState);

        request.get({
            url: (doorState == "closed") ? this.closeUrl : this.openUrl
        }, function(err, response, body) {
            if (!err && response.statusCode == 200) {

                if (doorState == "closed") {
                    console.log('Закрываем');
                    // this.currentDoorState.setValue(DoorState.CLOSING);
                    // setTimeout(this.setClose.bind(this), 4000);
                } else {

                    console.log('Открываем');
                    // this.currentDoorState.setValue(DoorState.OPENING);
                    // setTimeout(this.setOpen.bind(this), 4000);
                }

                callback(null);
            } else {
                this.log("Error server set state");
                callback(null);
            }
        }.bind(this));

    }

}

HomeDSAccessory.prototype.getServices = function() {
    return [this.garageservice];
}
