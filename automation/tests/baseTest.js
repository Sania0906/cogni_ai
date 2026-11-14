import { SeleniumDriverFactory } from '../config/seleniumDriverFactory.js';
import { ScreenshotUtil } from '../utilities/screenshotUtil.js';
import { logger } from '../utilities/logger.js';
import { frameworkConfig } from '../config/frameworkConfig.js';

/**
 * Enterprise Base Test Setup and Teardown
 */
export class BaseTestSetup {
  constructor() {
    this.driver = null;
  }

  async init() {
    this.driver = await SeleniumDriverFactory.createDriver();
    logger.info('BaseTestSetup: Test driver initialized successfully');
    return this.driver;
  }

  async handleTestResult(testContext) {
    if (!this.driver) return;

    const testTitle = testContext.currentTest?.title || 'Unknown_Test';
    const state = testContext.currentTest?.state; // 'passed' | 'failed'

    if (state === 'failed') {
      logger.error(`TEST FAILED: ${testTitle}`);
      const err = testContext.currentTest?.err;
      if (err) {
        logger.error(`Error details: ${err.message}\nStack: ${err.stack}`);
      }
      await ScreenshotUtil.captureFailureArtifacts(this.driver, testTitle, true);
    } else {
      logger.info(`TEST PASSED: ${testTitle}`);
    }
  }

  async teardown() {
    if (this.driver) {
      try {
        await this.driver.quit();
        logger.info('BaseTestSetup: Driver session closed gracefully');
      } catch (err) {
        logger.warn(`Error during driver quit: ${err.message}`);
      } finally {
        this.driver = null;
      }
    }
  }
}
