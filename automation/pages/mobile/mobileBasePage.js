import { logger } from '../../utilities/logger.js';
import { GestureUtils } from '../../utilities/gestureUtils.js';

/**
 * Enterprise Mobile Base Page for Appium 2.x
 */
export class MobileBasePage {
  constructor(driver) {
    this.driver = driver;
  }

  async tap(locator) {
    logger.info(`Tapping mobile element: ${JSON.stringify(locator)}`);
    const el = await this.driver.findElement(locator);
    await GestureUtils.tap(this.driver, el);
  }

  async type(locator, text) {
    logger.info(`Sending keys to mobile element: "${text}"`);
    const el = await this.driver.findElement(locator);
    await el.sendKeys(text);
  }

  async getText(locator) {
    const el = await this.driver.findElement(locator);
    return await el.getText();
  }

  async isElementVisible(locator) {
    try {
      const el = await this.driver.findElement(locator);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async swipeUp() {
    await GestureUtils.swipe(this.driver, 'up');
  }

  async swipeDown() {
    await GestureUtils.swipe(this.driver, 'down');
  }
}
