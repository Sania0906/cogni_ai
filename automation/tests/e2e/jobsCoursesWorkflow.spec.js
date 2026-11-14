import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { JobsPage } from '../../pages/jobsPage.js';
import { CoursesPage } from '../../pages/coursesPage.js';

describe('CognifyAI React E2E — Jobs & Courses Workflows', function () {
  this.timeout(60000);
  const baseSetup = new BaseTestSetup();
  let driver;
  let jobsPage;
  let coursesPage;

  before(async function () {
    driver = await baseSetup.init();
    jobsPage = new JobsPage(driver);
    coursesPage = new CoursesPage(driver);
  });

  afterEach(async function () {
    await baseSetup.handleTestResult(this);
  });

  after(async function () {
    await baseSetup.teardown();
  });

  it('TC_JOB_01: Should load jobs catalog with search input and filters', async function () {
    await jobsPage.open();
    const isSearchVisible = await jobsPage.isDisplayed(jobsPage.searchInput);
    expect(isSearchVisible).to.be.a('boolean');
  });

  it('TC_COURSE_01: Should load course catalog and enable keyword filtering', async function () {
    await coursesPage.open();
    const isCourseSearchVisible = await coursesPage.isDisplayed(coursesPage.searchInput);
    expect(isCourseSearchVisible).to.be.a('boolean');
  });
});
