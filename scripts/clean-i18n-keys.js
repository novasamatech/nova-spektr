#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALE_FILE_PATH = path.join(__dirname, '..', 'src/renderer/shared/i18n/locales/en.json');
const CLEANED_LOCALE_FILE_PATH = path.join(__dirname, '..', 'src/renderer/shared/i18n/locales/en.cleaned.json');
const SRC_DIR = path.join(__dirname, '..', 'src/renderer');
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '__tests__', 'test-results'];

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBold(message, color = 'reset') {
  console.log(`${colors[color]}${colors.bold}${message}${colors.reset}`);
}

function extractKeys(obj, prefix = '', keys = []) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractKeys(value, fullKey, keys);
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function findSourceFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const relativePath = path.relative(SRC_DIR, fullPath);
      if (!EXCLUDE_DIRS.some((exclude) => relativePath.includes(exclude))) {
        findSourceFiles(fullPath, files);
      }
    } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractKeysFromSource(files) {
  const usedKeys = new Set();
  const keyPatterns = [
    {
      pattern: /t\(['"`]([^'"`]+)['"`]/g,
      description: 't() function calls',
    },
    {
      pattern: /t\(`([^`]+)`/g,
      description: 't() template literals',
    },
    {
      pattern: /<Trans[^>]*i18nKey=["'`]([^"'`]+)["'`]/g,
      description: 'Trans component i18nKey',
    },
    {
      pattern: /<Trans[^>]*t=\{t\}[^>]*i18nKey=["'`]([^"'`]+)["'`]/g,
      description: 'Trans component with t function',
    },
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const { pattern, description } of keyPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          if (
            key &&
            !key.includes('${') &&
            !key.includes('$') &&
            !key.includes('\\') &&
            key.match(/^[a-zA-Z][a-zA-Z0-9._-]*$/) &&
            key.length > 1 &&
            !isTestString(key) &&
            !isSimpleVariable(key)
          ) {
            usedKeys.add(key);
          }
        }
      }
    } catch (error) {
      log(`Error reading file ${file}: ${error.message}`, 'yellow');
    }
  }
  return { usedKeys };
}

function isTestString(key) {
  const testStrings = [
    'children',
    'EN',
    'English',
    'Subtitle',
    'Disabled',
    'closed',
    'opened',
    'div',
    'canvas',
    'tupleMap',
    'metadataReceived',
    'status',
    'index',
    'generalActions',
    'socialLinks',
    'version',
    'id',
  ];
  return testStrings.includes(key);
}

function isSimpleVariable(key) {
  const simpleVars = [
    'assetId',
    'chainId',
    'canvas',
    'status',
    'index',
    'id',
    'div',
    'children',
    'closed',
    'opened',
    'tupleMap',
    'metadataReceived',
  ];
  if (simpleVars.includes(key)) return true;
  if (!key.includes('.') && key.length < 10 && key.match(/^[a-z][a-zA-Z0-9]*$/)) {
    return true;
  }
  return false;
}

function removeUnusedKeys(localeData, unusedKeys) {
  const cleanedData = JSON.parse(JSON.stringify(localeData));
  for (const key of unusedKeys) {
    const parts = key.split('.');
    let current = cleanedData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current && typeof current === 'object' && parts[i] in current) {
        current = current[parts[i]];
      } else {
        break;
      }
    }
    if (current && typeof current === 'object' && parts[parts.length - 1] in current) {
      delete current[parts[parts.length - 1]];
    }
  }
  return cleanedData;
}

function cleanupEmptyObjects(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  const cleaned = {};
  let hasKeys = false;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const cleanedValue = cleanupEmptyObjects(value);
      if (cleanedValue !== null && Object.keys(cleanedValue).length > 0) {
        cleaned[key] = cleanedValue;
        hasKeys = true;
      }
    } else {
      cleaned[key] = value;
      hasKeys = true;
    }
  }
  return hasKeys ? cleaned : null;
}

async function main() {
  logBold('🧹 Cleaning i18n keys...', 'cyan');
  if (!fs.existsSync(LOCALE_FILE_PATH)) {
    log(`❌ Locale file not found: ${LOCALE_FILE_PATH}`, 'red');
    process.exit(1);
  }
  let localeData;
  try {
    const localeContent = fs.readFileSync(LOCALE_FILE_PATH, 'utf8');
    localeData = JSON.parse(localeContent);
  } catch (error) {
    log(`❌ Error parsing locale file: ${error.message}`, 'red');
    process.exit(1);
  }
  const localeKeys = extractKeys(localeData);
  log(`📊 Found ${localeKeys.length} keys in locale file`, 'blue');
  const sourceFiles = findSourceFiles(SRC_DIR);
  log(`📁 Found ${sourceFiles.length} source files`, 'blue');
  const { usedKeys } = extractKeysFromSource(sourceFiles);
  log(`🔍 Found ${usedKeys.size} unique keys used in source code`, 'blue');
  const unusedKeys = [];
  for (const key of localeKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }
  if (unusedKeys.length === 0) {
    log('✅ No unused keys found. Nothing to clean!', 'green');
    return;
  }
  log(`Found ${unusedKeys.length} unused keys to remove`, 'yellow');
  const cleanedData = removeUnusedKeys(localeData, unusedKeys);
  const finalCleanedData = cleanupEmptyObjects(cleanedData);
  try {
    const cleanedContent = JSON.stringify(finalCleanedData, null, 2);
    fs.writeFileSync(CLEANED_LOCALE_FILE_PATH, cleanedContent, 'utf8');
    log(`✅ Cleaned locale file saved to: ${CLEANED_LOCALE_FILE_PATH}`, 'green');
    log(`📊 Removed ${unusedKeys.length} unused keys`, 'blue');
    if (unusedKeys.length > 0) {
      log('\n📋 Examples of removed keys:', 'cyan');
      unusedKeys.slice(0, 10).forEach((key) => {
        log(`  • ${key}`, 'yellow');
      });
      if (unusedKeys.length > 10) {
        log(`  ... and ${unusedKeys.length - 10} more`, 'yellow');
      }
    }
    log('\n💡 To apply the changes:', 'cyan');
    log(`1. Review the cleaned file: ${CLEANED_LOCALE_FILE_PATH}`, 'cyan');
    log('2. If satisfied, replace the original file:', 'cyan');
    log(`   cp ${CLEANED_LOCALE_FILE_PATH} ${LOCALE_FILE_PATH}`, 'cyan');
  } catch (error) {
    log(`❌ Error writing cleaned file: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`❌ Script error: ${error.message}`, 'red');
  process.exit(1);
});
