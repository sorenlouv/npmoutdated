#!/usr/bin/env node

var RegClient = require('npm-registry-client');
var Promise = require('bluebird');
var _ = require('lodash');
var sortObj = require('sort-object');
var client = new RegClient();
var fs = require('fs');
var package = JSON.parse(fs.readFileSync(process.cwd() + '/package.json', 'utf8'));

function getLatestVersion(name) {
    return new Promise(function(resolve, reject) {
    	var options = {};
        client.get('https://registry.npmjs.org/' + name, options, function(error, data, raw, res) {
            if (error) {
                return reject(error);
            }
            resolve(data['dist-tags'].latest);
        });
    });
}

function getUpdatedDependencies(deps) {
    var promises = _.map(deps, function(currentVersion, name) {
        return getLatestVersion(name).then(function(latestVersion) {
            return [name, latestVersion];
        });
    });
    return Promise.all(promises).then(function(dependencies) {
        return sortObj(_.fromPairs(dependencies));
    });
}
Promise.all([
    getUpdatedDependencies(package.dependencies),
    getUpdatedDependencies(package.devDependencies)
]).spread(function(dependencies, devDependencies) {
    package.dependencies = dependencies;
    package.devDependencies = devDependencies;
    console.log('Updated package.json:');
    console.log(JSON.stringify(package, null, 4), '\n');
});
