import { expect } from 'chai';
import { BaseTestSetup } from '../baseTest.js';
import { SignupPage } from '../../pages/signupPage.js';
import { DynamicFormValidator } from '../../utilities/dynamicFormValidator.js';
import formRules from '../../data/formValidationRules.json' assert { type: 'json' };
import testData from '../../data/testData.json' assert { type: 'json' };

describe('CognifyAI React E2E — Form Validation Test Suite', function () {
  this.timeout(60000);
  const baseSetup = new BaseTestSetup();
  let driver;
  let signupPage;

  before(async function () {
    driver = await baseSetup.init();
    signupPage = new SignupPage(driver);
  });

  afterEach(async function () {
    await baseSetup.handleTestResult(this);
  });

  after(async function () {
    await baseSetup.teardown();
  });

  it('TC_FORM_01: Should enforce required fields across user registration form', async function () {
    const result = DynamicFormValidator.validate({}, formRules.signupForm);
    expect(result.isValid).to.be.false;
    expect(result.errors).to.have.property('name');
    expect(result.errors).to.have.property('email');
    expect(result.errors).to.have.property('password');
  });

  it('TC_FORM_02: Should validate email format and reject malformed syntax', async function () {
    for (const invalidEmail of testData.formValidation.invalidEmails) {
      const result = DynamicFormValidator.validate({ email: invalidEmail }, formRules.signupForm);
      expect(result.errors.email).to.be.an('array');
    }
  });

  it('TC_FORM_03: Should enforce password complexity standards', async function () {
    for (const weakPass of testData.formValidation.weakPasswords) {
      const result = DynamicFormValidator.validate({ password: weakPass }, formRules.signupForm);
      expect(result.errors.password).to.be.an('array');
    }
  });

  it('TC_FORM_04: Should validate minimum character length on text fields', async function () {
    const result = DynamicFormValidator.validate({ name: 'A' }, formRules.signupForm);
    expect(result.errors.name).to.be.an('array');
  });

  it('TC_FORM_05: Should accept valid form payload meeting all enterprise schema rules', async function () {
    const validPayload = {
      name: testData.authentication.validUser.name,
      email: testData.authentication.validUser.email,
      password: testData.authentication.validUser.password,
      role: 'user',
    };
    const result = DynamicFormValidator.validate(validPayload, formRules.signupForm);
    expect(result.isValid).to.be.true;
    expect(Object.keys(result.errors)).to.have.lengthOf(0);
  });
});
