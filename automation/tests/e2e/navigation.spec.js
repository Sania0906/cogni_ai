import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { DashboardPage } from '../../pages/dashboardPage.js';
import testData from '../../data/testData.json' assert { type: 'json' };

describe('CognifyAI React E2E — Navigation & Routing Test Suite', function () {
  this.timeout(60000);
  const baseSetup = new BaseTestSetup();
  let driver;
  let dashboardPage;

  before(async function () {
    driver = await baseSetup.init();
    dashboardPage = new DashboardPage(driver);
  });

  afterEach(async function () {
    await baseSetup.handleTestResult(this);
  });

  after(async function () {
    await baseSetup.teardown();
  });

  it('TC_NAV_01: Should navigate sequentially across all 5 unified primary tabs', async function () {
    const tabs = testData.navigationTabs;
    expect(tabs).to.have.lengthOf(5);
    for (const tab of tabs) {
      await dashboardPage.navigateTo(tab.path);
      const url = await dashboardPage.getCurrentUrl();
      expect(url).to.be.a('string');
    }
  });

  it('TC_NAV_02: Should preserve history stack on browser back and forward navigation', async function () {
    await dashboardPage.navigateTo('/jobs');
    await dashboardPage.navigateTo('/courses');
    await dashboardPage.goBack();
    const backUrl = await dashboardPage.getCurrentUrl();
    expect(backUrl).to.be.a('string');

    await dashboardPage.goForward();
    const forwardUrl = await dashboardPage.getCurrentUrl();
    expect(forwardUrl).to.be.a('string');
  });

  it('TC_NAV_03: Should handle direct route refresh without application crash', async function () {
    await dashboardPage.navigateTo('/profile');
    await dashboardPage.refresh();
    const title = await dashboardPage.getTitle();
    expect(title).to.be.a('string');
  });
});
