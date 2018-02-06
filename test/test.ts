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

describe("initialize object", () => {
  let initializationPromise:Promise<boolean>;
  beforeEach("initialize object", ()=>{
    initializationPromise = devAssistObject.initialize();
  });
  // check post resolution - multiple checks
  it("should be pending initialization", ()=>{
    expect(devAssistObject.initialized).to.equal(status.pending);
  });
  // check resolution
  it("should resolve", ()=>{
    return expect(initializationPromise).to.eventually.equal(true);
  });
  // check post resolution - multiple checks
  it("should set initialized to true", ()=>{
    return initializationPromise
      .then(()=>{
        expect(devAssistObject.initialized).to.equal(status.true);
      });
  });

  describe("list changed files", ()=>{
    let changedFilePromise:Promise<boolean>;
    beforeEach("list files", ()=>{
      changedFilePromise = initializationPromise
      .then(()=>{
        devAssistObject.listChangedFiles()
          .then(()=>{
            done();
          });
      });
    });

    // check resolution
    it("should resolve", ()=>{
      expect(changedFilePromise).to.eventually.equal(true)
    });

    // check value post resolution
    it("should list all changed files", ()=>{
      changedFilePromise
        .then(()=>{
          expect(devAssistObject.changedFiles).to.not.be.empty; // todo initialize the file dir with preset list of files
        });
      });
  });

  describe("get branch name", ()=>{
    let branchPromise:Promise<boolean>;
    beforeEach("list files", ()=>{
      branchPromise = initializationPromise
        .then(()=>{
          return devAssistObject.getBranchName();
        });
    });

    // check resolution
    it("should resolve", ()=>{
      expect(branchPromise).to.eventually.equal(true)
    });

    // check post resolution
    it("branch name should be defined", ()=>{
      branchPromise
        .then(()=>{
          expect(devAssistObject.branchName).to.not.be.null;
        });
    });
    // check post resolution
    it("branch name should be master", ()=>{
      branchPromise
        .then(()=>{
          expect(devAssistObject.branchName).to.equal('master');
        });
    });
  });
  describe("getParentCommit", ()=>{
    let parentCommitPromise:Promise<boolean>;
    beforeEach("getParentCommit", ()=>{
      parentCommitPromise = initializationPromise
        .then(()=>{
          return devAssistObject.getParentCommit();
        });
    });

    // check resolution
    it("should resolve", ()=>{
      expect(parentCommitPromise).to.eventually.equal(true)
    });

    // check post resolution
    it("should return a commit", ()=>{
      parentCommitPromise
        .then(()=>{
          expect(devAssistObject.headCommit).to.not.be.null; // todo check type
        });
    });
  });

  describe("getSignature", ()=>{
    let getSignature:Promise<boolean>;
    beforeEach("getSignature object", ()=>{
      getSignature = initializationPromise
        .then(()=>{
          return devAssistObject.getSignature();
        });
    });

    // check resolution
    it("should resolve", ()=>{
      expect(getSignature).to.eventually.equal(true)
    });

    // check post resolution
    it("should return a signature", ()=>{
      getSignature
        .then(()=>{
          expect(devAssistObject.signature).to.not.be.null; // todo check type
        });
    });
  });
  // check promise resolution followed by multiple checks
  describe("getSignature", ()=>{
    it("should resolve", ()=>{
      return expect(initializationPromise).to.eventually.be.fulfilled;
    });

    describe("post resolution checks", ()=>{
      before((done)=>{
        initializationPromise
          .then(()=>{
            done();
          });
      });

      it('signature', ()=>{
        expect(devAssistObject.signature).to.not.be.null;
      });
    });
  });
});


