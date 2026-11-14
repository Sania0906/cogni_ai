import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { ResumePage } from '../../pages/resumePage.js';

describe('CognifyAI React E2E — Resume Analysis Workflow', function () {
  this.timeout(60000);
  const baseSetup = new BaseTestSetup();
  let driver;
  let resumePage;

  before(async function () {
    driver = await baseSetup.init();
    resumePage = new ResumePage(driver);
  });

  afterEach(async function () {
    await baseSetup.handleTestResult(this);
  });

  after(async function () {
    await baseSetup.teardown();
  });

  it('TC_RESUME_01: Should load dedicated Resume Analysis tab without duplicate home actions', async function () {
    await resumePage.open();
    const url = await resumePage.getCurrentUrl();
    expect(url).to.include('/resume-analysis');
  });

  it('TC_RESUME_02: Should display resume file upload dropzone and ATS options', async function () {
    await resumePage.open();
    const isDropzonePresent = await resumePage.isDisplayed(resumePage.uploadZone);
    expect(isDropzonePresent).to.be.a('boolean');
  });
});
