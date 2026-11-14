import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';
import { WaitUtils } from '../utilities/waitUtils.js';

/**
 * CognifyAI WebApp Login Page Object Model
 */
export class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/login';

    // Locators
    this.emailInput = By.css('input[type="email"], input[name="email"], input#email');
    this.passwordInput = By.css('input[type="password"], input[name="password"], input#password');
    this.loginButton = By.css('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    this.errorMessage = By.css('[role="alert"], .text-destructive, .error-message, .sonner-toast[data-type="error"]');
    this.toastNotification = By.css('[data-sonner-toast]');
    this.signupLink = By.css('a[href*="signup"], a:has-text("Sign up"), a:has-text("Register")');
    this.forgotPasswordLink = By.css('a[href*="forgot-password"]');
    this.roleSwitchers = By.css('[data-role-switch], button:has-text("Organization"), button:has-text("Student")');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async login(email, password) {
    if (email !== undefined && email !== null) {
      await this.type(this.emailInput, email);
    }
    if (password !== undefined && password !== null) {
      await this.type(this.passwordInput, password);
    }
    await this.click(this.loginButton);
  }

  async getErrorMessage() {
    try {
      return await this.getText(this.errorMessage);
    } catch {
      return '';
    }
  }

  async isLoginButtonEnabled() {
    try {
      const el = await this.driver.findElement(this.loginButton);
      return await el.isEnabled();
    } catch {
      return false;
    }
  }
}
