import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Enterprise Framework Configuration Object
 */
export const frameworkConfig = {
  // Web Application Configuration
  web: {
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    browser: (process.env.BROWSER || 'chrome').toLowerCase(),
    headless: process.env.HEADLESS !== 'false',
    windowWidth: 1920,
    windowHeight: 1080,
    timeouts: {
      implicit: parseInt(process.env.IMPLICIT_WAIT_MS || '5000', 10),
      explicit: parseInt(process.env.EXPLICIT_WAIT_MS || '15000', 10),
      pageLoad: parseInt(process.env.PAGE_LOAD_TIMEOUT_MS || '30000', 10),
      scriptTimeout: 15000,
    },
  },

  // Mobile Application Configuration (Appium)
  mobile: {
    appiumHost: process.env.APPIUM_HOST || '127.0.0.1',
    appiumPort: parseInt(process.env.APPIUM_PORT || '4723', 10),
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    platformVersion: process.env.ANDROID_PLATFORM_VERSION || '14.0',
    appPackage: process.env.APP_PACKAGE || 'com.cognifyai.app',
    appActivity: process.env.APP_ACTIVITY || 'com.cognifyai.app.MainActivity',
    apkPath: process.env.APK_PATH || path.resolve(__dirname, '../../MobileApp/app-release.apk'),
    newCommandTimeout: 120,
    autoGrantPermissions: true,
    noReset: false,
  },

  // Reporting & Artifact Paths
  paths: {
    root: path.resolve(__dirname, '..'),
    reports: path.resolve(__dirname, '../reports'),
    failures: path.resolve(__dirname, '../reports/failures'),
    screenshots: path.resolve(__dirname, '../reports/screenshots'),
    logs: path.resolve(__dirname, '../logs'),
    excel: path.resolve(__dirname, '../excel'),
    data: path.resolve(__dirname, '../data'),
  },

  // Run Metadata
  execution: {
    environment: process.env.ENVIRONMENT || 'local',
    retryCount: parseInt(process.env.RETRY_COUNT || '1', 10),
    captureConsoleLogs: process.env.CAPTURE_CONSOLE_LOGS !== 'false',
    generateExcel: process.env.GENERATE_EXCEL_REPORT !== 'false',
  },
};
