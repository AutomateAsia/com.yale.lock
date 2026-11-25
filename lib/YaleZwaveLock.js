'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const ACCESS_CONTROL = 0x06;
const MANUAL_LOCK = 0x01;
const MANUAL_UNLOCK = 0x02;

class YaleZwaveLock extends ZwaveDevice {
	onNodeInit({ node }) {
		this.registerCapability('locked', 'DOOR_LOCK', {
			getOpts: { getOnStart: node.battery === false },
			setParser: locked => ({
				'Door Lock Mode': locked ? 'Door Secured' : 'Door Unsecured',
			}),
			reportParserOverride: true,
			reportParser(report) {
				const mode = report?.['Door Lock Mode'];
				if (mode === 'Door Secured' || mode === 0xff) return true;
				if (mode === 0 || (typeof mode === 'string' && mode.startsWith('Door Unsecured'))) return false;
				return null;
			},
		});

		if (node.CommandClass.COMMAND_CLASS_ALARM) {
			this.registerCapability('locked', 'ALARM', {
				report: 'ALARM_REPORT',
				reportParser: this.parseAlarm,
			});
		}
		if (node.CommandClass.COMMAND_CLASS_NOTIFICATION) {
			this.registerCapability('locked', 'NOTIFICATION', {
				report: 'NOTIFICATION_REPORT',
				reportParserOverride: true,
				reportParser: this.parseNotification,
			});
		}
	}

	async triggerLockFlow(id, tokens = {}, state = {}) {
		try {
			await this.homey.flow.getDeviceTriggerCard(id).trigger(this, tokens, state);
		} catch (err) {
			this.error(`Could not trigger ${id}`, err);
		}
	}

	parseNotification(report) {
		if (!report) return null;

		// Some Notification reports still carry the legacy Yale alarm fields.
		const locked = this.parseAlarm(report);
		if (locked !== null) return locked;

		const type = report['Notification Type'];
		const rawType = report['Notification Type (Raw)'];
		if (type !== 'Access Control' && type !== ACCESS_CONTROL
			&& !(Buffer.isBuffer(rawType) && rawType[0] === ACCESS_CONTROL)) {
			return null;
		}

		switch (report.Event) {
			case MANUAL_LOCK:
				this.triggerLockFlow('manual_locked');
				return true;
			case MANUAL_UNLOCK:
				this.triggerLockFlow('manual_unlocked');
				return false;
			default:
				return null;
		}
	}

	parseAlarm(report) {
		const alarm = report?.['V1 Alarm Type'] ?? report?.['Alarm Type'];
		const level = report?.['V1 Alarm Level'] ?? report?.['Alarm Level'];
		if (alarm == null || level == null) return null;

		const driver = this.driver.id;
		const hasButton = driver === 'YDD424';
		const isAssure = driver === 'YRD256';
		const isRealLiving = driver === 'YRD220';

		switch (Number(alarm)) {
			case 19:
				this.triggerLockFlow('user_unlocked', { userid: Number(level) });
				this.triggerLockFlow('touchpad_unlocked');
				return false;
			case 21:
				switch (Number(level)) {
					case 1:
						this.triggerLockFlow('manual_locked');
						return true;
					case 2:
						this.triggerLockFlow('touchpad_locked');
						return true;
					case 3:
						if (hasButton) this.triggerLockFlow('button_locked');
						break;
				}
				return isAssure || isRealLiving ? null : true;
			case 22:
				if (Number(level) !== 2 || isAssure || isRealLiving) {
					this.triggerLockFlow('manual_unlocked');
				} else if (hasButton) {
					this.triggerLockFlow('button_unlocked');
				}
				return false;
			case 24:
				this.triggerLockFlow('homey_locked');
				return true;
			case 25:
				this.triggerLockFlow('homey_unlocked');
				return false;
			case 27:
				if (isRealLiving) return null;
				if (driver !== 'YDR446' && (isAssure || Number(level) === 1)) {
					this.triggerLockFlow('auto_locked');
				}
				return true;
			case 161:
				this.triggerLockFlow('tamper_alarm', {}, { alarmtype: String(level) });
				return null;
			case 167:
			case 168:
			case 169:
				this.triggerLockFlow('battery_alarm', {}, { alarmtype: String(Number(alarm) - 166) });
				return null;
			default:
				return null;
		}
	}
}

module.exports = YaleZwaveLock;
