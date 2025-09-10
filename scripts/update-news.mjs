#!/usr/bin/env node

import fs from 'fs/promises';
import crypto from 'crypto';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';

const RSS_PARSER = new Parser({
  customFields: {
    item: ['summary', 'description', 'content:encoded']
  }
});

const WINDOW_DAYS = parseInt(process.env.WINDOW_DAYS || '14');
const MAX_ITEMS = parseInt(process.env.MAX_ITEMS || '10');
const SUMMARY_MAX_LENGTH = 420;

/**
 * Generate ID from URL or title
 */
function generateId(url, title = '') {
  const text = url || title;
  return crypto.createHash('sha1').update(text).digest('hex').substring(0, 10);
}

/**
 * Clean and truncate summary text
 */
function cleanSummary(text) {
  if (!text) return '';
  
  // Strip HTML tags
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate to max length
  if (cleaned.length <= SUMMARY_MAX_LENGTH) {
    return cleaned;
  }
  
  return cleaned.substring(0, SUMMARY_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

/**
 * Check if date is within window
 */
function isWithinWindow(dateStr) {
  if (!dateStr) return true; // Include items without dates
  
  const itemDate = new Date(dateStr);
  const windowDate = new Date();
  windowDate.setDate(windowDate.getDate() - WINDOW_DAYS);
  
  return itemDate >= windowDate;
}

/**
 * Fetch RSS feed
 */
async function fetchRSS(source) {
  try {
    console.log(`Fetching RSS: ${source.label} (${source.url})`);
    const feed = await RSS_PARSER.parseURL(source.url);
    
    const items = feed.items
      .filter(item => isWithinWindow(item.pubDate || item.isoDate))
      .slice(0, source.maxPerRun)
      .map(item => ({
        id: generateId(item.link, item.title),
        title: item.title || '未知标题',
        url: item.link || '',
        source: source.label,
        date: new Date(item.pubDate || item.isoDate || Date.now()).toISOString(),
        summary: cleanSummary(item.summary || item.description || item['content:encoded'] || ''),
        tags: [...source.tags],
        zh: null
      }));
    
    console.log(`RSS ${source.label}: fetched ${items.length} items`);
    return items;
  } catch (error) {
    console.warn(`Warning: Failed to fetch RSS ${source.label}: ${error.message}`);
    return [];
  }
}

/**
 * Fetch HTML source
 */
async function fetchHTML(source) {
  try {
    console.log(`Fetching HTML: ${source.label} (${source.url})`);
    
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const selectors = source.selectors || {};
    const itemSelector = selectors.item || '.article, .post, .news-item';
    const titleSelector = selectors.title || 'h1, h2, h3, .title';
    const linkSelector = selectors.link || 'a';
    const dateSelector = selectors.date || '.date, .time, time';
    const summarySelector = selectors.summary || '.summary, .excerpt, p';
    
    const elements = document.querySelectorAll(itemSelector);
    const items = [];
    
    for (let i = 0; i < Math.min(elements.length, source.maxPerRun); i++) {
      const element = elements[i];
      
      const titleEl = element.querySelector(titleSelector);
      const linkEl = element.querySelector(linkSelector);
      const dateEl = element.querySelector(dateSelector);
      const summaryEl = element.querySelector(summarySelector);
      
      const title = titleEl?.textContent?.trim() || '未知标题';
      let url = linkEl?.href || linkEl?.getAttribute('href') || '';
      
      // Convert relative URLs to absolute
      if (url && !url.startsWith('http')) {
        const baseUrl = new URL(source.url);
        url = new URL(url, baseUrl.origin).href;
      }
      
      const dateText = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';
      const summaryText = summaryEl?.textContent?.trim() || '';
      
      // Try to parse date
      let date = new Date();
      if (dateText) {
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        }
      }
      
      if (!isWithinWindow(date.toISOString())) {
        continue;
      }
      
      items.push({
        id: generateId(url, title),
        title,
        url,
        source: source.label,
        date: date.toISOString(),
        summary: cleanSummary(summaryText),
        tags: [...source.tags],
        zh: null
      });
    }
    
    console.log(`HTML ${source.label}: fetched ${items.length} items`);
    return items;
  } catch (error) {
    console.warn(`Warning: Failed to fetch HTML ${source.label}: ${error.message}`);
    return [];
  }
}

/**
 * Load sources configuration
 */
async function loadSources() {
  try {
    const data = await fs.readFile('./data/sources.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sources.json:', error.message);
    process.exit(1);
  }
}

/**
 * Load existing news data
 */
async function loadExistingNews() {
  try {
    const data = await fs.readFile('./data/news.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No existing news.json found, will create new one');
    return [];
  }
}

/**
 * Save news data
 */
async function saveNews(news) {
  await fs.writeFile('./data/news.json', JSON.stringify(news, null, 2));
}

/**
 * Main function
 */
async function main() {
  console.log('Starting news update...');
  
  const sourcesConfig = await loadSources();
  const existingNews = await loadExistingNews();
  
  const allItems = [];
  const enabledSources = sourcesConfig.sources.filter(source => source.enabled);
  
  console.log(`Processing ${enabledSources.length} enabled sources...`);
  
  // Fetch from all enabled sources
  for (const source of enabledSources) {
    let items = [];
    
    if (source.type === 'rss') {
      items = await fetchRSS(source);
    } else if (source.type === 'html') {
      items = await fetchHTML(source);
    } else {
      console.warn(`Warning: Unknown source type '${source.type}' for ${source.label}`);
      continue;
    }
    
    allItems.push(...items);
  }
  
  // Deduplicate by URL (fallback to title)
  const uniqueItems = [];
  const seenUrls = new Set();
  const seenTitles = new Set();
  
  for (const item of allItems) {
    const key = item.url || item.title;
    if (item.url && seenUrls.has(item.url)) continue;
    if (!item.url && seenTitles.has(item.title)) continue;
    
    if (item.url) seenUrls.add(item.url);
    seenTitles.add(item.title);
    uniqueItems.push(item);
  }
  
  // Sort by date (newest first) and limit
  const sortedItems = uniqueItems
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_ITEMS);
  
  console.log(`Collected ${allItems.length} items, ${uniqueItems.length} unique, keeping ${sortedItems.length}`);
  
  // Check if content has changed
  const existingData = JSON.stringify(existingNews);
  const newData = JSON.stringify(sortedItems);
  
  if (existingData === newData) {
    console.log('No changes detected, exiting with code 2');
    process.exit(2);
  }
  
  // Save new data
  await saveNews(sortedItems);
  console.log(`Successfully updated news.json with ${sortedItems.length} items`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});