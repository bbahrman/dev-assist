#! /usr/local/bin/node
import * as NodeGit from 'nodegit';
import * as FS from 'fs';
import * as ReadLine from 'readline';
let logSetting = true;
import * as lib from '../index'
import {RemoteCallbacks} from "nodegit";
import { CLIEngine } from "eslint"

enum status {
  'false',
  'pending',
  'true'
}

class splitLintResults {
  js: string[];
  ts: string[];
  constructor () {
    this.js = [];
    this.ts = [];
  }
}

class devAssist {
  private initialized: status;
  private directoryPath: string;
  private repositoryObj: NodeGit.Repository;
  private signature: NodeGit.Signature;
  private headCommit: NodeGit.Commit;
  private changedFiles: string[];
  private splitChangedFiles: splitLintResults;
  private branchName: string;
  private lintResults: lib.lintResult[];

  // simple constructor, most of the heavy lifting is done by initialize
  constructor(directory: string = './') {
    this.initialized = status.false;
    this.directoryPath = directory;
    this.changedFiles = [];
  }

  // required for further functionality
  //  in a non-constructor function to allow for async
  initialize() {
    this.initialized = status.pending;
    return new Promise((resolve, reject) => {
      // initialize repository object, opens the repo in the given directory
      let repoPromise = NodeGit.Repository.open(this.directoryPath);

      repoPromise
        .then((repo) => {
          this.repositoryObj = repo;
          Promise.all([
            this.listChangedFiles(),
            this.getBranchName(),
            this.getParentCommit(),
            this.getSignature()
          ])
            .then(()=>{resolve()})
            .catch((err)=>{reject('Error in changed file check or branch name check ' + err)});
        })
        .catch((err) => {
          reject('Error in repository initialization ' + err);
        });
    });
  }

  // commit changed files
  commit(message: string): Promise<string> {
    if (this.initialized === status.true) {
      return new Promise((resolve, reject) => {
        let oidPromise = this.generateCommitOId();
        oidPromise
          .then((oid) => {
            // commit changes, last three arguments are OID, commit message, and parent commit
            let commit = this.repositoryObj.createCommit('HEAD', this.signature, this.signature, this.branchName + ' - ' + message, oid, [this.headCommit]);

            let mergePromise = commit.then(() => {
              // merge remote branch in
              return this.repositoryObj.mergeBranches(this.branchName, 'origin/' + this.branchName, this.signature, NodeGit.Merge.PREFERENCE.NONE);
            }).catch((err) => {
              devAssist.log('Error in promise block commit, branchname, fetch');
              devAssist.log(err);
            });

            let masterMergePromise = mergePromise.then(() => {
              return this.repositoryObj.mergeBranches(this.branchName, 'origin/master', this.signature, NodeGit.Merge.PREFERENCE.NONE);
            });

            let remotePromise = masterMergePromise.then(() => {
              return this.repositoryObj.getRemote('origin');
            });

            let pushPromise = remotePromise.then((remote:NodeGit.Remote) => {
              let callbacks:RemoteCallbacks = new NodeGit.RemoteCallbacks;
              callbacks.credentials = (url, userName) => {
                  return NodeGit.Cred.sshKeyFromAgent(userName);
                };
              let pushOptions:NodeGit.PushOptions = {
                callbacks: callbacks
              };
              return remote.push(["refs/heads/master:refs/heads/master"], pushOptions);
            });

            pushPromise.then(() => {
              resolve();
            });
          }).catch((error) => {
            reject('Error encountered while generating commit ' + error);
        });
      });
    } else {
      if (this.initialized === status.pending) {
        throw new Error('Respository has not been fully initialized, initialization is in progress, use the promise returned from devAssist.intialize');
      } else if (this.initialized === status.false) {
        throw new Error('Repository has not been initialized, call devAssist.initialize');
      }
    }
  }

  lint(): Promise<lib.lintResult[]> {
    return new Promise((resolve, reject) => {
      try {
        let cli = new CLIEngine({
          useEslintrc: true, fix: true
        });

        let report = cli.executeOnFiles(this.splitChangedFiles.js);

        report.results.forEach((fileResponse, index, map) => {
          this.lintResults.push(this.responseFormatJS(fileResponse));

          if((report.results.length - 1) === index) {
            let lastFile = this.writeFile(fileResponse.filePath, fileResponse.output);
            lastFile.then(()=>{
              resolve();
            });
          } else {
            this.writeFile(fileResponse.filePath, fileResponse.output);
          }
        });
      } catch (err) {
        reject('Error lintFilesSimple: ' + err);
      }
    });
  }


  lintReport(): string {
    return
  }

  compile(): Promise<boolean> {
    return new Promise((resolve, reject) => {

    });
  }

  logBug(bug: lib.bug): Promise<number> {
    return new Promise((resolve, reject) => {

    });
  }


  private fetchBranches() {
    const callBacks = new NodeGit.RemoteCallbacks;
    callBacks.certificateCheck = () => {
      return 1;
    };
    callBacks.credentials = (url, userName) => {
      return NodeGit.Cred.sshKeyFromAgent(userName);
    };

    const options: NodeGit.FetchOptions = {
      callbacks: callBacks
    };
    return this.repositoryObj.fetch("origin", options);
  }

  private generateCommitOId () : Promise<NodeGit.Oid> {
    return new Promise((resolve,reject) => {
      let updateIndexPromise = this.repositoryObj.refreshIndex();
      updateIndexPromise
        .then((gitIndex) => {
          this.changedFiles.forEach((file, index) => {
            let addPromise = gitIndex.addByPath(file.replace(this.directoryPath + '/', ''));
            addPromise
              .then(() => {
                if (index === (this.changedFiles.length - 1)) {
                  // all files added, write tree index and generate oid

                  let writePromise = gitIndex.write();

                  let oidPromise = writePromise.then(()=>{
                    return gitIndex.writeTree();
                  });

                  oidPromise
                    .then((oid) => {
                      resolve(oid)
                    })
                    .catch ((err)=>{
                      reject(err);
                    });
                }
              })
              .catch((err)=>{
                reject('Error while adding files to index ' + err);
              });
          });
        })
        .catch((err)=>{
          reject('Error in index update ' + err);
        });
    });
  }

  private writeFile (path:string, content:string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!devAssist.isEmptyOrNull(content)) {
        FS.writeFile(path, content, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
  }

  private listChangedFiles() {
    return new Promise((resolve, reject)=>{
      let ts = [];
      let js = [];
      if (this.repositoryObj === null) {
        reject('Repository not initialized, run initialize before proceeding');
      } else {
        let getStatusPromise = this.repositoryObj.getStatus();

        getStatusPromise
          .then((statuses) => {
            try {
              if(statuses.length > 0) {
                statuses.forEach((file, index) => {
                  if (devAssist.isChanged(file)) {
                    devAssist.log('Is changed');
                    let path:string = file.path();
                    devAssist.log('File path = ' + path);
                    this.changedFiles.push(this.directoryPath + '/' + path);
                    devAssist.log('Pushed to main changed file list');
                    if(path.substr(path.length-2,2) === 'js') {
                      js.push(this.directoryPath + '/' + path);
                    } else if (path.substr(path.length-2,2) === 'ts') {
                      ts.push(this.directoryPath + '/' + path);
                    }
                    devAssist.log('Pushed to split file list');
                  }
                  if (index === (statuses.length - 1)) {
                    let splitFiles = new splitLintResults();
                    devAssist.log('Final filter');
                    splitFiles.ts = splitFiles['ts'];
                    splitFiles.js = splitFiles['js'].filter((filePath)=>{
                      return splitFiles['ts'].indexOf(filePath.replace('js','ts')) === -1;
                    });
                    this.splitChangedFiles = splitFiles;
                    resolve();
                  }
                });
              } else {
                resolve();
              }
            } catch (err) {
              reject('Error in iteration of statuses ' + err);
            }
          })
          .catch((err)=>{
            reject('Error while getting status of changed files ' + err);
          });
      }
    });
  }

  private getParentCommit() {
    return new Promise((resolve, reject) => {
      this.repositoryObj.getHeadCommit()
        .then((commit)=>{
          this.headCommit = commit;
          resolve();
        })
        .catch((err)=>{
          reject(err);
        });
    });
  }

  private static isEmptyOrNull (test) {
    return (!test || test == undefined || test === 'undefined' || test === '' || test === null);
  }
  private getBranchName () {
    return new Promise((resolve, reject) => {
      try {
        this.repositoryObj.getBranch('HEAD').then((reference) => {
          let refName:string = reference.name();
          this.branchName = refName.replace('refs/heads/', '');
          resolve()
        });
      } catch (err) {
        reject('Error getBranchName: ' + err);
      }
    });
  }

  private responseFormatJS (fileResult) {
    let result:lib.lintResult = {
      file: fileResult.filePath.replace(this.directoryPath + '/', ''),
      errors: fileResult.errorCount,
      warnings: fileResult.warningCount,
      exceptions: []
    };

    if (fileResult.messages.length > 0) {
      for (let i = 0; i < fileResult.messages.length; i++) {
        let message = fileResult.messages[i];
        let exception: lib.lintException = {
          line: message.line,
          column: message.column,
          rule: message.message,
          excerpt: null
        };
        result.exceptions.push(exception);
      }
    }

    return result;
  }

  private getSignature () {
    return new Promise((resolve, reject)=>{
      try {
        const signature = NodeGit.Signature.default(this.repositoryObj);
        this.signature = signature;
        resolve(signature);
      } catch (err) {
        reject(err);
      }
    });
  }

  private static log (message) {
    if(logSetting) {
      console.log(message);
    }
  }

  private static isChanged (fileObj) {
    return (fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed());
  }
}

const devObj = new devAssist('./');
const initializePromise =  devObj.initialize();
const lintPromise = initializePromise
  .then(()=>{
    return devObj.lint();
  })
  .catch((err)=>{
    throw 'Error in initialize ' + err;
  });

const commitPromise = lintPromise
  .then(()=>{
    return devObj.commit('test commit tslint');
  })
  .catch((err)=>{
    throw 'Error in lint ' + err;
  });

commitPromise
  .then(()=>{
    console.log('Commit complete')
  })
  .catch((err)=>{
    throw 'Error in commit ' + err;
  });
module.exports = devAssist;