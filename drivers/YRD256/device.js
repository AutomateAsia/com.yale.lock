'use strict';

const Homey = require('homey');
const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

class YRD256 extends ZwaveDevice {
	onMeshInit() {
		// Enable debugging
		this.enableDebug();

		// Print the node's info to the console
		this.printNode();

		// Register capabilities for this device
		this.registerCapability('locked', 'DOOR_LOCK',{
			getOpts: {
				getOnStart : true,
				pollInterval : 300000
			},
			get: 'DOOR_LOCK_OPERATION_GET',
			set: 'DOOR_LOCK_OPERATION_SET',
			setParser: value =>({
				'Door Lock Mode': (value) ? 'Door Secured' : 'Door Unsecured'
			}),
			report: 'DOOR_LOCK_OPERATION_REPORT',
			reportParser(report) {
				console.log(report);
				return report['Door Lock Mode'] === 'Door Secured';
			}
		});

		let homey_unlocked = new Homey.FlowCardTriggerDevice('homey_unlocked');
		homey_unlocked.register();

		let homey_locked = new Homey.FlowCardTriggerDevice('homey_locked');
		homey_locked.register();

		let manual_unlocked = new Homey.FlowCardTriggerDevice('manual_unlocked');
		manual_unlocked.register();

		let user_unlocked = new Homey.FlowCardTriggerDevice('user_unlocked');
		user_unlocked.register();

		let touchpad_unlocked = new Homey.FlowCardTriggerDevice('touchpad_unlocked');
		touchpad_unlocked.register();

		let manual_locked = new Homey.FlowCardTriggerDevice('manual_locked');
		manual_locked.register();

		let touchpad_locked = new Homey.FlowCardTriggerDevice('touchpad_locked');
		touchpad_locked.register();

                let auto_locked = new Homey.FlowCardTriggerDevice('auto_locked');
                auto_locked.register();

		let tamper_alarm = new Homey.FlowCardTriggerDevice('tamper_alarm');
		tamper_alarm.register();

		this.registerCapability('locked', 'ALARM', {
			report: 'ALARM_REPORT',
			reportParser(report) {
				if (report.hasOwnProperty("Alarm Type")) {
					if (report['Alarm Type'] == '21' && report.hasOwnProperty("Alarm Level")) {
						// Lock by thumbturn
						if (report['Alarm Level'] == '1'){
							manual_locked.trigger(this, null, null);
							return true;
						}

						// Lock by touchpad
						if (report['Alarm Level'] == '2'){
							touchpad_locked.trigger(this, null, null);
							return true;
						}
					}

					if (report['Alarm Type'] == '19' && report.hasOwnProperty("Alarm Level")) {
						// Unlock by touchpad
						const tokens = {
							"userid": report['Alarm Level']
						}
						user_unlocked.trigger(this, tokens, null);
						touchpad_unlocked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '22' && report.hasOwnProperty("Alarm Level")) {
						// Unlock by thumbturn
						manual_unlocked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '24' && report.hasOwnProperty("Alarm Level")) {
						// Locked by Homey
						homey_locked.trigger(this, null, null);
						return true;
					}

					if (report['Alarm Type'] == '25' && report.hasOwnProperty("Alarm Level")) {
						// Unlock by Homey
						homey_unlocked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '27' && report.hasOwnProperty("Alarm Level")) {
						// Auto-locked
						auto_locked.trigger(this, null, null);
						return false;
					}

					if (report['Alarm Type'] == '161' && report.hasOwnProperty("Alarm Level")) {
						// Tamper alarm
						const state = {
							"alarmtype": report['Alarm Level']
						};
						tamper_alarm.trigger(this, null, state);
						return null;
					}
				}

				return null;
			}
		});
	}
}

module.exports = YRD256;
