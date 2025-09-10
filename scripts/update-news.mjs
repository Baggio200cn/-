#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';

/**
 * Machine Vision Daily News Update Script
 * 
 * This script aggregates machine vision news from various sources,
 * processes the content, and manages historical archives with retention.
 */

// Configuration
const CONFIG = {
  // Archive settings
  ARCHIVE_RETENTION_DAYS: parseInt(process.env.ARCHIVE_RETENTION_DAYS) || 60,
  
  // Paths
  DATA_DIR: './data',
  ARCHIVE_DIR: './data/archive',
  NEWS_FILE: './data/news.json',
  ARCHIVE_INDEX_FILE: './data/archive/index.json',
  
  // Content settings
  MAX_NEWS_ITEMS: 10,
  
  // RSS feeds (mock for now - in real implementation, these would be actual feeds)
  RSS_FEEDS: [
    // Machine vision specific feeds would go here
    // For now, we'll simulate with the existing data structure
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
 * Mock news aggregation (in real implementation, this would fetch from RSS feeds)
 */
async function aggregateNews() {
  // For now, we'll use the existing sample data and add some new mock items
  // In a real implementation, this would fetch from actual RSS feeds
  
  const mockNewNews = [
    {
      id: Date.now(),
      title: "OpenCV 5.0发布，重大性能提升",
      url: "https://example.com/opencv-5-release",
      source: "OpenCV官方",
      date: new Date().toISOString(),
      summary: "OpenCV 5.0正式发布，带来显著的性能改进和新的机器学习模块。新版本优化了图像处理算法，提升了实时视频分析能力，并增强了对深度学习框架的集成支持。",
      tags: ["OpenCV", "计算机视觉", "机器学习", "开源"],
      zh: null
    }
  ];

  // In a real implementation:
  // - Fetch from RSS feeds
  // - Parse content with JSDOM
  // - Extract and clean text
  // - Generate tags using AI/ML
  // - Deduplicate content
  
  console.log(`[AGGREGATION] Mock aggregated ${mockNewNews.length} new items`);
  return mockNewNews;
}

/**
 * Merge new news with existing, deduplicate, and limit count
 */
async function mergeAndProcessNews(existingNews, newNews) {
  // Simple deduplication by title (in real implementation, would be more sophisticated)
  const allNews = [...existingNews];
  
  for (const newItem of newNews) {
    const exists = allNews.some(existing => 
      existing.title === newItem.title || existing.url === newItem.url
    );
    
    if (!exists) {
      allNews.unshift(newItem); // Add to beginning
    }
  }
  
  // Sort by date (newest first) and limit
  const sortedNews = allNews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, CONFIG.MAX_NEWS_ITEMS);
  
  console.log(`[PROCESSING] Processed ${sortedNews.length} total items`);
  return sortedNews;
}

/**
 * Check if content has changed
 */
function hasContentChanged(oldNews, newNews) {
  if (oldNews.length !== newNews.length) return true;
  
  // Compare content (simplified check)
  const oldTitles = oldNews.map(item => item.title).sort();
  const newTitles = newNews.map(item => item.title).sort();
  
  return JSON.stringify(oldTitles) !== JSON.stringify(newTitles);
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
 * Create archive snapshot
 */
async function createArchiveSnapshot(newsData) {
  try {
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const snapshotFile = path.join(CONFIG.ARCHIVE_DIR, `${todayDate}.json`);
    
    // Write snapshot file
    await fs.writeFile(snapshotFile, JSON.stringify(newsData, null, 2), 'utf8');
    console.log(`[ARCHIVE] Created snapshot for ${todayDate} (${newsData.length} items)`);
    
    return todayDate;
  } catch (error) {
    console.error('[ERROR] Failed to create archive snapshot:', error.message);
    throw error;
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
 * Update archive index
 */
async function updateArchiveIndex(newDate, itemCount) {
  try {
    const index = await loadArchiveIndex();
    
    // Remove existing entry for today (if any) and add new one at the front
    index.dates = index.dates.filter(entry => entry.date !== newDate);
    index.dates.unshift({ date: newDate, count: itemCount });
    
    // Apply retention policy
    index.dates = index.dates.slice(0, CONFIG.ARCHIVE_RETENTION_DAYS);
    index.generatedAt = new Date().toISOString();
    
    // Save updated index
    await fs.writeFile(CONFIG.ARCHIVE_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
    console.log(`[ARCHIVE] Updated index with ${index.dates.length} entries`);
    
    return index;
  } catch (error) {
    console.error('[ERROR] Failed to update archive index:', error.message);
    throw error;
  }
}

/**
 * Clean up old archive files
 */
async function cleanupOldArchives(retainedDates) {
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
    console.error('[ERROR] Failed to cleanup old archives:', error.message);
    // Don't throw - cleanup failure shouldn't abort the main process
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('[START] Machine Vision News Update Script');
  console.log(`[CONFIG] Retention: ${CONFIG.ARCHIVE_RETENTION_DAYS} days, Max items: ${CONFIG.MAX_NEWS_ITEMS}`);
  
  try {
    // Setup
    await ensureDirectories();
    
    // Load existing data
    const existingNews = await loadExistingNews();
    console.log(`[LOAD] Found ${existingNews.length} existing news items`);
    
    // Aggregate new content
    const newNews = await aggregateNews();
    
    // Merge and process
    const processedNews = await mergeAndProcessNews(existingNews, newNews);
    
    // Check if content changed
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
      const updatedIndex = await updateArchiveIndex(snapshotDate, processedNews.length);
      await cleanupOldArchives(updatedIndex.dates);
    } catch (archiveError) {
      console.error('[WARNING] Archive operation failed:', archiveError.message);
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