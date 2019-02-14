'use strict';

const Homey = require('homey');
const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

class YDCONL1 extends ZwaveDevice {
	onMeshInit() {

		// enable debugging
		this.enableDebug();

		// print the node's info to the console
		this.printNode();

		// register capabilities for this device
		this.registerCapability('locked', 'DOOR_LOCK',{
			getOpts: {
				getOnStart : true,
			},
			get: 'DOOR_LOCK_OPERATION_GET',
			set: 'DOOR_LOCK_OPERATION_SET',
			setParser: value =>({
				'Door Lock Mode': ( value ) ? 'Door Secured' : 'Door Unsecured'
			}),
			report: 'DOOR_LOCK_OPERATION_REPORT',
			reportParser(report) {
				console.log(report);
				return report['Door Lock Mode'] === 'Door Secured';
			}
		});

		let manual_unlocked = new Homey.FlowCardTriggerDevice('manual_unlocked');
		manual_unlocked.register();

		let manual_locked = new Homey.FlowCardTriggerDevice('manual_locked');
		manual_locked.register();

		let user_unlocked = new Homey.FlowCardTriggerDevice('user_unlocked');
		user_unlocked.register();

		let touchpad_unlocked = new Homey.FlowCardTriggerDevice('touchpad_unlocked');
		touchpad_unlocked.register();

		let touchpad_locked = new Homey.FlowCardTriggerDevice('touchpad_locked');
		touchpad_locked.register();

		// let button_unlocked = new Homey.FlowCardTriggerDevice('button_unlocked');
		// button_unlocked.register();
		//
		// let button_locked = new Homey.FlowCardTriggerDevice('button_locked');
		// button_locked.register();

		let homey_unlocked = new Homey.FlowCardTriggerDevice('homey_unlocked');
		homey_unlocked.register();

		let homey_locked = new Homey.FlowCardTriggerDevice('homey_locked');
		homey_locked.register();

		let auto_locked = new Homey.FlowCardTriggerDevice('auto_locked');
		auto_locked.register();

		let tamper_alarm = new Homey.FlowCardTriggerDevice('tamper_alarm');
		tamper_alarm.register();

		let battery_alarm = new Homey.FlowCardTriggerDevice('battery_alarm');
		battery_alarm.register();


		this.registerCapability('locked', 'ALARM', {
			report: 'ALARM_REPORT',
			reportParser(report) {

				if (report.hasOwnProperty("Alarm Type")) {

					if (report['Alarm Type'] == '19' && report.hasOwnProperty("Alarm Level")) {
						//unlock by pin
						const tokens = {
							"userid": report['Alarm Level']
						}
						user_unlocked.trigger(this, tokens, null);
						touchpad_unlocked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '21' && report.hasOwnProperty("Alarm Level")) {
						//lock from back
						if (report['Alarm Level'] == '1'){
							manual_locked.trigger(this, null, null);
						}
						//lock from front
						if (report['Alarm Level'] == '2'){
							touchpad_locked.trigger(this, null, null);
						}
						// //lock by button
						// if (report['Alarm Level'] == '3'){
						// 	button_locked.trigger(this, null, null);
						// }
						return true;
					}

					if (report['Alarm Type'] == '22' && report.hasOwnProperty("Alarm Level")) {
						if (report['Alarm Level'] == '2'){
							// button_unlocked.trigger(this, null, null);
						}else{
							//report['Alarm Level'] == '1'
							//unlock by thumbturn
							manual_unlocked.trigger(this, null, null);
						}
						return false;
					}

					if (report['Alarm Type'] == '24' && report.hasOwnProperty("Alarm Level")) {
						//locked via Homey
						homey_locked.trigger(this, null, null);
						return true;
					}

					if (report['Alarm Type'] == '25' && report.hasOwnProperty("Alarm Level")) {
						//unlock via Homey
						homey_unlocked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '27' && report.hasOwnProperty("Alarm Level")) {
						if (report['Alarm Level'] == '1'){
							//autolocked
							auto_locked.trigger(this, null, null);
						}
						return true;

					}

					if (report['Alarm Type'] == '161' && report.hasOwnProperty("Alarm Level")) {
						//tamper alarm
						const state = {
							"alarmtype": report['Alarm Level']
						};
						tamper_alarm.trigger(this, null, state);
						return null;
					}

					if (report['Alarm Type'] == '167' && report.hasOwnProperty("Alarm Level")) {
						// Low battery
						const state = {
							"alarmtype": '1'
						};
						battery_alarm.trigger(this, null, state);
						return null;
					}

					if (report['Alarm Type'] == '168' && report.hasOwnProperty("Alarm Level")) {
						// Critically low battery
						const state = {
							"alarmtype": '2'
						};
						battery_alarm.trigger(this, null, state);
						return null;
					}

					if (report['Alarm Type'] == '169' && report.hasOwnProperty("Alarm Level")) {
						// Battery too low to operate
						const state = {
							"alarmtype": '3'
						};
						battery_alarm.trigger(this, null, state);
						return null;
					}
				}

				return null;
			}
		});

	}
}

module.exports = YDCONL1;
