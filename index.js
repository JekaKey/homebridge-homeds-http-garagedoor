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
    this.controlurl = config["controlURL"];
    this.statusurl = config["statusURL"];
		this.curState = undefined;

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

}

HomeDSAccessory.prototype = {
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
        var doorState = (state == Characteristic.TargetDoorState.CLOSED) ? "closed" : "open";
        this.log("Set state to %s", doorState);

        // this.log(DoorState);

        // var curState = (state == this.targetDoorState.CLOSED) ? this.currentDoorState.CLOSED : this.currentDoorState.OPEN;
        //
        // // this.currentDoorState.setValue(curState);
        // this.currentDoorState.setValue(this.targetDoorState.CLOSED);

        if (state == DoorState.OPEN) {
            this.currentDoorState.setValue(DoorState.OPENING);
            setTimeout(this.setOpen.bind(this), 4000);
        } else {
            this.currentDoorState.setValue(DoorState.CLOSING);
            setTimeout(this.setClose.bind(this), 4000);
        }

        callback(null); // success
        return true;
    }

}

HomeDSAccessory.prototype.getServices = function() {
    return [this.garageservice];
}
