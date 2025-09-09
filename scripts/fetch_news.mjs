import Parser from 'rss-parser';
import dayjs from 'dayjs';
import { writeFile } from 'fs/promises';
import { URL } from 'url';

// Default machine vision news sources
const DEFAULT_SOURCES = [
  {
    name: 'Vision Systems Design',
    domain: 'visionsystems.com',
    feedUrls: [
      'https://www.visionsystems.com/rss',
      'https://www.visionsystems.com/content/rss',
      'https://www.visionsystems.com/feeds/all.rss.xml'
    ]
  },
  {
    name: 'Imaging and Machine Vision Europe',
    domain: 'imveurope.com',
    feedUrls: [
      'https://www.imveurope.com/rss',
      'https://www.imveurope.com/feed',
      'https://www.imveurope.com/rss.xml'
    ]
  },
  {
    name: 'Automate.org',
    domain: 'automate.org',
    feedUrls: [
      'https://www.automate.org/rss',
      'https://www.automate.org/feed',
      'https://www.automate.org/news/rss'
    ]
  },
  {
    name: 'EMVA',
    domain: 'emva.org',
    feedUrls: [
      'https://www.emva.org/rss',
      'https://www.emva.org/feed',
      'https://www.emva.org/news/rss'
    ]
  },
  {
    name: 'The Imaging Source',
    domain: 'imaging-source.com',
    feedUrls: [
      'https://www.imaging-source.com/rss',
      'https://www.imaging-source.com/blog/rss',
      'https://www.imaging-source.com/feed'
    ]
  },
  {
    name: 'Basler',
    domain: 'baslerweb.com',
    feedUrls: [
      'https://www.baslerweb.com/rss',
      'https://www.baslerweb.com/en/company/news-press/news/rss',
      'https://www.baslerweb.com/feed'
    ]
  },
  {
    name: 'Allied Vision',
    domain: 'alliedvision.com',
    feedUrls: [
      'https://www.alliedvision.com/rss',
      'https://www.alliedvision.com/en/company/news/rss',
      'https://www.alliedvision.com/feed'
    ]
  },
  {
    name: 'Teledyne FLIR',
    domain: 'flir.com',
    feedUrls: [
      'https://www.flir.com/news/rss',
      'https://www.flir.com/rss',
      'https://www.flir.com/feed'
    ]
  },
  {
    name: 'Cognex',
    domain: 'cognex.com',
    feedUrls: [
      'https://www.cognex.com/rss',
      'https://www.cognex.com/company/news/rss',
      'https://www.cognex.com/feed'
    ]
  },
  {
    name: 'Keyence',
    domain: 'keyence.com',
    feedUrls: [
      'https://www.keyence.com/rss',
      'https://www.keyence.com/company/news/rss',
      'https://www.keyence.com/feed'
    ]
  }
];

const parser = new Parser({
  timeout: 10000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

/**
 * Fetch RSS/Atom feed from multiple possible URLs
 */
async function fetchFeed(source) {
  for (const feedUrl of source.feedUrls) {
    try {
      console.log(`Trying ${feedUrl}...`);
      const feed = await parser.parseURL(feedUrl);
      console.log(`✓ Success: Found ${feed.items?.length || 0} items from ${feedUrl}`);
      return feed;
    } catch (error) {
      console.log(`  Failed ${feedUrl}: ${error.message}`);
      continue;
    }
  }
  
  // Try to discover feed from homepage
  try {
    console.log(`Trying to discover feed from https://${source.domain}`);
    const response = await fetch(`https://${source.domain}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const html = await response.text();
      const feedLinks = extractFeedUrls(html, `https://${source.domain}`);
      
      for (const feedUrl of feedLinks) {
        try {
          console.log(`  Discovered feed: ${feedUrl}`);
          const feed = await parser.parseURL(feedUrl);
          console.log(`✓ Success: Found ${feed.items?.length || 0} items from discovered feed`);
          return feed;
        } catch (error) {
          console.log(`    Failed discovered feed: ${error.message}`);
          continue;
        }
      }
    }
  } catch (error) {
    console.log(`  Feed discovery failed: ${error.message}`);
  }
  
  return null;
}

/**
 * Extract feed URLs from HTML
 */
function extractFeedUrls(html, baseUrl) {
  const feedUrls = [];
  const feedRegex = /<link[^>]*rel=[\\"\\'](?:alternate|feed)[\\"\\'][^>]*href=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/gi;
  let match;
  
  while ((match = feedRegex.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl).href;
      if (url.includes('rss') || url.includes('feed') || url.includes('atom')) {
        feedUrls.push(url);
      }
    } catch (error) {
      // Invalid URL, skip
    }
  }
  
  return feedUrls;
}

/**
 * Extract image from article page
 */
async function extractImageFromPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try og:image first
    let match = html.match(/<meta[^>]*property=[\\"\\']og:image[\\"\\'][^>]*content=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/i);
    if (match) {
      return new URL(match[1], url).href;
    }
    
    // Try twitter:image
    match = html.match(/<meta[^>]*name=[\\"\\']twitter:image[\\"\\'][^>]*content=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/i);
    if (match) {
      return new URL(match[1], url).href;
    }
    
    // Try link rel="image_src"
    match = html.match(/<link[^>]*rel=[\\"\\']image_src[\\"\\'][^>]*href=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/i);
    if (match) {
      return new URL(match[1], url).href;
    }
    
    // Try first img in main content
    const imgRegex = /<img[^>]*src=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const imgUrl = imgMatch[1];
      if (!imgUrl.includes('logo') && !imgUrl.includes('icon') && 
          (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') || 
           imgUrl.includes('.png') || imgUrl.includes('.webp'))) {
        return new URL(imgUrl, url).href;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`    Image extraction failed for ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Sanitize HTML content
 */
function sanitizeHtml(html) {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\\s+/g, ' ').trim();
  
  // Truncate to ~200 chars without breaking words
  if (text.length > 200) {
    text = text.substring(0, 200);
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > 150) {
      text = text.substring(0, lastSpace) + '...';
    } else {
      text = text + '...';
    }
  }
  
  return text;
}

/**
 * Normalize date parsing
 */
function parseDate(dateStr) {
  if (!dateStr) return dayjs().toISOString();
  
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed.toISOString() : dayjs().toISOString();
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.href;
  } catch (error) {
    return url;
  }
}

/**
 * Process a single feed item
 */
async function processItem(item, sourceName) {
  const normalizedUrl = normalizeUrl(item.link);
  
  // Extract image from content or fetch from page
  let image = null;
  
  // Try to get image from enclosure first
  if (item.enclosure && item.enclosure.url && 
      (item.enclosure.type?.startsWith('image/') || 
       item.enclosure.url.match(/\\.(jpg|jpeg|png|gif|webp)$/i))) {
    image = item.enclosure.url;
  }
  
  // Try content for images
  if (!image && item.content) {
    const imgMatch = item.content.match(/<img[^>]*src=[\\"\\']([^\\"\\'>]+)[\\"\\'][^>]*>/i);
    if (imgMatch) {
      try {
        image = new URL(imgMatch[1], normalizedUrl).href;
      } catch (error) {
        // Invalid URL
      }
    }
  }
  
  // If no image found and we have a URL, try to extract from page
  if (!image && normalizedUrl) {
    image = await extractImageFromPage(normalizedUrl);
  }
  
  return {
    title_en: item.title || 'Untitled',
    title_zh: null, // No translation as specified
    summary_en: sanitizeHtml(item.contentSnippet || item.summary || item.content),
    summary_zh: null, // No translation as specified
    url: normalizedUrl,
    source: sourceName,
    image: image,
    published_at: parseDate(item.pubDate || item.isoDate)
  };
}

/**
 * Main function to fetch all news
 */
async function fetchAllNews() {
  console.log('🚀 Starting news fetch from machine vision sources...');
  const allItems = [];
  
  for (const source of DEFAULT_SOURCES) {
    console.log(`\\n📡 Fetching from ${source.name} (${source.domain})...`);
    
    try {
      const feed = await fetchFeed(source);
      
      if (feed && feed.items && feed.items.length > 0) {
        console.log(`  Processing ${feed.items.length} items...`);
        
        for (const item of feed.items.slice(0, 5)) { // Limit to 5 items per source
          try {
            const processedItem = await processItem(item, source.name);
            allItems.push(processedItem);
            console.log(`    ✓ Processed: ${processedItem.title_en.substring(0, 50)}...`);
          } catch (error) {
            console.log(`    ✗ Failed to process item: ${error.message}`);
          }
        }
      } else {
        console.log(`  ⚠️  No items found for ${source.name}`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to fetch from ${source.name}: ${error.message}`);
    }
  }
  
  // Sort by published date (newest first)
  allItems.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  
  // Deduplicate by URL and title+source
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    const urlKey = item.url;
    const titleKey = `${item.title_en}|${item.source}`;
    
    if (seen.has(urlKey) || seen.has(titleKey)) {
      return false;
    }
    
    seen.add(urlKey);
    seen.add(titleKey);
    return true;
  });
  
  // Take only the latest 10 items
  const finalItems = uniqueItems.slice(0, 10);
  
  const result = {
    generated_at: dayjs().toISOString(),
    items: finalItems
  };
  
  // Write to data/news.json
  await writeFile('data/news.json', JSON.stringify(result, null, 2), 'utf8');
  
  console.log(`\\n✅ Successfully generated data/news.json with ${finalItems.length} items`);
  console.log(`📊 Summary:`);
  finalItems.forEach((item, index) => {
    console.log(`  ${index + 1}. [${item.source}] ${item.title_en.substring(0, 60)}...`);
  });
  
  return result;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllNews().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { fetchAllNews };