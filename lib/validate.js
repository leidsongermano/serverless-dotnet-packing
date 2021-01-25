'use strict';

const BbPromise = require('bluebird');

module.exports = {
  validate() {
    let self = this;
    return new BbPromise(function (resolve, reject) {
      try {
        self.serverless.cli.log('[DotNet] Validating requirements');
        if (!self.serverless.service.custom || !self.serverless.service.custom.dotnetpacking) {
          return reject('No dotnetpacking was found under custom properties.');
        }

        self.multipleFunctions = self.serverless.service.functions.length > 1;
        if (self.multipleFunctions &&
          (!self.pluginconfig.functions || self.pluginconfig.functions.length <= 1)) {
          return reject('There are more functions on serverless than defined in dotnetpacking. \nPlease add the properties per function under the \'functions\' scope in dotnetpacking. The only shared properties allowed are \'runtime\' and build \'configuration\'.');
        }

        self.initializeFunctionArray(self);
        self.pluginconfig = self.serverless.service.custom.dotnetpacking;
        for (var lambdaFunctionName in self.functions) {
          self.getProjectPathIfExist(self, lambdaFunctionName);
          self.getProjectFileIfExist(self, lambdaFunctionName);
          self.getProjectFilterIfExist(self, lambdaFunctionName);
          if (!self.functions[lambdaFunctionName].preDefinedProjectPath &&
            !self.functions[lambdaFunctionName].preDefinedProjectFile &&
            !self.functions[lambdaFunctionName].projectFilter) {
            throw (`[${lambdaFunctionName}] No filter for project was found in custom > dotnetpacking > projectfilter or custom > dotnetpacking > functions > ${lambdaFunctionName} > projectfilter!`);
          }
        }

        self.serverless.cli.log('[DotNet] Requirements validated with success!');

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  initializeFunctionArray(self) {
    self.functions = [];
    if (!self.serverless.service.custom.dotnetpacking.functions) {
      self.serverless.service.custom.dotnetpacking.functions = [];
    }
    for (var lambdaFunctionName in self.serverless.service.functions) {
      self.functions[lambdaFunctionName] = {};
      if (!self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName]) {
        self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName] = {};
      }
    }
  },
  getProjectPathIfExist(self, lambdaFunctionName) {
    self.functions[lambdaFunctionName].projectPath = '**';
    self.functions[lambdaFunctionName].preDefinedProjectPath = false;
    if (self.pluginconfig.functions[lambdaFunctionName].projectpath) {
      self.setProjectPathPerFunction(self, lambdaFunctionName, self.pluginconfig.functions[lambdaFunctionName].projectpath);
    }
    else if (self.pluginconfig.projectpath) {
      self.setProjectPathPerFunction(self, lambdaFunctionName, self.pluginconfig.projectpath);
    }
  },
  setProjectPathPerFunction(self, lambdaFunctionName, projectPath) {
    self.functions[lambdaFunctionName].projectPath = projectPath;
    self.functions[lambdaFunctionName].preDefinedProjectPath = true;
    self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined project path: '${JSON.stringify(projectPath)}'`);
  },
  getProjectFileIfExist(self, lambdaFunctionName) {
    self.functions[lambdaFunctionName].projectFile = '*.csproj';
    self.functions[lambdaFunctionName].preDefinedProjectFile = false;
    if (self.pluginconfig.functions[lambdaFunctionName].projectfile) {
      self.setProjectFilePerFunction(self, lambdaFunctionName, self.pluginconfig.functions[lambdaFunctionName].projectfile);
    }
    else if (self.pluginconfig.projectfile) {
      self.setProjectFilePerFunction(self, lambdaFunctionName, self.pluginconfig.projectfile);
    }
  },
  setProjectFilePerFunction(self, lambdaFunctionName, projectFile) {
    self.functions[lambdaFunctionName].preDefinedProjectFile = true;
    self.functions[lambdaFunctionName].projectFile = !projectFile.includes('.csproj') ?
      `${projectFile}.csproj` :
      projectFile;
    self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined project file: '${JSON.stringify(projectFile)}'`);
  },
  getProjectFilterIfExist(self, lambdaFunctionName) {
    if (self.pluginconfig.functions[lambdaFunctionName].projectfilter) {
      self.serProjectFilterPerFunction(self, lambdaFunctionName, self.pluginconfig.functions[lambdaFunctionName].projectfilter);
    }
    else if (self.pluginconfig.projectfilter) {
      self.serProjectFilterPerFunction(self, lambdaFunctionName, self.pluginconfig.projectfilter);
    }
  },
  serProjectFilterPerFunction(self, lambdaFunctionName, projectFilter) {
    self.functions[lambdaFunctionName].projectFilter = projectFilter;
    self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined project filter: '${JSON.stringify(projectFilter)}'`);
  }
};
