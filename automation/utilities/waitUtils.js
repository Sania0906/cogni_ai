import { until, By } from 'selenium-webdriver';
import { frameworkConfig } from '../config/frameworkConfig.js';
import { logger } from './logger.js';

/**
 * Enterprise Explicit Wait Utilities
 */
export class WaitUtils {
  /**
   * Waits for element located by locator to be located in DOM and visible
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {import('selenium-webdriver').By} locator
   * @param {number} [timeoutMs]
   * @returns {Promise<import('selenium-webdriver').WebElement>}
   */
  static async waitForVisible(driver, locator, timeoutMs = frameworkConfig.web.timeouts.explicit) {
    try {
      const element = await driver.wait(until.elementLocated(locator), timeoutMs);
      await driver.wait(until.elementIsVisible(element), timeoutMs);
      return element;
    } catch (err) {
      logger.error(`Element not visible within ${timeoutMs}ms: ${locator.toString()}`);
      throw err;
    }
  }

  /**
   * Waits for element to be clickable (visible & enabled)
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {import('selenium-webdriver').By} locator
   * @param {number} [timeoutMs]
   * @returns {Promise<import('selenium-webdriver').WebElement>}
   */
  static async waitForClickable(driver, locator, timeoutMs = frameworkConfig.web.timeouts.explicit) {
    try {
      const element = await this.waitForVisible(driver, locator, timeoutMs);
      await driver.wait(until.elementIsEnabled(element), timeoutMs);
      return element;
    } catch (err) {
      logger.error(`Element not clickable within ${timeoutMs}ms: ${locator.toString()}`);
      throw err;
    }
  }

  /**
   * Waits for URL to contain target substring
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {string} urlFragment
   * @param {number} [timeoutMs]
   */
  static async waitForUrlContains(driver, urlFragment, timeoutMs = frameworkConfig.web.timeouts.explicit) {
    await driver.wait(until.urlContains(urlFragment), timeoutMs);
  }

  /**
   * Waits for text in element to match regex or string
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {import('selenium-webdriver').By} locator
   * @param {RegExp|string} pattern
   * @param {number} [timeoutMs]
   */
  static async waitForTextMatch(driver, locator, pattern, timeoutMs = frameworkConfig.web.timeouts.explicit) {
    await driver.wait(async () => {
      try {
        const el = await driver.findElement(locator);
        const text = await el.getText();
        return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
      } catch {
        return false;
      }
    }, timeoutMs);
  }

  /**
   * Retries an action until truthy or timeout
   * @param {() => Promise<boolean>} action
   * @param {number} [maxAttempts]
   * @param {number} [delayMs]
   */
  static async retry(action, maxAttempts = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await action();
        if (result) return result;
      } catch (err) {
        lastError = err;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError || new Error(`Action failed after ${maxAttempts} attempts`);
  }
}
