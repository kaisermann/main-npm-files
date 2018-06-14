'use strict';

const glob = require('glob');
const minimatch = require('minimatch');
const { normalize } = require('path');
const { join } = require('path');
const { readFileSync } = require('fs');
const readJsonParsed = file => JSON.parse(readFileSync(file, 'utf-8'));

const defaultOptions = {
  pkgJson: './package.json',
  nodeModules: './node_modules',
  onlySpecified: true,
  onlyMain: false
};

module.exports = function (filter, customOpts) {
  let allFiles = [];

  const options = Object.assign(defaultOptions, customOpts);

  //Get the package.json of the project
  const packageJson = readJsonParsed(options.pkgJson);
  const dependencies = packageJson.dependencies;
  const overrides = packageJson.overrides;

  //Apply the glob to all the dependencies in the package.json
  for (const dependency in dependencies) {

    if (options.package && dependency != options.package) continue;

    const modulePath = join(options.nodeModules, dependency);

    //Read the package.json of a dependency
    const dependencyPkg = readJsonParsed(join(modulePath, 'package.json'));
    let depFiles;

    // Overrides current's package.json attributes
    if (overrides && overrides[dependency]) {
      for (const key in overrides[dependency]) {
        dependencyPkg[key] = overrides[dependency][key];
      }
    }

    //If you want to search through all files, just apply a glob to the entire directory, ignoring node_modules
    if (!options.onlySpecified) {
      depFiles = glob.sync(`./${join(modulePath, filter)}`, {
        //Ignore all files from nested node_modules folders
        ignore: join(modulePath, 'node_modules/**'),
      });
      allFiles = allFiles.concat(depFiles);
    } else {
      depFiles = {};
      if (!options.onlyMain && dependencyPkg.files) {
        dependencyPkg.files.map(e => (depFiles[normalize(e)] = true));
      }

      ['main', 'style'].forEach(fileKey => {
        const file = dependencyPkg[fileKey] || '';
        if (file && file.length && !depFiles[file]) {
          depFiles[normalize(file)] = true;
        }
      });

      depFiles = Object.keys(depFiles).reduce((arr, file) => {
        if (minimatch(file, filter)) {
          arr.push(`./${join(modulePath, file)}`);
        }
        return arr;
      }, []);

      allFiles = allFiles.concat(depFiles);
    }
  }
  return allFiles;
};
