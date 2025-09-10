#!/usr/bin/env node
// Data validation script for news.json schema

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Expected schema for news items
const requiredFields = ['id', 'title', 'url', 'source', 'date', 'summary', 'tags'];

// Validation rules
const validationRules = {
  id: (value) => typeof value === 'number' || typeof value === 'string',
  title: (value) => typeof value === 'string' && value.length > 0,
  url: (value) => typeof value === 'string' && (value.startsWith('http') || value === ''),
  source: (value) => typeof value === 'string' && value.length > 0,
  date: (value) => {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  summary: (value) => typeof value === 'string', // Can be empty
  tags: (value) => Array.isArray(value) && value.every(tag => typeof tag === 'string')
};

// Forbidden words/phrases that should not appear in news content
const forbiddenWords = [
  'test', 'example', 'placeholder', 'lorem ipsum', 'fake news',
  'sample data', 'dummy content', 'todo', 'fixme', 'xxx'
];

function validateNewsItem(item) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in item)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    const validator = validationRules[field];
    if (validator && !validator(item[field])) {
      errors.push(`Invalid ${field}: ${typeof item[field]} "${item[field]}"`);
    }
  }

  // Check optional zh fields if present
  if (item.zh) {
    if (typeof item.zh !== 'object') {
      errors.push('zh field must be an object');
    } else {
      if (item.zh.title && typeof item.zh.title !== 'string') {
        errors.push('zh.title must be a string');
      }
      if (item.zh.summary && typeof item.zh.summary !== 'string') {
        errors.push('zh.summary must be a string');
      }
      if (item.zh.tags && !Array.isArray(item.zh.tags)) {
        errors.push('zh.tags must be an array');
      }
    }
  }

  // Check for forbidden content
  const textContent = [
    item.title,
    item.summary,
    item.source,
    ...(item.tags || [])
  ].join(' ').toLowerCase();

  for (const forbidden of forbiddenWords) {
    if (textContent.includes(forbidden.toLowerCase())) {
      warnings.push(`Contains forbidden word/phrase: "${forbidden}"`);
    }
  }

  // Check for duplicate IDs (will be handled at collection level)
  
  // Check date recency (warn if older than 120 days)
  if (item.date && validationRules.date(item.date)) {
    const itemDate = new Date(item.date);
    const daysSinceDate = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDate > 120) {
      warnings.push(`Item is ${Math.round(daysSinceDate)} days old`);
    }
  }

  // Check title length (warn if too short or too long)
  if (item.title) {
    if (item.title.length < 10) {
      warnings.push('Title is very short (< 10 characters)');
    }
    if (item.title.length > 200) {
      warnings.push('Title is very long (> 200 characters)');
    }
  }

  // Check tag count and quality
  if (item.tags) {
    if (item.tags.length === 0) {
      warnings.push('No tags specified');
    }
    if (item.tags.length > 10) {
      warnings.push(`Too many tags (${item.tags.length})`);
    }
    
    // Check for very short tags
    const shortTags = item.tags.filter(tag => tag.length < 2);
    if (shortTags.length > 0) {
      warnings.push(`Very short tags: ${shortTags.join(', ')}`);
    }
  }

  return { errors, warnings };
}

function validateNewsData(data) {
  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: ['Root data must be an array'],
      warnings: [],
      stats: null
    };
  }

  const allErrors = [];
  const allWarnings = [];
  const duplicateIds = new Set();
  const seenIds = new Set();
  
  // Collect statistics
  const stats = {
    totalItems: data.length,
    itemsWithZh: 0,
    sourceCounts: {},
    dateRange: { earliest: null, latest: null },
    tagCounts: {},
    avgTitleLength: 0,
    avgSummaryLength: 0
  };

  let totalTitleLength = 0;
  let totalSummaryLength = 0;

  data.forEach((item, index) => {
    const { errors, warnings } = validateNewsItem(item);
    
    if (errors.length > 0) {
      allErrors.push(`Item ${index} (id: ${item.id || 'unknown'}): ${errors.join(', ')}`);
    }
    if (warnings.length > 0) {
      allWarnings.push(`Item ${index} (id: ${item.id || 'unknown'}): ${warnings.join(', ')}`);
    }

    // Check for duplicate IDs
    if (item.id) {
      if (seenIds.has(item.id)) {
        duplicateIds.add(item.id);
        allErrors.push(`Duplicate ID found: ${item.id}`);
      }
      seenIds.add(item.id);
    }

    // Collect statistics
    if (item.zh) stats.itemsWithZh++;
    
    if (item.source) {
      stats.sourceCounts[item.source] = (stats.sourceCounts[item.source] || 0) + 1;
    }
    
    if (item.date && validationRules.date(item.date)) {
      const date = new Date(item.date);
      if (!stats.dateRange.earliest || date < new Date(stats.dateRange.earliest)) {
        stats.dateRange.earliest = item.date;
      }
      if (!stats.dateRange.latest || date > new Date(stats.dateRange.latest)) {
        stats.dateRange.latest = item.date;
      }
    }
    
    if (item.tags) {
      item.tags.forEach(tag => {
        stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
      });
    }
    
    if (item.title) totalTitleLength += item.title.length;
    if (item.summary) totalSummaryLength += item.summary.length;
  });

  stats.avgTitleLength = data.length > 0 ? Math.round(totalTitleLength / data.length) : 0;
  stats.avgSummaryLength = data.length > 0 ? Math.round(totalSummaryLength / data.length) : 0;

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    duplicateIds: Array.from(duplicateIds),
    stats
  };
}

function printValidationResults(results) {
  console.log('\n=== News Data Validation Results ===\n');
  
  if (results.valid) {
    console.log('✅ Validation PASSED - No errors found');
  } else {
    console.log('❌ Validation FAILED - Errors found');
  }

  console.log(`\n📊 Statistics:`);
  if (results.stats) {
    const stats = results.stats;
    console.log(`   Total items: ${stats.totalItems}`);
    console.log(`   Items with Chinese content: ${stats.itemsWithZh}`);
    console.log(`   Unique sources: ${Object.keys(stats.sourceCounts).length}`);
    console.log(`   Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
    console.log(`   Unique tags: ${Object.keys(stats.tagCounts).length}`);
    console.log(`   Avg title length: ${stats.avgTitleLength} chars`);
    console.log(`   Avg summary length: ${stats.avgSummaryLength} chars`);
    
    // Top sources
    const topSources = Object.entries(stats.sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log(`   Top sources: ${topSources.map(([src, count]) => `${src}(${count})`).join(', ')}`);
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.forEach(error => console.log(`   • ${error}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${results.warnings.length}):`);
    results.warnings.slice(0, 10).forEach(warning => console.log(`   • ${warning}`));
    if (results.warnings.length > 10) {
      console.log(`   ... and ${results.warnings.length - 10} more warnings`);
    }
  }

  if (results.duplicateIds.length > 0) {
    console.log(`\n🔄 Duplicate IDs: ${results.duplicateIds.join(', ')}`);
  }

  console.log();
}

// Main execution
async function main() {
  try {
    const newsPath = join(__dirname, '..', 'data', 'news.json');
    console.log(`Validating: ${newsPath}`);
    
    const newsData = JSON.parse(readFileSync(newsPath, 'utf8'));
    const results = validateNewsData(newsData);
    
    printValidationResults(results);
    
    // Exit with appropriate code
    process.exit(results.valid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(2);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}