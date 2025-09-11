#!/usr/bin/env node

/**
 * News Data Validation Script
 * Validates the structure and content of news.json files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NewsValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalItems: 0,
      validItems: 0,
      duplicateIds: 0,
      invalidDates: 0,
      missingFields: 0
    };
  }

  /**
   * Validate a single news item
   * @param {Object} item - News item to validate
   * @param {number} index - Item index in array
   * @returns {boolean} Whether item is valid
   */
  validateItem(item, index) {
    const itemLocation = `Item ${index + 1}`;
    let isValid = true;

    // Check if item is an object
    if (!item || typeof item !== 'object') {
      this.errors.push(`${itemLocation}: Not a valid object`);
      return false;
    }

    // Required fields
    const requiredFields = ['id', 'title', 'url', 'source', 'date', 'summary'];
    for (const field of requiredFields) {
      if (!item[field]) {
        this.errors.push(`${itemLocation}: Missing required field '${field}'`);
        isValid = false;
        this.stats.missingFields++;
      }
    }

    // Validate ID
    if (item.id && (typeof item.id !== 'number' && typeof item.id !== 'string')) {
      this.errors.push(`${itemLocation}: ID must be a number or string`);
      isValid = false;
    }

    // Validate URL
    if (item.url && typeof item.url === 'string') {
      try {
        new URL(item.url);
      } catch {
        this.warnings.push(`${itemLocation}: Invalid URL format: ${item.url}`);
      }
    }

    // Validate date
    if (item.date) {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        this.errors.push(`${itemLocation}: Invalid date format: ${item.date}`);
        isValid = false;
        this.stats.invalidDates++;
      } else {
        // Check if date is reasonable (not too far in future/past)
        const now = new Date();
        const yearDiff = now.getFullYear() - date.getFullYear();
        if (yearDiff > 2 || yearDiff < -1) {
          this.warnings.push(`${itemLocation}: Date seems unusual: ${item.date}`);
        }
      }
    }

    // Validate tags
    if (item.tags && !Array.isArray(item.tags)) {
      this.warnings.push(`${itemLocation}: Tags should be an array`);
    } else if (item.tags) {
      item.tags.forEach((tag, tagIndex) => {
        if (typeof tag !== 'string') {
          this.warnings.push(`${itemLocation}: Tag ${tagIndex + 1} should be a string`);
        }
      });
    }

    // Validate string fields length
    const stringFields = ['title', 'summary', 'source'];
    stringFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        if (item[field].length > 1000) {
          this.warnings.push(`${itemLocation}: ${field} is very long (${item[field].length} chars)`);
        }
        if (item[field].trim() !== item[field]) {
          this.warnings.push(`${itemLocation}: ${field} has leading/trailing whitespace`);
        }
      }
    });

    return isValid;
  }

  /**
   * Check for duplicate IDs
   * @param {Array} items - Array of news items
   */
  checkDuplicates(items) {
    const ids = new Set();
    const duplicates = new Set();

    items.forEach((item, index) => {
      if (item && item.id) {
        if (ids.has(item.id)) {
          duplicates.add(item.id);
          this.errors.push(`Item ${index + 1}: Duplicate ID '${item.id}'`);
          this.stats.duplicateIds++;
        } else {
          ids.add(item.id);
        }
      }
    });

    if (duplicates.size > 0) {
      this.errors.push(`Found ${duplicates.size} unique duplicate IDs: ${Array.from(duplicates).join(', ')}`);
    }
  }

  /**
   * Validate news JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Object} Validation result
   */
  async validateFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.errors.push(`File not found: ${filePath}`);
        return this.getResult();
      }

      // Read and parse JSON
      const content = fs.readFileSync(filePath, 'utf8');
      let data;

      try {
        data = JSON.parse(content);
      } catch (parseError) {
        this.errors.push(`JSON parse error: ${parseError.message}`);
        return this.getResult();
      }

      // Validate root structure
      if (!Array.isArray(data)) {
        this.errors.push('Root element must be an array');
        return this.getResult();
      }

      this.stats.totalItems = data.length;

      // Validate each item
      let validItems = 0;
      data.forEach((item, index) => {
        if (this.validateItem(item, index)) {
          validItems++;
        }
      });

      this.stats.validItems = validItems;

      // Check for duplicates
      this.checkDuplicates(data);

      // Additional checks
      if (data.length === 0) {
        this.warnings.push('File contains no news items');
      }

      if (data.length > 1000) {
        this.warnings.push(`File contains many items (${data.length}), consider archiving older items`);
      }

      return this.getResult();

    } catch (error) {
      this.errors.push(`Validation error: ${error.message}`);
      return this.getResult();
    }
  }

  /**
   * Get validation result
   * @returns {Object} Validation result
   */
  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats
    };
  }

  /**
   * Reset validator state
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalItems: 0,
      validItems: 0,
      duplicateIds: 0,
      invalidDates: 0,
      missingFields: 0
    };
  }
}

/**
 * Main validation function
 */
async function main() {
  const validator = new NewsValidator();

  // Files to validate
  const dataDir = path.join(__dirname, '..', 'data');
  const newsFile = path.join(dataDir, 'news.json');
  const archiveDir = path.join(dataDir, 'archive');

  console.log('🔍 Starting news data validation...\n');

  // Validate main news.json
  console.log('📄 Validating main news file...');
  const mainResult = await validator.validateFile(newsFile);

  console.log(`✅ Main news.json: ${mainResult.valid ? 'VALID' : 'INVALID'}`);
  if (mainResult.stats.totalItems > 0) {
    console.log(`   📊 ${mainResult.stats.validItems}/${mainResult.stats.totalItems} valid items`);
  }

  if (mainResult.errors.length > 0) {
    console.log('   ❌ Errors:');
    mainResult.errors.forEach(error => console.log(`      - ${error}`));
  }

  if (mainResult.warnings.length > 0) {
    console.log('   ⚠️  Warnings:');
    mainResult.warnings.forEach(warning => console.log(`      - ${warning}`));
  }

  // Validate archive files
  const archiveResults = [];
  if (fs.existsSync(archiveDir)) {
    console.log('\n📂 Validating archive files...');

    const archiveFiles = fs.readdirSync(archiveDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json')
      .sort()
      .slice(-5); // Only check last 5 archive files

    for (const file of archiveFiles) {
      validator.reset();
      const filePath = path.join(archiveDir, file);
      const result = await validator.validateFile(filePath);
      archiveResults.push({ file, result });

      const status = result.valid ? '✅' : '❌';
      console.log(`   ${status} ${file}: ${result.stats.validItems}/${result.stats.totalItems} valid items`);

      if (result.errors.length > 0) {
        console.log(`      Errors: ${result.errors.length}`);
      }
      if (result.warnings.length > 0) {
        console.log(`      Warnings: ${result.warnings.length}`);
      }
    }
  }

  // Summary
  console.log('\n📋 Validation Summary:');
  const allValid = mainResult.valid && archiveResults.every(ar => ar.result.valid);
  const totalErrors = mainResult.errors.length + archiveResults.reduce((sum, ar) => sum + ar.result.errors.length, 0);
  const totalWarnings = mainResult.warnings.length + archiveResults.reduce((sum, ar) => sum + ar.result.warnings.length, 0);

  console.log(`   Overall Status: ${allValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Warnings: ${totalWarnings}`);
  console.log(`   Files Checked: ${1 + archiveResults.length}`);

  // Exit with appropriate code
  process.exit(allValid ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { NewsValidator };
