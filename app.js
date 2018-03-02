'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {

	onInit() {

		this.log('Yale Digital Lock is running...');

	}

}

module.exports = MyApp;
