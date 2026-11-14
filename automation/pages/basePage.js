import { By, until, Key } from 'selenium-webdriver';
import { frameworkConfig } from '../config/frameworkConfig.js';
import { WaitUtils } from '../utilities/waitUtils.js';
import { logger } from '../utilities/logger.js';

/**
 * Enterprise Base Page Object Class
 * Encapsulates core browser actions, resilient explicit waits, JS execution,
 * scrolling, window management, and alert handling.
 */
export class BasePage {
  /**
   * @param {import('selenium-webdriver').WebDriver} driver
   */
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = frameworkConfig.web.baseUrl;
  }

  /**
   * Navigates to a specific route relative to baseUrl
   * @param {string} routePath
   */
  async navigateTo(routePath = '') {
    const fullUrl = `${this.baseUrl}${routePath}`;
    logger.info(`Navigating to URL: ${fullUrl}`);
    await this.driver.get(fullUrl);
    await this.waitForPageLoad();
  }

  /**
   * Waits for document.readyState === 'complete'
   * @param {number} [timeoutMs]
   */
  async waitForPageLoad(timeoutMs = frameworkConfig.web.timeouts.pageLoad) {
    await this.driver.wait(async () => {
      const readyState = await this.driver.executeScript('return document.readyState;');
      return readyState === 'complete';
    }, timeoutMs);
  }

  /**
   * Clicks an element after ensuring visibility and clickability
   * @param {import('selenium-webdriver').By} locator
   */
  async click(locator) {
    logger.debug(`Clicking element: ${locator.toString()}`);
    const el = await WaitUtils.waitForClickable(this.driver, locator);
    await el.click();
  }

  /**
   * Sends text input into an element with optional prior clearing
   * @param {import('selenium-webdriver').By} locator
   * @param {string} text
   * @param {boolean} [clearFirst=true]
   */
  async type(locator, text, clearFirst = true) {
    logger.debug(`Typing into element ${locator.toString()}: "${text}"`);
    const el = await WaitUtils.waitForVisible(this.driver, locator);
    if (clearFirst) {
      await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
      await el.clear();
    }
    await el.sendKeys(text);
  }

  /**
   * Extracts visible text from element
   * @param {import('selenium-webdriver').By} locator
   * @returns {Promise<string>}
   */
  async getText(locator) {
    const el = await WaitUtils.waitForVisible(this.driver, locator);
    return (await el.getText()).trim();
  }

  /**
   * Checks whether an element is displayed
   * @param {import('selenium-webdriver').By} locator
   * @returns {Promise<boolean>}
   */
  async isDisplayed(locator) {
    try {
      const el = await this.driver.findElement(locator);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Scrolls an element into view using JavaScript
   * @param {import('selenium-webdriver').By} locator
   */
  async scrollIntoView(locator) {
    const el = await this.driver.findElement(locator);
    await this.driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', el);
    await this.driver.sleep(300);
  }

  /**
   * Executes arbitrary JavaScript in browser
   * @param {string} script
   * @param  {...any} args
   */
  async executeScript(script, ...args) {
    return await this.driver.executeScript(script, ...args);
  }

  /**
   * Browser navigation: Back
   */
  async goBack() {
    logger.info('Performing browser back navigation');
    await this.driver.navigate().back();
    await this.waitForPageLoad();
  }

  /**
   * Browser navigation: Forward
   */
  async goForward() {
    logger.info('Performing browser forward navigation');
    await this.driver.navigate().forward();
    await this.waitForPageLoad();
  }

  /**
   * Browser navigation: Refresh
   */
  async refresh() {
    logger.info('Performing browser page refresh');
    await this.driver.navigate().refresh();
    await this.waitForPageLoad();
  }

  /**
   * Retrieves current browser URL
   * @returns {Promise<string>}
   */
  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  /**
   * Retrieves browser page title
   * @returns {Promise<string>}
   */
  async getTitle() {
    return await this.driver.getTitle();
  }

  /**
   * Accepts JavaScript native alert if present
   */
  async acceptAlert() {
    try {
      await this.driver.wait(until.alertIsPresent(), 3000);
      const alert = await this.driver.switchTo().alert();
      await alert.accept();
    } catch {
      // No alert present
    }
  }
}
