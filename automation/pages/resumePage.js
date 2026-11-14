import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';

/**
 * CognifyAI WebApp Resume Analysis Page Object Model
 */
export class ResumePage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/resume-analysis';

    // Locators
    this.uploadInput = By.css('input[type="file"]');
    this.uploadZone = By.css('.dropzone, [data-testid="upload-zone"], label:has(input[type="file"])');
    this.targetRoleInput = By.css('input[name="targetRole"], input[placeholder*="Role"]');
    this.analyzeButton = By.xpath('//button[contains(text(), "Analyze") or contains(text(), "Check ATS")]');
    this.atsScoreDisplay = By.css('.ats-score, [data-testid="ats-score"], .text-5xl, .text-4xl');
    this.skillMatchBreakdown = By.css('.skills-breakdown, [data-testid="skill-breakdown"]');
    this.historyList = By.css('.history-item, [data-testid="resume-history-item"]');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async uploadResumeFile(filePath, targetRole = 'Software Engineer') {
    if (await this.isDisplayed(this.targetRoleInput)) {
      await this.type(this.targetRoleInput, targetRole);
    }
    const fileInput = await this.driver.findElement(this.uploadInput);
    await fileInput.sendKeys(filePath);
  }
}
