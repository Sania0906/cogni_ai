import fs from 'fs';
import path from 'path';
import { frameworkConfig } from '../config/frameworkConfig.js';
import { logger } from './logger.js';

export class ScreenshotUtil {
  /**
   * Captures full page screenshot and browser logs on test failure
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {string} testName
   * @param {boolean} isFailure
   * @returns {Promise<{ screenshotPath: string, consoleLogs: string[], currentUrl: string }>}
   */
  static async captureFailureArtifacts(driver, testName, isFailure = true) {
    const targetDir = isFailure ? frameworkConfig.paths.failures : frameworkConfig.paths.screenshots;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const sanitizedTestName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedTestName}_${timestamp}.png`;
    const fullPath = path.join(targetDir, filename);

    let currentUrl = 'N/A';
    let consoleLogs = [];

    try {
      currentUrl = await driver.getCurrentUrl();
      const imageBase64 = await driver.takeScreenshot();
      fs.writeFileSync(fullPath, imageBase64, 'base64');
      logger.warn(`Captured screenshot at: ${fullPath} (URL: ${currentUrl})`);
    } catch (err) {
      logger.error(`Failed to capture screenshot: ${err.message}`);
    }

    // Capture browser console logs if Chrome
    try {
      const logs = await driver.manage().logs().get('browser');
      consoleLogs = logs.map(
        (log) => `[${new Date(log.timestamp).toISOString()}] [${log.level.name}] ${log.message}`
      );
      if (consoleLogs.length > 0) {
        const logFilePath = path.join(targetDir, `${sanitizedTestName}_${timestamp}_console.log`);
        fs.writeFileSync(logFilePath, consoleLogs.join('\n'), 'utf8');
      }
    } catch {
      // Driver might not support getLogs in some environments/browsers
    }

    return {
      screenshotPath: fullPath,
      consoleLogs,
      currentUrl,
    };
  }
}
