#!/usr/bin/env node

/**
 * Validate news.json structure
 * Ensures the file is a valid array with required fields
 */

import fs from 'fs';
import path from 'path';

const NEWS_FILE = 'data/news.json';

function validateNews() {
  console.log('🔍 Validating news.json structure...');
  
  // Check if file exists
  if (!fs.existsSync(NEWS_FILE)) {
    console.error('❌ Error: data/news.json not found');
    process.exit(1);
  }
  
  let data;
  try {
    const content = fs.readFileSync(NEWS_FILE, 'utf8');
    data = JSON.parse(content);
  } catch (error) {
    console.error('❌ Error: Failed to parse news.json as JSON');
    console.error(error.message);
    process.exit(1);
  }
  
  // Check if data is an array
  if (!Array.isArray(data)) {
    console.error('❌ Error: news.json root must be an array');
    process.exit(1);
  }
  
  if (data.length === 0) {
    console.warn('⚠️  Warning: news.json is empty');
    return;
  }
  
  console.log(`📊 Found ${data.length} news items`);
  
  // Validate each news item
  const requiredFields = ['id', 'title', 'url', 'source', 'date', 'summary'];
  const errors = [];
  const warnings = [];
  
  data.forEach((item, index) => {
    const itemNum = index + 1;
    
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in item) || item[field] === null || item[field] === undefined) {
        errors.push(`Item ${itemNum}: Missing required field '${field}'`);
      } else if (typeof item[field] === 'string' && item[field].trim() === '') {
        errors.push(`Item ${itemNum}: Empty required field '${field}'`);
      }
    }
    
    // Validate specific field types
    if ('id' in item && (typeof item.id !== 'number' && typeof item.id !== 'string')) {
      errors.push(`Item ${itemNum}: Field 'id' must be number or string`);
    }
    
    if ('date' in item) {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        errors.push(`Item ${itemNum}: Invalid date format: ${item.date}`);
      }
    }
    
    if ('url' in item && typeof item.url === 'string') {
      try {
        new URL(item.url);
      } catch {
        warnings.push(`Item ${itemNum}: Invalid URL format: ${item.url}`);
      }
    }
    
    if ('tags' in item && !Array.isArray(item.tags)) {
      warnings.push(`Item ${itemNum}: Field 'tags' should be an array`);
    }
    
    // Check for Chinese language data structure
    if ('zh' in item && typeof item.zh === 'object' && item.zh !== null) {
      const zhFields = ['title', 'summary'];
      for (const field of zhFields) {
        if (!(field in item.zh) || typeof item.zh[field] !== 'string' || item.zh[field].trim() === '') {
          warnings.push(`Item ${itemNum}: Missing or empty zh.${field}`);
        }
      }
    }
  });
  
  // Check for duplicate IDs
  const ids = data.map(item => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Validation Errors:');
    errors.forEach(error => console.error(`  • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  Validation Warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
  
  if (errors.length === 0) {
    console.log('\n✅ news.json validation passed!');
    
    // Additional statistics
    const sources = [...new Set(data.map(item => item.source))];
    const tags = [...new Set(data.flatMap(item => item.tags || []))];
    const dateRange = getDateRange(data);
    
    console.log('\n📈 Statistics:');
    console.log(`  • Total items: ${data.length}`);
    console.log(`  • Unique sources: ${sources.length}`);
    console.log(`  • Unique tags: ${tags.length}`);
    console.log(`  • Date range: ${dateRange.start} to ${dateRange.end}`);
    console.log(`  • Items with Chinese data: ${data.filter(item => item.zh || item.titleZh).length}`);
    
    if (warnings.length === 0) {
      console.log('\n🎉 No warnings! Perfect data structure.');
    }
  } else {
    console.error(`\n💥 Validation failed with ${errors.length} error(s)`);
    process.exit(1);
  }
}

function getDateRange(data) {
  const dates = data
    .map(item => new Date(item.date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a - b);
  
  if (dates.length === 0) {
    return { start: 'N/A', end: 'N/A' };
  }
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  return {
    start: formatDate(dates[0]),
    end: formatDate(dates[dates.length - 1])
  };
}

// Run validation
validateNews();