'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { mock, test } = require('node:test');
const Module = require('node:module');

const originalLoad = Module._load;
const load = mock.method(Module, '_load', function (id, ...args) {
	if (id === 'homey') return { Device: class { getClass() { return 'lock'; } } };
	return originalLoad.call(this, id, ...args);
});
const YRD256 = require('../drivers/YRD256/device');
const YDD424 = require('../drivers/YDD424/device');
const YFM40 = require('../drivers/YFM40/device');
load.mock.restore();

function fixture(Driver, commandClass, reportName) {
	const device = new Driver();
	const doorLock = new EventEmitter();
	const alarm = new EventEmitter();
	const calls = [];

	doorLock.version = 1;
	alarm.version = commandClass === 'ALARM' ? 1 : 4;
	doorLock.DOOR_LOCK_OPERATION_SET = async payload => calls.push(payload);
	device.node = {
		battery: true,
		CommandClass: {
			COMMAND_CLASS_DOOR_LOCK: doorLock,
			[`COMMAND_CLASS_${commandClass}`]: alarm,
		},
	};
	device._capabilities = {};
	device._reportListeners = {};
	device.driver = { id: Driver.name };
	device.error = (...args) => assert.fail(args.join(' '));
	device.homey = {
		flow: {
			getDeviceTriggerCard: id => ({
				trigger: async (target, tokens, state) => {
					assert.equal(target, device);
					calls.push({ id, tokens, state });
				},
			}),
		},
	};
	device.registerCapabilityListener = (id, listener) => {
		assert.equal(id, 'locked');
		device.setLocked = listener;
	};
	device.setCapabilityValue = async (id, value) => {
		assert.equal(id, 'locked');
		calls.push(value);
	};
	device.onNodeInit({ node: device.node });

	return {
		calls,
		device,
		sendAlarm: payload => alarm.emit('report', { name: reportName }, payload),
		sendDoorLock: payload => doorLock.emit('report', { name: 'DOOR_LOCK_OPERATION_REPORT' }, payload),
	};
}

const legacy = (type, level) => ({ 'Alarm Type': type, 'Alarm Level': level });
const access = event => ({ 'Notification Type (Raw)': Buffer.from([6]), Event: event });
const flow = (id, state = {}) => ({ id, tokens: {}, state });

test('YRD256 legacy thumbturn and auto-lock reports set the expected state', () => {
	const lock = fixture(YRD256, 'ALARM', 'ALARM_REPORT');
	lock.sendAlarm(legacy('21', '1'));
	lock.sendAlarm(legacy(22, 1));
	lock.sendAlarm(legacy(27, 1));
	assert.deepEqual(lock.calls, [flow('manual_locked'), true, flow('manual_unlocked'), false, flow('auto_locked'), true]);
});

test('YRD256 handles modern thumbturn events and fires a single Flow for a combined report', () => {
	const lock = fixture(YRD256, 'NOTIFICATION', 'NOTIFICATION_REPORT');
	lock.sendAlarm(access(1));
	lock.sendAlarm({ 'Notification Type': 'Access Control', Event: 2 });
	lock.sendAlarm(access(11));
	lock.sendAlarm({ 'Notification Type': 'Home Security', Event: 1 });
	lock.sendAlarm({ ...access(1), ...legacy(21, 1) });
	lock.sendAlarm({ ...access(2), 'V1 Alarm Type': 22, 'V1 Alarm Level': 1 });
	assert.deepEqual(lock.calls, [
		flow('manual_locked'), true,
		flow('manual_unlocked'), false,
		flow('manual_locked'), true,
		flow('manual_unlocked'), false,
	]);
});

test('missing or unknown door lock modes leave state alone', () => {
	const lock = fixture(YRD256, 'ALARM', 'ALARM_REPORT');
	lock.sendDoorLock({ 'Door Lock Mode': 'Door Secured' });
	lock.sendDoorLock({ 'Door Lock Mode': 'Door State Unknown' });
	lock.sendDoorLock({});
	lock.sendDoorLock({ 'Door Lock Mode': 'Door Unsecured' });
	assert.deepEqual(lock.calls, [true, false]);
});

test('legacy Alarm fields distinguish the YDD424 button from the thumbturn', () => {
	const lock = fixture(YDD424, 'NOTIFICATION', 'NOTIFICATION_REPORT');
	lock.sendAlarm({ ...access(2), ...legacy(22, 2) });
	assert.deepEqual(lock.calls, [flow('button_unlocked'), false]);
});

test('a YFM40 battery alarm fires its Flow without changing the lock state', () => {
	const lock = fixture(YFM40, 'ALARM', 'ALARM_REPORT');
	lock.sendAlarm(legacy(167, 0));
	assert.deepEqual(lock.calls, [flow('battery_alarm', { alarmtype: '1' })]);
});

test('the lock capability still sends Door Lock Set commands for version 1 nodes', async () => {
	const lock = fixture(YRD256, 'ALARM', 'ALARM_REPORT');
	await lock.device.setLocked(true);
	await lock.device.setLocked(false);
	assert.deepEqual(lock.calls, [{ 'Door Lock Mode': 'Door Secured' }, { 'Door Lock Mode': 'Door Unsecured' }]);
});
