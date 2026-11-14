import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';

/**
 * CognifyAI WebApp Jobs Page Object Model
 */
export class JobsPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/jobs';

    // Locators
    this.searchInput = By.css('input[placeholder*="Search"], input[type="search"]');
    this.jobCards = By.css('.job-card, [data-testid="job-card"], div.rounded-3xl.p-5');
    this.bookmarkButtons = By.css('button[aria-label*="Bookmark"], button[aria-label*="Save"], button:has(svg.lucide-bookmark)');
    this.applyButtons = By.xpath('//button[contains(text(), "Apply") or contains(text(), "View Details")]');
    this.savedJobsLink = By.css('a[href*="saved-jobs"]');
    this.locationFilter = By.css('select[name="location"], input[placeholder*="Location"]');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async searchJob(keyword) {
    await this.type(this.searchInput, keyword);
  }

  async getJobCount() {
    try {
      const cards = await this.driver.findElements(this.jobCards);
      return cards.length;
    } catch {
      return 0;
    }
  }
}
