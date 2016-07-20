#!/usr/bin/env node

var Promise = require('bluebird');
var needle = require('needle');
var _ = {
    map: require('lodash.map'),
    last: require('lodash.last'),
    fromPairs: require('lodash.frompairs'),
    inRange: require('lodash.inRange')
};
var sortObj = require('sort-object');
var fs = require('fs');
var detectIndent = require('detect-indent');

var packageFilename = process.cwd() + '/package.json';
var packageFile = fs.readFileSync(packageFilename, 'utf8');
var package = JSON.parse(packageFile);


function getLatestVersion(name) {
    return new Promise(function(resolve, reject) {
        needle.get('https://registry.npmjs.org/' + name, function(error, res) {
            var isSuccess = _.inRange(res.statusCode, 200, 399);
            return isSuccess ? resolve(res.body['dist-tags'].latest) : reject(res);
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
