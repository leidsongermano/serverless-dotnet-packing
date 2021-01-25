'use strict';

const { resolve } = require('bluebird');
const BbPromise = require('bluebird');
const program = require('child_process');
const glob = require("glob");
const path = require('path');

module.exports = {
  packing() {
    let self = this;
    if (self.pluginconfig.skippacking) {
      self.serverless.cli.log(`[DotNet] Skipping 'dotnet restore & packing' because 'Skip packing' is true`);
      return resolve();
    } else {
      if (!self.pluginconfig.configuration) {
        self.pluginconfig.configuration = 'Release';
      }
      return new BbPromise.bind(this)
        .then(this.runDotnetRestore)
        .then(this.checkLambdaTool)
        .then(this.installLambdaTool)
        .then(this.runDotnetLambdaPackage);
    }
  },
  runDotnetRestore() {
    return this.programExec('dotnet restore', true);
  },
  checkLambdaTool() {
    let self = this;
    self.serverless.cli.log(`[DotNet] Checking if has 'amazon.lambda.tools' installed`);
    return self.programExec('dotnet tool list -g', false, (error, stdout) => {
      self.checkLambdaToolIsInstalled = stdout.includes('amazon.lambda.tools')
    });
  },
  installLambdaTool() {
    let self = this;
    if (self.checkLambdaToolIsInstalled) {
      self.serverless.cli.log(`[DotNet] 'amazon.lambda.tools' already installed`);
      return resolve();
    } else {
      self.serverless.cli.log(`[DotNet] 'amazon.lambda.tools' not found`);
      return self.programExec('dotnet tool install -g Amazon.Lambda.Tools', false, () => {
        self.serverless.cli.log(`[DotNet] 'amazon.lambda.tools' installed with success!`);
      });
    }
  },
  runDotnetLambdaPackage() {
    let self = this;
    var cmds = [];
    for (var lambdaFunctionName in self.functions)
    {
      var configuration = self.functions[lambdaFunctionName].configuration;
      if (!configuration)
      {
        configuration = self.pluginconfig.configuration;
      }

      let lambdaPkgCmd = `dotnet lambda package --configuration ${configuration} --project-location ${self.functions[lambdaFunctionName].projectPath}`;
      if (self.functions[lambdaFunctionName].outputPackage) {
        lambdaPkgCmd = `${lambdaPkgCmd} --output-package ${self.functions[lambdaFunctionName].outputPackage}`;
      }
      let cmdObj = {
        command: lambdaPkgCmd,
        lambdaFunctionName: lambdaFunctionName
      }
      cmds.push(cmdObj);
    }

    return BbPromise.each(cmds, (cmdObj) => 
    { return this.programExec(cmdObj.command, true, null, cmdObj.lambdaFunctionName)});
  },
  programExec(command, printStdOut, callback, lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (printStdOut) {
          self.serverless.cli.log(
            lambdaFunctionName ?
            `[DotNet][${lambdaFunctionName}] Executing command '${command}'` :
            `[DotNet] Executing command '${command}'`);
        }
        return program.exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(self.pluginconfig);
            return reject(`Error:\n${error}\n\nStdOut:\n${stdout}\n\nStdErr:\n${stderr}`);
          }
          if (printStdOut) {
            console.log(stdout);
          }
          if (callback) {
            callback(error, stdout, stderr);
          }

          return resolve(stdout ? stdout : stderr);
        });
      } catch (err) {
        return reject(err);
      }
    });
  }
};
