import { By } from 'selenium-webdriver';
import { BasePage } from './basePage.js';

/**
 * CognifyAI WebApp Settings & Profile Page Object Model
 */
export class SettingsPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.route = '/profile';

    // Locators
    this.userAccountCard = By.css('.user-account-card, [data-testid="user-account-card"], div.rounded-3xl.p-6');
    this.userName = By.css('h2.font-extrabold, [data-testid="user-name"]');
    this.userEmail = By.css('p.text-muted-foreground, [data-testid="user-email"]');
    
    // Dynamic Stats
    this.certCount = By.xpath('//*[contains(text(), "Certificates")]/preceding-sibling::* | //*[contains(text(), "Certificates")]/parent::*');
    this.courseCount = By.xpath('//*[contains(text(), "Courses")]/preceding-sibling::* | //*[contains(text(), "Courses")]/parent::*');
    this.skillsCount = By.xpath('//*[contains(text(), "Skills")]/preceding-sibling::* | //*[contains(text(), "Skills")]/parent::*');
    
    // Navigation / Actions
    this.editProfileButton = By.xpath('//button[contains(., "Edit Profile")]');
    this.savedBookmarksButton = By.css('a[href*="saved-jobs"]');
    this.signOutButton = By.xpath('//button[contains(., "Sign Out")]');
    
    // Edit Modal
    this.modalContainer = By.css('.fixed.inset-0, [role="dialog"]');
    this.editNameInput = By.css('input#edit-name, input[name="name"]');
    this.editPhoneInput = By.css('input#edit-phone, input[name="phone"]');
    this.saveProfileButton = By.xpath('//button[contains(., "Save Changes") or contains(., "Save")]');
    this.closeModalButton = By.css('button[aria-label="Close"], button:has(svg.lucide-x)');
  }

  async open() {
    await this.navigateTo(this.route);
  }

  async openEditModal() {
    await this.click(this.editProfileButton);
  }

  async isEditModalOpen() {
    return await this.isDisplayed(this.modalContainer);
  }

  async signOut() {
    await this.click(this.signOutButton);
  }
}
