#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALE_FILE_PATH = path.join(__dirname, '..', 'src/renderer/shared/i18n/locales/en.json');
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
  const keyUsage = new Map();
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
      const relativePath = path.relative(process.cwd(), file);
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
            if (!keyUsage.has(key)) {
              keyUsage.set(key, []);
            }
            keyUsage.get(key).push(relativePath);
          }
        }
      }
    } catch (error) {
      log(`Error reading file ${file}: ${error.message}`, 'yellow');
    }
  }
  return { usedKeys, keyUsage };
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

function keyExistsInLocale(key, localeData) {
  const parts = key.split('.');
  let current = localeData;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  return true;
}

function getKeyValue(key, localeData) {
  const parts = key.split('.');
  let current = localeData;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

function main() {
  logBold('🔍 Checking i18n keys...', 'cyan');
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
  const { usedKeys, keyUsage } = extractKeysFromSource(sourceFiles);
  log(`🔍 Found ${usedKeys.size} unique keys used in source code`, 'blue');
  const missingKeys = [];
  for (const key of usedKeys) {
    if (!keyExistsInLocale(key, localeData)) {
      missingKeys.push(key);
    }
  }
  const unusedKeys = [];
  for (const key of localeKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }
  console.log('\n' + '='.repeat(80));
  logBold('📋 i18n Keys Analysis Report', 'cyan');
  console.log('='.repeat(80));
  if (missingKeys.length > 0) {
    console.log('\n');
    logBold(`❌ Missing Keys (${missingKeys.length})`, 'red');
    log('These keys are used in the code but not defined in the locale file:', 'red');
    missingKeys.sort().forEach((key) => {
      const usage = keyUsage.get(key) || [];
      log(`  • ${key}`, 'red');
      if (usage.length > 0) {
        log(
          `    Used in: ${usage.slice(0, 3).join(', ')}${usage.length > 3 ? ` and ${usage.length - 3} more...` : ''}`,
          'red',
        );
      }
    });
  } else {
    console.log('\n');
    logBold('✅ No missing keys found!', 'green');
  }
  if (unusedKeys.length > 0) {
    console.log('\n');
    logBold(`⚠️  Unused Keys (${unusedKeys.length})`, 'yellow');
    log('These keys are defined in the locale file but not used in the code:', 'yellow');
    const groupedUnused = {};
    unusedKeys.forEach((key) => {
      const firstPart = key.split('.')[0];
      if (!groupedUnused[firstPart]) {
        groupedUnused[firstPart] = [];
      }
      groupedUnused[firstPart].push(key);
    });
    Object.entries(groupedUnused).forEach(([group, keys]) => {
      log(`\n  ${group}:`, 'yellow');
      keys.sort().forEach((key) => {
        const value = getKeyValue(key, localeData);
        const preview = typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value;
        log(`    • ${key}`, 'yellow');
        if (preview) {
          log(`      Value: "${preview}"`, 'yellow');
        }
      });
    });
  } else {
    console.log('\n');
    logBold('✅ No unused keys found!', 'green');
  }
  console.log('\n' + '='.repeat(80));
  logBold('📊 Summary', 'cyan');
  console.log('='.repeat(80));
  log(`Total keys in locale file: ${localeKeys.length}`, 'blue');
  log(`Total keys used in code: ${usedKeys.size}`, 'blue');
  log(`Missing keys: ${missingKeys.length}`, missingKeys.length > 0 ? 'red' : 'green');
  log(`Unused keys: ${unusedKeys.length}`, unusedKeys.length > 0 ? 'yellow' : 'green');
  const coverage = ((usedKeys.size / localeKeys.length) * 100).toFixed(1);
  log(`Coverage: ${coverage}%`, coverage > 90 ? 'green' : 'yellow');
  if (missingKeys.length > 0) {
    log('\n❌ Found missing keys. Please add them to the locale file.', 'red');
    process.exit(1);
  } else {
    log('\n✅ All translation keys are properly defined!', 'green');
  }
}

main();
