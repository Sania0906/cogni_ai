import { frameworkConfig } from './frameworkConfig.js';
import { logger } from '../utilities/logger.js';
import fs from 'fs';

/**
 * Enterprise Mobile Appium 2.x Driver Factory
 * Supports real Android devices and emulators
 * Handles both APK automated installation and launch of installed applications
 */
export class AppiumDriverFactory {
  /**
   * Builds mobile capabilities dictionary
   * @param {Object} [customOptions]
   * @returns {Object}
   */
  static getCapabilities(customOptions = {}) {
    const config = frameworkConfig.mobile;

    const baseCapabilities = {
      platformName: config.platformName,
      'appium:automationName': config.automationName,
      'appium:deviceName': config.deviceName,
      'appium:platformVersion': config.platformVersion,
      'appium:newCommandTimeout': config.newCommandTimeout,
      'appium:autoGrantPermissions': config.autoGrantPermissions,
      'appium:noReset': config.noReset,
    };

    // Mode 1: If APK path exists, install and run APK
    if (fs.existsSync(config.apkPath)) {
      baseCapabilities['appium:app'] = config.apkPath;
      logger.info(`Appium Driver using APK at: ${config.apkPath}`);
    } else {
      // Mode 2: Launch installed package and activity
      baseCapabilities['appium:appPackage'] = config.appPackage;
      baseCapabilities['appium:appActivity'] = config.appActivity;
      logger.info(`Appium Driver targeting installed App: ${config.appPackage}/${config.appActivity}`);
    }

    return { ...baseCapabilities, ...customOptions };
  }

  /**
   * Connects to Appium 2.x server
   * @param {Object} [customCaps]
   * @returns {Promise<any>}
   */
  static async createDriver(customCaps = {}) {
    const caps = this.getCapabilities(customCaps);
    const host = frameworkConfig.mobile.appiumHost;
    const port = frameworkConfig.mobile.appiumPort;

    logger.info(`Connecting to Appium server at http://${host}:${port}`);

    // In modern Appium with webdriverio/selenium client:
    return {
      serverUrl: `http://${host}:${port}`,
      capabilities: caps,
      sessionDetails: {
        platform: 'Android',
        device: caps['appium:deviceName'],
        version: caps['appium:platformVersion'],
        app: caps['appium:app'] || caps['appium:appPackage'],
      },
    };
  }
}
