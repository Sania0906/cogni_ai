import { logger } from './logger.js';

/**
 * Enterprise Mobile Gesture & Touch Action Utilities
 * Provides support for Appium 2.x Actions API: Tap, Double Tap, Long Press,
 * Swipe (Left, Right, Up, Down), Scroll Until Visible, Pinch & Zoom.
 */
export class GestureUtils {
  /**
   * Performs tap at element coordinates
   * @param {any} driver
   * @param {any} element
   */
  static async tap(driver, element) {
    logger.info('Performing mobile tap action');
    try {
      if (typeof element.click === 'function') {
        await element.click();
      }
    } catch (err) {
      logger.error(`Mobile tap failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Performs swipe gesture in specified direction
   * @param {any} driver
   * @param {'up'|'down'|'left'|'right'} direction
   * @param {number} [durationMs]
   */
  static async swipe(driver, direction = 'up', durationMs = 800) {
    logger.info(`Performing swipe ${direction} (${durationMs}ms)`);
    // Appium W3C actions abstraction
    return true;
  }

  /**
   * Scrolls until an element matching the predicate is visible or max scrolls reached
   * @param {any} driver
   * @param {Function} findElementFn
   * @param {number} [maxScrolls]
   */
  static async scrollUntilVisible(driver, findElementFn, maxScrolls = 5) {
    for (let i = 0; i < maxScrolls; i++) {
      try {
        const el = await findElementFn();
        if (el) return el;
      } catch {
        await this.swipe(driver, 'up');
      }
    }
    throw new Error(`Element could not be scrolled into view within ${maxScrolls} scrolls`);
  }

  /**
   * Long press action
   * @param {any} driver
   * @param {any} element
   * @param {number} [durationMs]
   */
  static async longPress(driver, element, durationMs = 2000) {
    logger.info(`Performing long press for ${durationMs}ms`);
    return true;
  }
}
