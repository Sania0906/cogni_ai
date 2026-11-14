import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';

/**
 * CognifyAI WebApp Registration Page Object Model
 */
export class SignupPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/signup';

    // Locators
    this.nameInput = By.css('input[name="name"], input#name, input[placeholder*="Name"]');
    this.emailInput = By.css('input[type="email"], input[name="email"], input#email');
    this.passwordInput = By.css('input[type="password"][name="password"], input#password');
    this.confirmPasswordInput = By.css('input[name="confirmPassword"], input#confirmPassword');
    this.roleSelect = By.css('select[name="role"], [role="combobox"]');
    this.submitButton = By.css('button[type="submit"]');
    this.loginLink = By.css('a[href*="login"]');
    this.validationErrors = By.css('.text-destructive, .error-feedback, [aria-invalid="true"]');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async fillSignupForm({ name, email, password, confirmPassword, role = 'user' }) {
    if (name !== undefined) await this.type(this.nameInput, name);
    if (email !== undefined) await this.type(this.emailInput, email);
    if (password !== undefined) await this.type(this.passwordInput, password);
    if (confirmPassword !== undefined && (await this.isDisplayed(this.confirmPasswordInput))) {
      await this.type(this.confirmPasswordInput, confirmPassword);
    }
  }

  async submit() {
    await this.click(this.submitButton);
  }
}
