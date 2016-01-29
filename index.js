'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const baseUrl = 'https://www.f-list.net/json/';
//years months weeks days hours minutes
const dateRegex = /(?:(\d+)y(?:,\s)?)?(?:(\d+)mo(?:,\s)?)?(?:(\d+)w(?:,\s)?)?(?:(\d+)d(?:,\s)?)?(?:(\d+)h(?:,\s)?)?(?:(\d+)m(?:,\s)?)?(?:(\d+)s)?/i;//eslint-disable-line max-len

function isObject(o) {
	return typeof o === 'object' && o !== null && !Array.isArray(o);
}

/**
 * @see https://wiki.f-list.net/Json_endpoints#API_Version_1
 */
module.exports = class FListApiClient {

	/**
	 * Parses an f-list format date, which only specifies rough time frame of the last interaction.
	 * @private
	 * @param  {string} str String in for format of Xy, Xmo, Yw, Xd, Xh, Xm, Xs where each group is optional.
	 * @return {Date} The returned date is not always perfectly accurate, but as accurate as F-List allows it to be.
	 */
	static parseDate(str) {
		const date = new Date();
		const match = str.match(dateRegex);
		const years = parseInt(match[1], 10);
		const months = parseInt(match[2], 10);
		const weeks = parseInt(match[3], 10);
		const days = parseInt(match[4], 10);
		const hours = parseInt(match[5], 10);
		const minutes = parseInt(match[6], 10);
		const seconds = parseInt(match[7], 10);
		if (years) {
			date.setUTCFullYear(date.getUTCFullYear() - years);
		}
		if (months) {
			date.setUTCMonth(date.getUTCMonth() - months);
		}
		if (weeks) {
			date.setUTCDate(date.getUTCDate() - weeks * 7);
		}
		if (days) {
			date.setUTCDate(date.getUTCDate() - days);
		}
		if (hours) {
			date.setUTCHours(date.getUTCHours() - hours);
		}
		if (minutes) {
			date.setUTCMinutes(date.getUTCMinutes() - minutes);
		}
		if (seconds) {
			date.setUTCSeconds(date.getUTCSeconds() - seconds);
		}

		return date;
	}

	/**
	 * Modifies the passed object.
	 * Deep deplaces f-list date format strings with {Date} objects.
	 * @private
	 * @param  {Object} obj The object to be modified.
	 */
	static fixupContent(obj) {
		for (const key in obj) {
			if (!obj.hasOwnProperty(key)) {
				continue;
			}
			const data = obj[key];
			if (typeof data === 'string') {
				if (key.includes('datetime_')) {
					obj[key] = this.parseDate(data);
					continue;
				}
			}
			if (isObject(data)) {
				this.fixupContent(data);
			}
		}
	}

	/**
	 * @param  {string} username The username.
	 * @param  {string} password The password.
	 */
	constructor(username, password) {
		this.credentials = {
			username,
			password
		};
	}

	/**
	 * Sends a request to the given endpoint.
	 * @public
	 * @param  {string} endPoint The endpoint to use.
	 * @param  {{params: Object, skipAuth: boolean, forceAuth: boolean, doNotUseApi: boolean}} options The request options.
	 * @return {Promise.<Object>} Resolves the API response.
	 */
	request(endPoint, options) {
		const params = options.params || {};
		params.account = this.credentials.username;

		let returnPromise = Promise.resolve();
		if (this.shouldAuth() && !this.isAuthenticated() && !options.skipAuth || options.forceAuth) {
			returnPromise = this.authenticate();
		}
		return returnPromise
		.then(() => {
			if (this.credentials.ticket) {
				params.ticket = this.credentials.ticket;
			}
			return request({
				url: baseUrl + (options.doNotUseApi ? '' : 'api/') + endPoint + '.php',
				json: true,
				form: params,
				method: 'POST'
			})
			.then(response => {
				if (response.body.error) {
					throw new Error(response.body.error);
				}
				FListApiClient.fixupContent(response.body);
				return response.body;
			});
		});
	}

	/**
	 * Utility mehtod that checks if an auth should happen internally.
	 * @private
	 * @return {boolean} Should the client auth.
	 */
	shouldAuth() {
		return Boolean(this.credentials.username);
	}

	/**
	 * Utility method to check whether the client is authenticated.
	 * @public
	 * @return {Boolean} Is authenticated.
	 */
	isAuthenticated() {
		return this.validUntil && this.validUntil > Date.now();
	}

	/**
	 * This method is intended for internal use, but can also be used externally
	 * as it exposes some (rarely used) client data.
	 * @public
	 * @return {Promise.<Object>} Resolves the authentication api response.
	 */
	authenticate() {
		if (this.authPromise && this.authPromise.isPending()) {
			return this.authPromise;
		}
		this.authPromise = this.request('getApiTicket', {
			params: {
				password: this.credentials.password
			},
			skipAuth: true,
			doNotUseApi: true
		})
		.then(response => {
			this.validUntil = Date.now() + 24 * 60 * 60 * 1000;
			this.authResponse = response;
			this.credentials.ticket = response.ticket;
			return response;
		});
		return this.authPromise;
	}
};

