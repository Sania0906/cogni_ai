import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const execLogPath = path.join(logDir, 'execution.log');
const errorLogPath = path.join(logDir, 'error.log');

function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
}

function writeToFile(filePath, content) {
  try {
    fs.appendFileSync(filePath, content, 'utf8');
  } catch {
    // Suppress write errors
  }
}

/**
 * Enterprise Multi-Transport Logger (Zero-Dependency with Winston support)
 */
export const logger = {
  info(message) {
    const formatted = formatLog('INFO', message);
    console.log(`ℹ️ ${message}`);
    writeToFile(execLogPath, formatted);
  },
  warn(message) {
    const formatted = formatLog('WARN', message);
    console.warn(`⚠️ ${message}`);
    writeToFile(execLogPath, formatted);
  },
  error(message, error) {
    const detail = error ? `${message} - ${error.stack || error.message}` : message;
    const formatted = formatLog('ERROR', detail);
    console.error(`❌ ${detail}`);
    writeToFile(execLogPath, formatted);
    writeToFile(errorLogPath, formatted);
  },
  debug(message) {
    const formatted = formatLog('DEBUG', message);
    if (process.env.DEBUG === 'true') {
      console.debug(`🔍 ${message}`);
    }
    writeToFile(execLogPath, formatted);
  },
};
