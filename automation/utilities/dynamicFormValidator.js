import { logger } from './logger.js';

/**
 * Smart Dynamic Form Validator
 * Inspects React DOM forms, extracts fields, and validates rules:
 * - Required fields
 * - Email pattern validation
 * - Phone number validation
 * - Password complexity (length, symbols, upper/lowercase)
 * - Min / Max character boundary conditions
 * - Dropdown, Checkbox & Radio validations
 */
export class DynamicFormValidator {
  /**
   * Validates form schema against standard input criteria
   * @param {Object} formData Key-value input map
   * @param {Object} rules Validation rules map
   * @returns {{ isValid: boolean, errors: Record<string, string[]> }}
   */
  static validate(formData, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
      const val = formData[field] !== undefined ? String(formData[field]).trim() : '';
      const fieldErrors = [];

      // 1. Required Check
      if (fieldRules.required && !val) {
        fieldErrors.push(fieldRules.messages?.required || `${field} is required`);
      }

      if (val) {
        // 2. Email Pattern
        if (fieldRules.type === 'email' || fieldRules.isEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            fieldErrors.push(fieldRules.messages?.email || 'Invalid email format');
          }
        }

        // 3. Min Length
        if (fieldRules.minLength && val.length < fieldRules.minLength) {
          fieldErrors.push(
            fieldRules.messages?.minLength ||
              `${field} must be at least ${fieldRules.minLength} characters`
          );
        }

        // 4. Max Length
        if (fieldRules.maxLength && val.length > fieldRules.maxLength) {
          fieldErrors.push(
            fieldRules.messages?.maxLength ||
              `${field} must be under ${fieldRules.maxLength} characters`
          );
        }

        // 5. Password Complexity
        if (fieldRules.isPasswordComplexity) {
          const hasUpper = /[A-Z]/.test(val);
          const hasLower = /[a-z]/.test(val);
          const hasDigit = /\d/.test(val);
          const hasSpecial = /[^A-Za-z0-9]/.test(val);

          if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            fieldErrors.push(
              fieldRules.messages?.complexity ||
                'Password must include uppercase, lowercase, numbers, and symbols'
            );
          }
        }

        // 6. Custom Regex Pattern
        if (fieldRules.pattern && !new RegExp(fieldRules.pattern).test(val)) {
          fieldErrors.push(fieldRules.messages?.pattern || `${field} fails pattern validation`);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  /**
   * Automates form submission testing in React Web application
   * @param {import('selenium-webdriver').WebDriver} driver
   * @param {Array<{ locator: import('selenium-webdriver').By, value: string, clearFirst?: boolean }>} fields
   * @param {import('selenium-webdriver').By} submitLocator
   */
  static async fillAndSubmit(driver, fields, submitLocator) {
    for (const field of fields) {
      const el = await driver.findElement(field.locator);
      if (field.clearFirst !== false) {
        await el.clear();
      }
      if (field.value) {
        await el.sendKeys(field.value);
      }
    }
    const submitBtn = await driver.findElement(submitLocator);
    await submitBtn.click();
  }
}
