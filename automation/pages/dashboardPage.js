import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';
import { WaitUtils } from '../utilities/waitUtils.js';

/**
 * CognifyAI WebApp Dashboard/Home Page Object Model
 */
export class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/dashboard';

    // Locators
    this.welcomeBanner = By.css('h1, .welcome-header, [data-testid="welcome-banner"]');
    this.personalizedRoadmapSection = By.xpath('//*[contains(text(), "Personalized AI Roadmap") or contains(text(), "Roadmap")]');
    this.viewRoadmapButton = By.xpath('//a[contains(text(), "View") or contains(@href, "/learning-roadmap")]');
    
    // Unified 5-item Bottom Navigation Bar
    this.bottomNav = By.css('nav.fixed.bottom-0, .bottom-nav, [data-testid="bottom-nav"]');
    this.navHome = By.xpath('//nav//a[contains(@href, "/dashboard") or contains(., "Home")]');
    this.navJobs = By.xpath('//nav//a[contains(@href, "/jobs") or contains(., "Jobs")]');
    this.navCourses = By.xpath('//nav//a[contains(@href, "/courses") or contains(., "Courses")]');
    this.navResume = By.xpath('//nav//a[contains(@href, "/resume-analysis") or contains(., "Resume")]');
    this.navSettings = By.xpath('//nav//a[contains(@href, "/profile") or contains(., "Settings")]');

    // Quick Stats & Metrics
    this.statCards = By.css('.stat-card, [data-testid="stat-card"]');
    this.aiAssistantTrigger = By.css('[data-testid="ai-assistant-btn"], button:has-text("AI Assistant")');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async isPersonalizedRoadmapVisible() {
    return await this.isDisplayed(this.personalizedRoadmapSection);
  }

  async clickNav(tabName) {
    const tabs = {
      home: this.navHome,
      jobs: this.navJobs,
      courses: this.navCourses,
      resume: this.navResume,
      settings: this.navSettings,
    };
    const target = tabs[tabName.toLowerCase()];
    if (!target) throw new Error(`Unknown navigation tab: ${tabName}`);
    await this.click(target);
  }
}
