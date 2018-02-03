'use strict';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {DevAssist, status} from '../src/index'
const dirPath:string = './test/testDir';
let devAssistObject: DevAssist;
const expect = chai.expect;
chai.use(chaiAsPromised);

describe("basic test", () => {
   it("1 should equal 1", ()=> {
        expect(1).to.equal(1);
    });
});


beforeEach("create new object before each test", (done) => {
  devAssistObject = new DevAssist(dirPath);
  done();
});

describe("New object", () => {
  it("constructor should create a new object", () => {
    expect(devAssistObject).to.be.an("object");
  });
  it("object should be initialized", ()=>{
    expect(devAssistObject).to.include({initialized: status.false, directoryPath: dirPath});
    expect(devAssistObject).to.haveOwnProperty('changedFiles');
    expect(devAssistObject).to.haveOwnProperty('lintResults');
    expect(devAssistObject.lintResults).to.be.an('array').that.is.empty;
    expect(devAssistObject.changedFiles).to.be.an('array').that.is.empty;
  });
});

describe("initialize", () => {
  let initializationPromise:Promise<boolean>;
  beforeEach("initialize object", ()=>{
    initializationPromise = devAssistObject.initialize();
  });
  it("should be pending initialization", ()=>{
    expect(devAssistObject.initialized).to.equal(status.pending);
  });
  it("should resolve", ()=>{
    expect(initializationPromise).to.eventually.equal(true);
  });
  it("should set initialized to true", ()=>{
    initializationPromise
      .then(()=>{
        expect(devAssistObject.initialized).to.equal(status.true);
      });
  });
});

describe("initialize sub functions", ()=> {
  before("initialize object and wait", (done)=>{
    const initializationPromise = devAssistObject.initialize();
    initializationPromise
      .then((result)=>{
        done();
      })
      .catch((err) => {
        throw err;
      })
  });

  describe("listChangedFiles", ()=>{
    it("changed files not empty", ()=>{
      expect(devAssistObject.changedFiles).to.not.be.empty;
    });
  });
  describe("getBranchName", ()=>{

  });
  describe("getParentCommit", ()=>{

  });
  describe("getSignature", ()=>{

  });
});