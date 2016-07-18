#!/usr/bin/env node

var RegClient = require('npm-registry-client');
var Promise = require('bluebird');
var _ = {
    map: require('lodash.map'),
    last: require('lodash.last'),
    fromPairs: require('lodash.frompairs')
};
var sortObj = require('sort-object');
var fs = require('fs');
var detectIndent = require('detect-indent');

var client = new RegClient();
var packageFilename = process.cwd() + '/package.json';
var packageFile = fs.readFileSync(packageFilename, 'utf8');
var package = JSON.parse(packageFile);


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

function shouldReplace() {
    return _.last(process.argv) === '--replace';
}

function replaceFile(fileContents) {
    fs.writeFile(packageFilename, fileContents, 'utf8', function(err) {
        if (!err) {
            console.log(packageFilename, 'was updated with shiny dependencies');
        } else {
            console.error(err);
        }
    });
}

Promise.all([
    getUpdatedDependencies(package.dependencies),
    getUpdatedDependencies(package.devDependencies)
]).spread(function(dependencies, devDependencies) {
    package.dependencies = dependencies;
    package.devDependencies = devDependencies;
    console.log('\n');
    var indent = detectIndent(packageFile).indent || 4;
    var fileContents = JSON.stringify(package, null, indent) + '\n';

    if (shouldReplace()){
        replaceFile(fileContents);
    } else {
        console.log(fileContents);
    }
});
