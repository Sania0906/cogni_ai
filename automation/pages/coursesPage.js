import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';

/**
 * CognifyAI WebApp Courses Page Object Model
 */
export class CoursesPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/courses';

    // Locators
    this.searchInput = By.css('input[placeholder*="Search courses"], input[type="search"]');
    this.courseCards = By.css('.course-card, [data-testid="course-card"], a[href^="/course/"]');
    this.enrollButtons = By.xpath('//button[contains(text(), "Enroll") or contains(text(), "Continue")]');
    this.categoryPills = By.css('[data-category-filter], .category-pill');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async searchCourse(keyword) {
    await this.type(this.searchInput, keyword);
  }

  async getCourseCardsCount() {
    const cards = await this.driver.findElements(this.courseCards);
    return cards.length;
  }
}
