var RegClient = require('npm-registry-client');
var Promise = require('bluebird');
var _ = require('lodash');
var sortObj = require('sort-object');
var client = new RegClient();
var fs = require('fs');
var package = JSON.parse(fs.readFileSync(process.cwd() + '/package.json', 'utf8'));

function getLatestVersion(name) {
	return new Promise((resolve, reject) => {
		client.get('https://registry.npmjs.org/' + name, {}, (error, data, raw, res) => {
			if(error) {
				return reject(error);
			}
			resolve(data['dist-tags'].latest);
		});
	});
}

function getUpdatedDependencies(deps) {
	var promises = _.map(deps, (currentVersion, name) => {
		return getLatestVersion(name).then(latestVersion => [name, latestVersion]);
	});

	return Promise.all(promises).then(dependencies => sortObj(_.fromPairs(dependencies)));
}

Promise.all([
	getUpdatedDependencies(package.dependencies),
	getUpdatedDependencies(package.devDependencies)
]).spread((dependencies, devDependencies) => {
	package.dependencies = dependencies;
	package.devDependencies = devDependencies;

	console.log('Updated package.json:');
	console.log(JSON.stringify(package, null, 4), '\n');
});
