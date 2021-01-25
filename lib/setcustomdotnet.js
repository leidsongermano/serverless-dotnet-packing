'use strict';

const BbPromise = require('bluebird');
const glob = require("glob");
const fs = require('fs');
const { resolve, reject } = require('bluebird');

module.exports = {
  setcustomdotnet() {
    return new BbPromise.bind(this)
      .then(this.setProjectInfo);
  },
  setProjectInfo() {
    let self = this;
    let promises = [];

    for (var lambdaFunctionName in self.serverless.service.functions) {
      promises.push(new BbPromise
        .resolve(lambdaFunctionName)
        .bind(this)
        .then(this.setProject)
        .then(this.setProjectRuntime)
        .then(this.setAssemblyName)
        .then(this.setNamespace)
        .then(this.setEntryPoint));
    }
    return BbPromise.all(promises);
  },
  setProject(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        let lamdbaProjectFound = self.searchAndSetProject(self, lambdaFunctionName);

        if (lamdbaProjectFound) {
          if (self.functions[lambdaFunctionName].projectPath !== self.functions[lambdaFunctionName].projectFile && !self.functions[lambdaFunctionName].preDefinedProjectPath) {
            self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using project path '${self.functions[lambdaFunctionName].projectPath}'`);
            self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectpath = self.functions[lambdaFunctionName].projectPath;
          }
          if (!self.functions[lambdaFunctionName].preDefinedProjectFile) {
            self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using project file '${self.functions[lambdaFunctionName].projectFile}'`);
            self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectfile = self.functions[lambdaFunctionName].projectFile;
          }
        } else {
          return reject(`[${lambdaFunctionName}] No lambda project was found for filter '${self.pluginconfig.functions[lambdaFunctionName].projectfile}'.`);
        }
        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  searchAndSetProject(self, lambdaFunctionName) {
    let lamdbaProjectFound = false;
    self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Searching project based on filter: '${self.functions[lambdaFunctionName].projectFilter}' under structure '${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}'`);
    let csprojs = glob.sync(`${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}`, { ignore: '**/Serverless/**/*.csproj' });
    let csproj;
    if (csprojs.length > 0) {
      let regex = new RegExp(self.functions[lambdaFunctionName].projectFilter);
      csprojs.forEach(file => {
        const fileContent = fs.readFileSync(file);
        let result = regex.exec(fileContent);
        if (result) {
          if (!self.pluginconfig.uselambdanamefromproject ||
              result[1] == lambdaFunctionName) {
            csproj = file;
            lamdbaProjectFound = true;
            return false;
          }
        }
      });
    }
    if (csproj) {
      let strArr = csproj.split('/');
      self.functions[lambdaFunctionName].projectPath = strArr.length > 1 ? strArr[strArr.length - 2] : strArr[0];
      self.functions[lambdaFunctionName].projectFile = strArr[strArr.length - 1];
    }
    return lamdbaProjectFound;
  },
  setProjectRuntime(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].projectruntime) {
          self.functions[lambdaFunctionName].projectRuntime = self.pluginconfig.functions[lambdaFunctionName].projectruntime;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined runtime: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].projectruntime)}'`);
          return resolve(lambdaFunctionName);
        }
        if (self.pluginconfig.projectruntime) {
          self.functions[lambdaFunctionName].projectRuntime = self.pluginconfig.projectruntime;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined general runtime: '${JSON.stringify(self.pluginconfig.projectruntime)}'`);
          return resolve(lambdaFunctionName);
        }

        const fileContent = fs.readFileSync(`${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}`);
        let regex = new RegExp('<TargetFramework>(.*)</TargetFramework>');
        let regexResult = fileContent.toString('utf8').match(regex);
        if (regexResult) {
          let runtime = `dot${regexResult[1].replace('app', '')}`;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using runtime '${runtime}'`);
          self.functions[lambdaFunctionName].projectRuntime = runtime;
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectruntime = runtime;
        } else {
          return reject(`No target framework was found in project '${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}'.`);
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setAssemblyName(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].assemblyname) {
          self.functions[lambdaFunctionName].assemblyName = self.pluginconfig.functions[lambdaFunctionName].assemblyname;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined assembly name: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].assemblyname)}'`);
        } else if (self.pluginconfig.assemblyname) {
          self.functions[lambdaFunctionName].assemblyName = self.pluginconfig.assemblyname;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined general assembly name: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].assemblyname)}'`);
        } else {
          let assemblyname = self.functions[lambdaFunctionName].projectFile.replace('.csproj', '');
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using assembly name '${assemblyname}'`);
          self.functions[lambdaFunctionName].assemblyName = assemblyname;
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].assemblyname = assemblyname;
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setNamespace(lambdaFunctionName) {
    let self = this;

    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].namespace) {
          self.functions[lambdaFunctionName].namespace = self.pluginconfig.functions[lambdaFunctionName].namespace;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined assembly name: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].namespace)}'`);
        } else if (self.pluginconfig.namespace) {
          self.functions[lambdaFunctionName].namespace = self.pluginconfig.namespace;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined assembly name: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].namespace)}'`);
        } else {
          self.setEntrypointClassContent(self, lambdaFunctionName);

          if (self.functions[lambdaFunctionName].entryPointClass) {
            let regex = new RegExp('namespace (.*)[\r\n]?');
            let regexResult = self.functions[lambdaFunctionName].entryPointClass.toString('utf8').match(regex);
            if (regexResult) {
              let namespace = regexResult[1].trim();
              self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using namespace ${namespace}`);
              self.functions[lambdaFunctionName].namespace = namespace;
              self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].namespace = namespace;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.projectPath}'.`);
          }
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntryPoint(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].entrypointclass) {
          self.functions[lambdaFunctionName].entryPointClass = self.pluginconfig.functions[lambdaFunctionName].entrypointclass;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined entrypoint class: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].entrypointclass)}'`);
        } else if (self.pluginconfig.entrypointclass) {
          self.functions[lambdaFunctionName].entryPointClass = self.pluginconfig.entrypointclass;
          self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using pre-defined entrypoint class: '${JSON.stringify(self.pluginconfig.entrypointclass)}'`);
        } else {
          if (!self.functions[lambdaFunctionName].entryPointClass) {
            self.setEntrypointClassContent(self);
          }

          if (self.functions[lambdaFunctionName].entryPointClass) {
            let regex = new RegExp('class (.*):');
            let regexResult = self.functions[lambdaFunctionName].entryPointClass.toString('utf8').match(regex);
            if (regexResult) {
              let entryPointClass = regexResult[1].trim();
              self.serverless.cli.log(`[DotNet][${lambdaFunctionName}] Using entrypoint class '${entryPointClass}'`);
              self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].entrypointclass = entryPointClass;
              self.functions[lambdaFunctionName].entryPointClass = entryPointClass;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.functions[lambdaFunctionName].projectPath}'.`);
          }
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntrypointClassContent(self, lambdaFunctionName) {
    let csfiles = glob.sync(`${self.functions[lambdaFunctionName].projectPath}/**/*.cs`, { ignore: '**/Serverless/**/*.csproj' });
    csfiles.forEach(file => {
      const fileContent = fs.readFileSync(file);
      // If a .cs file contains this namespace it is because the class extends APIGatewayProxyFunction or APIGatewayHttpApiV2ProxyFunction
      if (fileContent.includes('Amazon.Lambda.AspNetCoreServer')) {
        self.functions[lambdaFunctionName].entryPointClass = fileContent;
        return false;
      }
    });
  }
};
