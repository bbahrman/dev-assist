'use strict';
import { expect } from 'chai';
import {DevAssist, status} from '../src/index'
const dirPath:string = './';

describe("basic test", () => {
   it("1 should equal 1", ()=> {
        expect(1).to.equal(1);
    });
});

describe("New object", () => {
  const devAssistObject = new DevAssist(dirPath);
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

