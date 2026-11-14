import path from 'path';
import { fileURLToPath } from 'url';
import { generateWebE2EReport, generateMobileE2EReport } from '../scripts/generateExcelReports.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enterprise Excel Report Generator Utility
 * Automatically generates 4-sheet multi-tab workbooks after test runs.
 */
export class ExcelReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.resolve(__dirname, '../excel');
    this.testResults = [];
  }

  recordTest(result) {
    this.testResults.push(result);
  }

  /**
   * Generates E2E_Report.xlsx and Mobile_E2E_Report.xlsx
   */
  async generateReports() {
    logger.info('Generating enterprise Excel execution reports...');
    try {
      generateWebE2EReport();
      generateMobileE2EReport();
      logger.info('Excel reports successfully generated.');
    } catch (err) {
      logger.error(`Error generating Excel reports: ${err.message}`);
    }
  }
}
