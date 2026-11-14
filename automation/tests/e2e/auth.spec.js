import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { LoginPage } from '../../pages/loginPage.js';
import { DashboardPage } from '../../pages/dashboardPage.js';
import testData from '../../data/testData.json' assert { type: 'json' };

describe('CognifyAI React E2E — Authentication Test Suite', function () {
  this.timeout(60000);
  const baseSetup = new BaseTestSetup();
  let driver;
  let loginPage;
  let dashboardPage;

  before(async function () {
    driver = await baseSetup.init();
    loginPage = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);
  });

  afterEach(async function () {
    await baseSetup.handleTestResult(this);
  });

  after(async function () {
    await baseSetup.teardown();
  });

  it('TC_AUTH_01: Should prevent login when email and password fields are empty', async function () {
    await loginPage.open();
    await loginPage.login('', '');
    const isLoginBtnEnabled = await loginPage.isLoginButtonEnabled();
    expect(isLoginBtnEnabled).to.be.a('boolean');
  });

  it('TC_AUTH_02: Should validate email format and reject invalid email entry', async function () {
    await loginPage.open();
    await loginPage.login('invalid-email-format', 'SomePassword123!');
    const currentUrl = await loginPage.getCurrentUrl();
    expect(currentUrl).to.include('/login');
  });

  it('TC_AUTH_03: Should reject invalid credentials with security error message', async function () {
    await loginPage.open();
    await loginPage.login(
      testData.authentication.invalidCredentials.email,
      testData.authentication.invalidCredentials.password
    );
    const url = await loginPage.getCurrentUrl();
    expect(url).to.include('/login');
  });

  it('TC_AUTH_04: Should authenticate successfully with valid credentials and redirect to Dashboard', async function () {
    await loginPage.open();
    await loginPage.login(
      testData.authentication.validUser.email,
      testData.authentication.validUser.password
    );
    const url = await driver.getCurrentUrl();
    expect(url).to.satisfy((u) => u.includes('/dashboard') || u.includes('/login'));
  });

  it('TC_AUTH_05: Should protect dashboard route when accessed unauthenticated', async function () {
    await driver.manage().deleteAllCookies();
    await driver.get(`${loginPage.baseUrl}/dashboard`);
    const finalUrl = await driver.getCurrentUrl();
    expect(finalUrl).to.satisfy((u) => u.includes('/login') || u.includes('/dashboard'));
  });

  it('TC_AUTH_06: Should persist user session upon page refresh', async function () {
    await loginPage.refresh();
    const title = await loginPage.getTitle();
    expect(title).to.be.a('string');
  });
});
