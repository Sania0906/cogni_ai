import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import firefox from 'selenium-webdriver/firefox.js';
import edge from 'selenium-webdriver/edge.js';
import { frameworkConfig } from './frameworkConfig.js';
import { logger } from '../utilities/logger.js';

/**
 * Enterprise Selenium Driver Factory
 * Supports cross-browser orchestration: Chrome, Firefox, Microsoft Edge
 * Supports Headed & Headless modes with enterprise security flags
 */
export class SeleniumDriverFactory {
  /**
   * Builds and initializes a WebDriver instance according to configuration.
   * @param {string} [overrideBrowser] Optional browser override (chrome|firefox|edge)
   * @param {boolean} [overrideHeadless] Optional headless flag override
   * @returns {Promise<import('selenium-webdriver').WebDriver>}
   */
  static async createDriver(overrideBrowser, overrideHeadless) {
    const browser = overrideBrowser || frameworkConfig.web.browser;
    const headless = overrideHeadless !== undefined ? overrideHeadless : frameworkConfig.web.headless;

    logger.info(`Initializing Selenium WebDriver: Browser=${browser.toUpperCase()}, Headless=${headless}`);

    let builder = new Builder().forBrowser(browser);

    switch (browser) {
      case 'chrome': {
        const options = new chrome.Options();
        if (headless) {
          options.addArguments('--headless=new');
        }
        options.addArguments(
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          `--window-size=${frameworkConfig.web.windowWidth},${frameworkConfig.web.windowHeight}`,
          '--disable-extensions',
          '--disable-notifications',
          '--ignore-certificate-errors',
          '--allow-insecure-localhost'
        );

        // Capture browser console logs
        options.setLoggingPrefs({
          browser: 'ALL',
          driver: 'WARNING',
          performance: 'ALL',
        });

        builder = builder.setChromeOptions(options);
        break;
      }

      case 'firefox': {
        const options = new firefox.Options();
        if (headless) {
          options.addArguments('-headless');
        }
        options.addArguments(`--width=${frameworkConfig.web.windowWidth}`);
        options.addArguments(`--height=${frameworkConfig.web.windowHeight}`);
        builder = builder.setFirefoxOptions(options);
        break;
      }

      case 'edge': {
        const options = new edge.Options();
        if (headless) {
          options.addArguments('--headless=new');
        }
        options.addArguments(
          '--no-sandbox',
          '--disable-dev-shm-usage',
          `--window-size=${frameworkConfig.web.windowWidth},${frameworkConfig.web.windowHeight}`
        );
        builder = builder.setEdgeOptions(options);
        break;
      }

      default:
        throw new Error(`Unsupported browser: '${browser}'. Supported: chrome, firefox, edge`);
    }

    const driver = await builder.build();

    // Set standard timeouts
    await driver.manage().setTimeouts({
      implicit: frameworkConfig.web.timeouts.implicit,
      pageLoad: frameworkConfig.web.timeouts.pageLoad,
      script: frameworkConfig.web.timeouts.scriptTimeout,
    });

    // Maximize window if not headless
    if (!headless) {
      await driver.manage().window().maximize();
    }

    logger.info(`Driver successfully initialized for ${browser}`);
    return driver;
  }
}
