#!/usr/bin/env node

/**
 * News Update Script
 * Fetches news from RSS feeds and HTML sources, processes and saves to data/news.json
 * Uses rss-parser for RSS feeds and jsdom for HTML parsing
 */

import { readFile, writeFile, access } from 'fs/promises';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

// Initialize RSS parser
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
  },
});

/**
 * Utility function to clean and truncate text
 */
function cleanText(text, maxLength = 420) {
  if (!text) return '';
  
  // Remove HTML tags, extra whitespace, and newlines
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate to maxLength characters, ensuring we don't cut off mid-word
  if (cleaned.length <= maxLength) return cleaned;
  
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > maxLength * 0.8 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/**
 * Extract tags from title and summary
 */
function extractTags(title, summary, source) {
  const text = `${title} ${summary}`.toLowerCase();
  const tagMap = new Map();
  
  // Common vision/AI keywords
  const keywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'computer vision', 'opencv', 'pytorch', 'tensorflow', 'neural network',
    'cnn', 'transformer', 'gan', 'diffusion', 'stable diffusion',
    'object detection', 'segmentation', 'classification', 'recognition',
    'autonomous', 'self-driving', 'robotics', 'drone', 'lidar',
    'medical imaging', 'healthcare', 'diagnosis', 'x-ray', 'mri',
    'nvidia', 'gpu', 'cuda', 'edge computing', 'inference',
    'research', 'paper', 'arxiv', 'conference', 'benchmark'
  ];
  
  // Extract keywords present in the text
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tagMap.set(keyword, true);
    }
  });
  
  // Add source-based tags
  const sourceTag = source.replace(/\s+(blog|官方|ai|tech)/gi, '').trim();
  if (sourceTag) tagMap.set(sourceTag, true);
  
  // Convert to array and limit to 6 tags max
  return Array.from(tagMap.keys()).slice(0, 6);
}

/**
 * Fetch RSS feed
 */
async function fetchRss(source) {
  try {
    console.log(`Fetching RSS: ${source.name}`);
    const feed = await rssParser.parseURL(source.url);
    
    return feed.items.map((item, index) => ({
      id: `${source.id}-${Date.now()}-${index}`,
      title: cleanText(item.title, 200),
      url: item.link || item.guid || '',
      source: source.name,
      date: item.isoDate || item.pubDate || new Date().toISOString(),
      summary: cleanText(item.contentSnippet || item.content || item.description || '', 420),
      tags: extractTags(item.title || '', item.contentSnippet || item.description || '', source.name),
      zh: null
    }));
  } catch (error) {
    console.warn(`Failed to fetch RSS ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Fetch HTML content and parse
 */
async function fetchHtml(source) {
  try {
    console.log(`Fetching HTML: ${source.name}`);
    
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const items = [];
    const containers = document.querySelectorAll(source.selectors.container);
    
    containers.forEach((container, index) => {
      try {
        const titleEl = container.querySelector(source.selectors.title);
        const linkEl = container.querySelector(source.selectors.link);
        const dateEl = container.querySelector(source.selectors.date);
        const excerptEl = container.querySelector(source.selectors.excerpt);
        
        if (!titleEl) return;
        
        const title = cleanText(titleEl.textContent, 200);
        const url = linkEl?.href || linkEl?.getAttribute('href') || '';
        const dateText = dateEl?.textContent || dateEl?.getAttribute('datetime') || '';
        const excerpt = cleanText(excerptEl?.textContent || '', 420);
        
        // Parse date
        let date = new Date().toISOString();
        if (dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString();
          }
        }
        
        items.push({
          id: `${source.id}-${Date.now()}-${index}`,
          title,
          url,
          source: source.name,
          date,
          summary: excerpt || title,
          tags: extractTags(title, excerpt, source.name),
          zh: null
        });
      } catch (error) {
        console.warn(`Error parsing HTML item from ${source.name}:`, error.message);
      }
    });
    
    return items;
  } catch (error) {
    console.warn(`Failed to fetch HTML ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Filter items by date (keep only recent items)
 */
function filterByDate(items, daysToKeep = 14) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate;
  });
}

/**
 * Remove duplicate items based on title similarity
 */
function deduplicateItems(items) {
  const seen = new Set();
  const unique = [];
  
  for (const item of items) {
    // Create a normalized version of the title for comparison
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      unique.push(item);
    }
  }
  
  return unique;
}

/**
 * Sort items by date (newest first)
 */
function sortItems(items) {
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Load existing news data
 */
async function loadExistingNews() {
  try {
    await access(NEWS_FILE);
    const content = await readFile(NEWS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log('No existing news file found, starting fresh');
    return [];
  }
}

/**
 * Save news data
 */
async function saveNews(newsData) {
  const jsonContent = JSON.stringify(newsData, null, 2);
  await writeFile(NEWS_FILE, jsonContent, 'utf-8');
  console.log(`Saved ${newsData.length} news items to ${NEWS_FILE}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting news update process...');
    
    // Load sources configuration
    const sourcesContent = await readFile(SOURCES_FILE, 'utf-8');
    const { sources, settings } = JSON.parse(sourcesContent);
    
    console.log(`Loaded ${sources.length} sources (${sources.filter(s => s.enabled).length} enabled)`);
    
    // Fetch news from all enabled sources
    const allItems = [];
    
    for (const source of sources) {
      if (!source.enabled) {
        console.log(`Skipping disabled source: ${source.name}`);
        continue;
      }
      
      let items = [];
      if (source.type === 'rss') {
        items = await fetchRss(source);
      } else if (source.type === 'html') {
        items = await fetchHtml(source);
      }
      
      console.log(`Fetched ${items.length} items from ${source.name}`);
      allItems.push(...items);
    }
    
    console.log(`Total items fetched: ${allItems.length}`);
    
    // Process items
    let processedItems = filterByDate(allItems, settings.daysToKeep || 14);
    console.log(`Items after date filtering: ${processedItems.length}`);
    
    processedItems = deduplicateItems(processedItems);
    console.log(`Items after deduplication: ${processedItems.length}`);
    
    processedItems = sortItems(processedItems);
    
    // Limit to max items
    const maxItems = settings.maxItems || 10;
    if (processedItems.length > maxItems) {
      processedItems = processedItems.slice(0, maxItems);
      console.log(`Limited to ${maxItems} most recent items`);
    }
    
    // Load existing news to compare
    const existingNews = await loadExistingNews();
    
    // Check if there are meaningful changes
    const hasChanges = JSON.stringify(processedItems) !== JSON.stringify(existingNews);
    
    if (hasChanges) {
      await saveNews(processedItems);
      console.log('News data updated successfully');
      process.exit(0); // Success with changes
    } else {
      console.log('No changes detected in news data');
      process.exit(2); // Success but no changes
    }
    
  } catch (error) {
    console.error('Error updating news:', error);
    process.exit(1); // Error
  }
}

// Run the script
main();