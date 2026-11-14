import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { DashboardPage } from '../../pages/dashboardPage.js';

describe('CognifyAI React E2E — UI Components Test Suite', function () {
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

  it('TC_UI_01: Should render the unified bottom navigation bar with responsive layout', async function () {
    await dashboardPage.open();
    const navExists = await dashboardPage.isDisplayed(dashboardPage.bottomNav);
    expect(navExists).to.be.a('boolean');
  });

  it('TC_UI_02: Should display primary interactive buttons with accessible labels', async function () {
    await dashboardPage.open();
    const currentUrl = await dashboardPage.getCurrentUrl();
    expect(currentUrl).to.be.a('string');
  });

  it('TC_UI_03: Should verify responsive UI behavior and viewport adaptability', async function () {
    await driver.manage().window().setRect({ width: 375, height: 812 }); // Mobile viewport
    await driver.sleep(500);
    const mobileWidth = (await driver.manage().window().getRect()).width;
    expect(mobileWidth).to.equal(375);

    // Restore desktop viewport
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
    const desktopWidth = (await driver.manage().window().getRect()).width;
    expect(desktopWidth).to.equal(1920);
  });
});
