# CognifyAI Enterprise E2E Test Automation Framework

An enterprise-grade, scalable End-to-End (E2E) Test Automation Framework designed for the **CognifyAI React Web Application** and **Android Mobile Application** using **Selenium WebDriver**, **Appium 2.x**, **Node.js**, **Mocha**, **Chai**, **ExcelJS**, and **GitHub Actions**.

---

## 🏗️ Architecture Overview

The framework follows the industry-standard **Page Object Model (POM)** combined with a **Reusable Utility Layer** and **Config-Driven Orchestration**:

```text
cognifyai/automation/
├── config/                  # Cross-browser WebDriver & Appium 2.x driver factories, environments
├── pages/                   # Page Object Model (POM) representations for React Web & Mobile screens
│   ├── basePage.js          # Core Selenium explicit waits, JS execution, scrolling, actions
│   ├── loginPage.js         # Authentication page objects & assertions
│   ├── signupPage.js        # User registration form validation objects
│   ├── dashboardPage.js     # Home dashboard & 5-tab unified bottom navigation
│   ├── jobsPage.js          # Jobs directory & bookmarking
│   ├── coursesPage.js       # Courses catalog & enrollment
│   ├── resumePage.js        # Dedicated Resume Analysis & ATS score evaluation
│   ├── settingsPage.js      # User account card, profile edit modal, dynamic counters
│   └── mobile/              # Mobile Appium screen objects (Home, Jobs, Courses, Resume, Settings)
├── utilities/               # Reusable helper utilities
│   ├── logger.js            # Winston logger with formatted file & console transports
│   ├── excelReporter.js     # Multi-sheet ExcelJS report generator
│   ├── screenshotUtil.js    # Automatic screenshot & browser console log capturer on failure
│   ├── waitUtils.js         # Explicit wait & polling retry mechanisms
│   ├── gestureUtils.js      # Mobile touch actions, swipes, and scrolls for Appium
│   └── dynamicFormValidator.js # Smart AI validation utility checking schema boundary rules
├── tests/                   # Executable Mocha E2E test suites
│   ├── baseTest.js          # Driver initialization, screenshot hooks & lifecycle fixtures
│   ├── e2e/                 # Web E2E test specs (auth, formValidation, uiComponents, navigation)
│   └── mobile/              # Android mobile E2E test specs
├── data/                    # Test datasets & form validation boundary rules (JSON)
├── excel/                   # Generated 4-sheet Excel execution reports (E2E_Report.xlsx)
├── reports/                 # Mochawesome HTML dashboards & failure screenshots
├── logs/                    # Execution & error logs (Winston)
└── .github/workflows/       # Automated CI/CD execution workflows for GitHub Actions
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Language** | JavaScript (ES6+ / Node.js) | High performance test execution |
| **Web Engine** | Selenium WebDriver 4.x | Browser automation (Chrome, Firefox, Edge) |
| **Mobile Engine** | Appium 2.x + UiAutomator2 | Android real device & emulator automation |
| **Test Runner** | Mocha | BDD test runner with retry & lifecycle hooks |
| **Assertions** | Chai | Fluent BDD/TDD assertions |
| **Reporting** | ExcelJS & Mochawesome | Automated 4-sheet Excel spreadsheets & HTML charts |
| **Logging** | Winston | Multi-transport log management (Console & File) |
| **CI/CD** | GitHub Actions | Automated regression testing on every Push & PR |

---

## 📊 Automated 4-Sheet Excel Report Specification

The framework automatically generates `excel/E2E_Report.xlsx` and `excel/Mobile_E2E_Report.xlsx` after every test execution with full color-coded styles and mathematical summaries:

### Sheet 1: Summary
- **Execution Date:** Execution run timestamp.
- **Environment:** Environment profile (Local, Staging, Production).
- **Total Tests:** Aggregate count of executed scenarios.
- **Passed / Failed / Skipped:** Pass/Fail breakdown.
- **Pass Percentage:** Formatted pass rate (e.g. `100.0%`).
- **Execution Duration:** Total elapsed execution duration.

### Sheet 2: Test Cases
- Detailed per-test row containing `Test ID`, `Module`, `Scenario Name`, `Browser/Device`, `Status` (Green `PASSED`), `Start Time`, `End Time`, and `Duration`.

### Sheet 3: Failed Tests
- Records any test failures with `Test Name`, `Failure Reason`, `Screenshot Path`, `Browser`, and `URL`. If all tests pass, provides clean verification confirmation.

### Sheet 4: Execution Logs
- Comprehensive step-by-step audit trail containing `Timestamp`, `Test Name`, `Step Description`, `Result`, and `Remarks`.

---

## 🚀 Quick Start & Execution

### 1. Prerequisites
- Node.js v18+ or v20+
- Google Chrome, Firefox, or Microsoft Edge
- CognifyAI WebApp running on `http://localhost:5173` (or configured via `.env`)

### 2. Installation
```bash
cd automation
npm install
```

### 3. Running Web Tests
```bash
# Run all E2E tests in Headless Chrome
npm test

# Run in Chrome with visible browser window (Headed mode)
npm run test:chrome:headed

# Cross-Browser Execution
npm run test:firefox
npm run test:edge

# Specific Module Tests
npm run test:auth
npm run test:forms
npm run test:ui
npm run test:navigation
```

### 4. Running Mobile Tests
```bash
# Run Android Appium suite
npm run test:mobile
```

### 5. Generate Excel Reports
```bash
npm run report:excel
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

The framework is fully integrated into GitHub Actions:
- `.github/workflows/selenium-e2e.yml`: Runs cross-browser tests on Ubuntu runners, starts backend/frontend services, generates Excel and HTML reports, and uploads artifacts.
- `.github/workflows/appium-e2e.yml`: Spins up macOS hardware-accelerated Android emulators (API 34 / Pixel 7 Pro), executes mobile tests, and archives artifacts.

---

## 🔒 Security & Quality Standards
- Zero hardcoded passwords or authentication tokens in repository files.
- Resilient explicit waits preventing flakiness.
- Automated failure screenshot capture with browser console log extraction.
- Fully compatible with CognifyAI 5-tab unified navigation and light purple/white design system.
