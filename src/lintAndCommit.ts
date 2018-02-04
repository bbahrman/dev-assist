import * as NodeGit from 'nodegit';
import * as FS from 'fs';
import * as ReadLine from 'readline';
import {StatusFile, Repository, Signature, Commit} from "nodegit";
//import { CLIEngine } from "eslint"

export interface LintResult {
  file:string;
  errors:number;
  warnings:number;
  exceptions: LintException[];

}

export interface LintException {
  line:number;
  column:number;
  rule: string;
  excerpt: string;
}

export interface Bug {
  id: number;
  title: string;
  details: string;
  breaking: boolean;
  fixed: boolean;
}

export enum status {
  'false',
  'pending',
  'true'
}

export class splitLintResults {
  js: string[];
  ts: string[];
  constructor () {
    this.js = [];
    this.ts = [];
  }
}

export class DevAssist {
  initialized: status;
  directoryPath: string;
  repositoryObj: Repository;
  signature: Signature;
  headCommit: Commit;
  changedFiles: string[];
  splitChangedFiles: splitLintResults;
  branchName: string;
  lintResults: LintResult[];

  // simple constructor, most of the heavy lifting is done by initialize
  constructor(directory: string) {
    this.initialized = status.false;
    this.directoryPath = directory;
    this.changedFiles = [];
    this.lintResults = [];
  }
  // required for further functionality
  //  in a non-constructor function to allow for async
  initialize() {
    this.initialized = status.pending;
    return new Promise((resolve, reject) => {
      let repoPromise = this.initializeRepo();

      repoPromise
        .then(() => {
          Promise.all([
            this.listChangedFiles(),
            this.getBranchName(),
            this.getParentCommit(),
            this.getSignature()
          ])
          .then(()=>{
            this.initialized = status.true;
            resolve(true);
          })
          .catch((err)=>{reject('Error in changed file check or branch name check ' + err)});
        })
        .catch((err) => {
          reject('Error in repository initialization ' + err);
        });
      });
  }
  initializeRepo(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // initialize repository object, opens the repo in the given directory
      let repoPromise = Repository.open(this.directoryPath);
      repoPromise
        .then((repo)=>{
          this.repositoryObj = repo;
          resolve(true);
        })
        .catch((err)=>{
          reject(err)
        });
    });
  }
  listChangedFiles() {
    return new Promise((resolve, reject)=>{
      let ts:string[] = [];
      let js:string[] = [];
      if (this.repositoryObj === null) {
        reject('Repository not initialized, run initialize before proceeding');
      } else {
        let getStatusPromise = this.repositoryObj.getStatus();

        getStatusPromise
          .then((statuses:StatusFile[]) => {
            try {
              if(statuses.length > 0) {
                statuses.forEach((file, index) => {
                  if (DevAssist.isChanged(file)) {
                    let path:string = file.path();
                    this.changedFiles.push(this.directoryPath + '/' + path);
                    if(path.substr(path.length-2,2) === 'js') {
                      js.push(this.directoryPath + '/' + path);
                    } else if (path.substr(path.length-2,2) === 'ts') {
                      ts.push(this.directoryPath + '/' + path);
                    }
                  }
                  if (index === (statuses.length - 1)) {
                    let splitFiles = new splitLintResults();
                    splitFiles.ts = splitFiles['ts'];
                    splitFiles.js = splitFiles['js'].filter((filePath)=>{
                      return splitFiles['ts'].indexOf(filePath.replace('js','ts')) === -1;
                    });
                    this.splitChangedFiles = splitFiles;
                    resolve(true);
                  }
                });
              } else {
                resolve(true);
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

  getParentCommit() {
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
  getBranchName () {
    return new Promise((resolve, reject) => {
      try {
        this.repositoryObj.getBranch('HEAD').then((reference) => {
          let refName:string = reference.name();
          this.branchName = refName.replace('refs/heads/', '');
          resolve(true)
        });
      } catch (err) {
        reject('Error getBranchName: ' + err);
      }
    });
  }
  getSignature () {
    return new Promise((resolve, reject)=>{
      try {
        const signature = Signature.default(this.repositoryObj);
        this.signature = signature;
        resolve(signature);
      } catch (err) {
        reject(err);
      }
    });
  }
  static isChanged (fileObj:StatusFile) {
    return (fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed());
  }
}

