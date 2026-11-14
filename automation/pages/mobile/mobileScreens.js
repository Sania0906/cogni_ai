import { MobileBasePage } from './mobileBasePage.js';

/**
 * Mobile Appium Screen Objects for CognifyAI Android Mobile Application
 */
export class MobileLoginScreen extends MobileBasePage {
  constructor(driver) {
    super(driver);
    this.emailInput = { accessibilityId: 'login-email-input' };
    this.passwordInput = { accessibilityId: 'login-password-input' };
    this.loginBtn = { accessibilityId: 'login-submit-btn' };
    this.errorMessage = { accessibilityId: 'login-error-text' };
  }

  async login(email, password) {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.tap(this.loginBtn);
  }
}

export class MobileHomeScreen extends MobileBasePage {
  constructor(driver) {
    super(driver);
    this.headerTitle = { accessibilityId: 'dashboard-header-title' };
    this.aiAssistantBtn = { accessibilityId: 'home-ai-assistant-btn' };
    this.roadmapCard = { accessibilityId: 'home-roadmap-card' };
  }

  async openAiAssistant() {
    await this.tap(this.aiAssistantBtn);
  }
}

export class MobileSettingsScreen extends MobileBasePage {
  constructor(driver) {
    super(driver);
    this.userAccountCard = { accessibilityId: 'settings-user-card' };
    this.certCountText = { accessibilityId: 'settings-count-certificates' };
    this.courseCountText = { accessibilityId: 'settings-count-courses' };
    this.skillsCountText = { accessibilityId: 'settings-count-skills' };
    this.savedJobsBtn = { accessibilityId: 'settings-saved-jobs-btn' };
    this.signOutBtn = { accessibilityId: 'settings-signout-btn' };
  }
}
