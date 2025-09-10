#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';

/**
 * Machine Vision Daily News Update Script
 * 
 * Simplified Phase C Implementation:
 * - 90-day rolling window news aggregation (configurable via WINDOW_DAYS)
 * - International source whitelist (exclude domestic)
 * - Archive snapshots only when news.json changes
 * - Retain latest 60 snapshots (ARCHIVE_MAX override)
 */

// Configuration
const CONFIG = {
  // Window settings
  WINDOW_DAYS: parseInt(process.env.WINDOW_DAYS) || 90,
  
  // Archive settings  
  ARCHIVE_MAX: parseInt(process.env.ARCHIVE_MAX) || 60,
  
  // Paths
  DATA_DIR: './data',
  ARCHIVE_DIR: './data/archive',
  NEWS_FILE: './data/news.json',
  ARCHIVE_INDEX_FILE: './data/archive/index.json',
  
  // International source whitelist (exclude domestic)
  ALLOWED_SOURCES: new Set([
    'NVIDIA', 'NVIDIA Blog', 'OpenCV', 'OpenCV Team', 'PyTorch', 'Meta AI', 
    'Apple', 'Apple ML', 'Intel', 'AMD', 'Google AI', 'Hugging Face', 
    'GitHub Release', 'Ultralytics', 'TensorFlow', 'AWS ML', 'Microsoft AI'
  ]),
  
  // RSS feeds for international sources
  RSS_FEEDS: [
    // Note: In a real implementation, these would be actual RSS feed URLs
    // For this demo, we'll use mock data that follows the whitelist
  ]
};

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
  try {
    await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
    await fs.mkdir(CONFIG.ARCHIVE_DIR, { recursive: true });
    console.log('[SETUP] Directories ensured');
  } catch (error) {
    console.error('[ERROR] Failed to create directories:', error.message);
    throw error;
  }
}

/**
 * Load existing news data
 */
async function loadExistingNews() {
  try {
    const data = await fs.readFile(CONFIG.NEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[INFO] No existing news data found, starting fresh');
    return [];
  }
}

/**
 * Fetch and aggregate news from RSS feeds
 */
async function aggregateNews() {
  // In a real implementation, this would fetch from actual RSS feeds
  // For now, we'll generate mock international news that follows the whitelist
  
  const mockSources = Array.from(CONFIG.ALLOWED_SOURCES);
  const mockNewNews = [];
  
  // Generate 1-3 mock news items from allowed sources
  const numItems = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numItems; i++) {
    const randomSource = mockSources[Math.floor(Math.random() * mockSources.length)];
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 7)); // Within last week
    
    mockNewNews.push({
      id: Date.now() + i,
      title: `${randomSource} announces breakthrough in computer vision technology`,
      url: `https://example.com/${randomSource.toLowerCase().replace(/\s+/g, '-')}-news-${Date.now()}`,
      source: randomSource,
      date: randomDate.toISOString(),
      summary: `${randomSource} has announced significant advances in machine vision and AI processing capabilities. The new developments promise to enhance real-time processing and improve accuracy in various computer vision applications.`,
      tags: ["AI", "Machine Vision", "Technology", randomSource.split(' ')[0]],
      zh: null
    });
  }
  
  console.log(`[AGGREGATION] Generated ${mockNewNews.length} mock items from international sources`);
  return mockNewNews;
}

/**
 * Filter news items by date window and source whitelist
 */
function filterNews(newsItems) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.WINDOW_DAYS);
  
  return newsItems.filter(item => {
    // Check date is within window
    const itemDate = new Date(item.date);
    if (itemDate < cutoffDate) {
      return false;
    }
    
    // Check source is in whitelist (case-insensitive)
    const isAllowedSource = CONFIG.ALLOWED_SOURCES.has(item.source) ||
                           Array.from(CONFIG.ALLOWED_SOURCES).some(allowed => 
                             allowed.toLowerCase() === item.source.toLowerCase()
                           );
    
    return isAllowedSource;
  });
}

/**
 * Merge new news with existing, deduplicate, and apply filters
 */
async function mergeAndProcessNews(existingNews, newNews) {
  // Combine all news
  const allNews = [...existingNews, ...newNews];
  
  // Deduplicate by ID or title+date combination
  const deduped = [];
  const seen = new Set();
  
  for (const item of allNews) {
    const key = item.id || `${item.title}|${item.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }
  
  // Filter by date window and source whitelist
  const filtered = filterNews(deduped);
  
  // Sort by date (newest first) - NO FORCED LIMIT (keep full list in window)
  const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  console.log(`[PROCESSING] Processed ${sorted.length} items in ${CONFIG.WINDOW_DAYS}-day window from allowed sources`);
  return sorted;
}

/**
 * Check if content has changed (string comparison)
 */
function hasContentChanged(oldNews, newNews) {
  const oldContent = JSON.stringify(oldNews);
  const newContent = JSON.stringify(newNews);
  return oldContent !== newContent;
}

/**
 * Save news data
 */
async function saveNewsData(newsData) {
  try {
    await fs.writeFile(CONFIG.NEWS_FILE, JSON.stringify(newsData, null, 2), 'utf8');
    console.log(`[SAVE] Saved ${newsData.length} news items to ${CONFIG.NEWS_FILE}`);
  } catch (error) {
    console.error('[ERROR] Failed to save news data:', error.message);
    throw error;
  }
}

/**
 * Create archive snapshot (only when content changes)
 */
async function createArchiveSnapshot(newsData) {
  try {
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format (UTC)
    const snapshotFile = path.join(CONFIG.ARCHIVE_DIR, `${todayDate}.json`);
    
    // Create/overwrite snapshot with whole current window dataset
    await fs.writeFile(snapshotFile, JSON.stringify(newsData, null, 2), 'utf8');
    console.log(`[ARCHIVE] Created snapshot for ${todayDate} (${newsData.length} items)`);
    
    return todayDate;
  } catch (error) {
    console.warn('[WARNING] Failed to create archive snapshot:', error.message);
    // Return null to indicate failure but don't throw - continue main process
    return null;
  }
}

/**
 * Load existing archive index
 */
async function loadArchiveIndex() {
  try {
    const data = await fs.readFile(CONFIG.ARCHIVE_INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[INFO] No existing archive index found, creating new one');
    return {
      generatedAt: new Date().toISOString(),
      dates: []
    };
  }
}

/**
 * Update archive index (prepend today, keep ARCHIVE_MAX counts)
 */
async function updateArchiveIndex(newDate, itemCount) {
  try {
    const index = await loadArchiveIndex();
    
    // Remove existing entry for today (if any) and add new one at the front
    index.dates = index.dates.filter(entry => entry.date !== newDate);
    index.dates.unshift({ date: newDate, count: itemCount });
    
    // Apply retention policy - keep latest ARCHIVE_MAX
    index.dates = index.dates.slice(0, CONFIG.ARCHIVE_MAX);
    index.generatedAt = new Date().toISOString();
    
    // Save updated index
    await fs.writeFile(CONFIG.ARCHIVE_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
    console.log(`[ARCHIVE] Updated index with ${index.dates.length} entries (max ${CONFIG.ARCHIVE_MAX})`);
    
    return index;
  } catch (error) {
    console.warn('[WARNING] Failed to update archive index:', error.message);
    return null;
  }
}

/**
 * Clean up old archive files (beyond ARCHIVE_MAX retention)
 */
async function cleanupOldArchives(retainedDates) {
  if (!retainedDates) return;
  
  try {
    const files = await fs.readdir(CONFIG.ARCHIVE_DIR);
    const archiveFiles = files.filter(file => file.match(/^\d{4}-\d{2}-\d{2}\.json$/));
    
    const retainedSet = new Set(retainedDates.map(entry => `${entry.date}.json`));
    
    for (const file of archiveFiles) {
      if (!retainedSet.has(file)) {
        await fs.unlink(path.join(CONFIG.ARCHIVE_DIR, file));
        console.log(`[CLEANUP] Removed old archive: ${file}`);
      }
    }
  } catch (error) {
    console.warn('[WARNING] Failed to cleanup old archives:', error.message);
    // Don't throw - cleanup failure shouldn't abort the main process
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('[START] Machine Vision News Update Script');
  console.log(`[CONFIG] Window: ${CONFIG.WINDOW_DAYS} days, Archive retention: ${CONFIG.ARCHIVE_MAX}, Sources: ${CONFIG.ALLOWED_SOURCES.size} international`);
  
  try {
    // Setup
    await ensureDirectories();
    
    // Load existing data
    const existingNews = await loadExistingNews();
    console.log(`[LOAD] Found ${existingNews.length} existing news items`);
    
    // Aggregate new content from international sources
    const newNews = await aggregateNews();
    
    // Merge, process, and filter
    const processedNews = await mergeAndProcessNews(existingNews, newNews);
    
    // Check if content changed (string comparison)
    const contentChanged = hasContentChanged(existingNews, processedNews);
    
    if (!contentChanged) {
      console.log('[RESULT] No content changes detected');
      process.exit(2); // Exit code 2 = no changes
    }
    
    console.log('[RESULT] Content changes detected, updating...');
    
    // Save updated news
    await saveNewsData(processedNews);
    
    // Archive management (only on content change)
    try {
      const snapshotDate = await createArchiveSnapshot(processedNews);
      if (snapshotDate) {
        const updatedIndex = await updateArchiveIndex(snapshotDate, processedNews.length);
        if (updatedIndex) {
          await cleanupOldArchives(updatedIndex.dates);
        }
      }
    } catch (archiveError) {
      console.warn('[WARNING] Archive operation failed:', archiveError.message);
      // Continue execution - archive failure shouldn't abort main update
    }
    
    console.log('[SUCCESS] Update completed successfully');
    process.exit(0); // Exit code 0 = changes made
    
  } catch (error) {
    console.error('[FATAL] Update script failed:', error.message);
    process.exit(1); // Exit code 1 = error
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n[INTERRUPT] Script interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n[TERMINATE] Script terminated');
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, CONFIG };