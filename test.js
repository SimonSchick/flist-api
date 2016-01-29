'use strict';

const FListApiClient = require('./index');
const _ = require('lodash');
const Promise = require('bluebird');

const apiTest = new FListApiClient(process.env.USERNAME, process.env.PASSWORD);

function reduceInfo(info, name) {
	return _.chain(info)
	.find({group: name})
	.get('items')
	.transform(
		(result, value) => {
			result[value.name] = value.value;
		},
		{}
	).value();
}

function fetchFListInfo(name) {
	const options = {
		params: {
			name
		}
	};
	return Promise.props({
		kinks: apiTest.request('character-kinks', options)
		.get('kinks')
		.then(info => _.chain(info)
			.map('items')
			.flatten()
			.transform(
				(result, value) => {
					result[value.name] = value.choice;
				},
				{}
			)
			.invert(true)
			.value()
		),

		customKinks: apiTest.request('character-customkinks', options)
		.get('kinks')
		.then(data => _.transform(data, (result, value) => {
			result[value.name] = value.description;
		}, {})),

		accountInfo: apiTest.request('character-get', options)
		.get('character'),

		advanced: apiTest.request('character-info', options)
		.get('info')
		.then(info =>
			({
				contact: reduceInfo(info, 'Contact details/Sites'),
				sexualDetails: reduceInfo(info, 'Sexual details'),
				generalDetails: reduceInfo(info, 'General Details'),
				RPprefs: reduceInfo(info, 'RPing preferences')
			})
		),
		images: apiTest.request('character-images', options)
		.get('images')
	});
}

fetchFListInfo(process.env.SEARCH)
.then(data => console.log(data), error => console.error(error.stack));
