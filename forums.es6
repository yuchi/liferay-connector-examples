#!/usr/bin/env 6to5-node

// Importing what we need to connect to a Liferay, and a Promise implementation
import { Promise, v61, v62 } from 'liferay-connector';
// Importing `prompt` to ask the user for login information
import * as prompt from 'prompt';
// Importing `optimist` to offer `--login` and `--host` arguments
import { argv } from 'optimist';

// Utilities
let { all, any, coroutine, promisifyAll } = Promise;
let { isArray } = Array;

// An easier to use `prompt.get` renamed as `prompt.getAsync`
// (see `bluebird` documentation)
promisifyAll(prompt);

// Prompt information can be ovverridden by command arguments
prompt.override = argv;

// To be able to `yield` arrays of promises and have them evaluated, we’re
// adding an handler in the form:
//     [ Promise<( dyn | Promise<dyn> )> ] -> Promise<[ dyn ]>
//
// (see `bluebird` documentation)
coroutine.addYieldHandler(value =>
	isArray(value) ? all(value) : undefined);

// The body of the script, as a corouting (`async`)
coroutine(function* () {

	// Asking the user for information
	let { host, login, password } = yield prompt.getAsync([
		{ name: 'host', required: true, default: 'https://www.liferay.com' },
		{ name: 'login', required: true, },
		{ name: 'password', required: true, hidden: true }
	]);

	// Trying all the available connectors, and extracting what we need
	let { invoke, sites } = yield any([
		v61.authenticate(host, { login, password }),
		v62.authenticate(host, { login, password })
	]);

	// Searching for Message Boards categories in every site the users have
	// access to
	let groupsForums = yield sites.map(site => invoke({
		'/mbcategory/get-categories': {
			groupId: site.groupId,
			parentCategoryId: 0,
			start: -1,
			end: -1
		}
	}));

	// For every array of categories...
	for (let forums of groupsForums) {
		// ...extract `name` and `description` for every category
		for (let { name, description } of forums) {

			// print a spacer
			console.log('');

			// print the name as a markdown title...
			console.log(name);
			console.log(name.replace(/[^=]/g, '-').slice(0, 80));

			// and the eventual description as a markdown quote
			if (description) {
				console.log('> ' + description);
			}
		}
	}

	// print a spacer
	console.log('');

})
// Actually execute the coroutine
.call()
// Ensure that every uncatched error on the promise is re-thrown
.done();
