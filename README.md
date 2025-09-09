
# Machine Vision Daily News

A daily-updating static site that fetches the latest machine vision news from industry sources and displays them in a beautiful card-style gallery with individual PNG export functionality.

## 🚀 Features

- **Daily Automated Updates**: Fetches news daily at 09:00 Beijing time (01:00 UTC)
- **10 Industry Sources**: Monitors major machine vision publications and blogs
- **Card Gallery**: Responsive grid layout with hover effects
- **PNG Export**: Export individual news cards as 1080x1080 PNG images for sharing
- **Mobile Friendly**: Responsive design that works on all devices
- **No Translation**: Uses "no-translation fallback" configuration as requested

## 📰 Default News Sources

The system monitors these machine vision industry sources:

- **Vision Systems Design** (visionsystems.com)
- **Imaging and Machine Vision Europe** (imveurope.com) 
- **Automate.org** (automate.org)
- **EMVA** (emva.org)
- **The Imaging Source** (imaging-source.com)
- **Basler** (baslerweb.com)
- **Allied Vision** (alliedvision.com)
- **Teledyne FLIR** (flir.com)
- **Cognex** (cognex.com)
- **Keyence** (keyence.com)

## 🔧 How It Works

### Daily Automation
- **Schedule**: GitHub Actions runs daily at 01:00 UTC (09:00 Beijing time)
- **Process**: Fetches RSS/Atom feeds and extracts article metadata
- **Fallback**: If no feed available, scrapes article pages for images
- **Storage**: Saves normalized data to `data/news.json`
- **Commit**: Automatically commits changes if new data is found

### Data Structure
Each news item is normalized to this schema:
```json
{
  "title_en": "string",
  "title_zh": null,
  "summary_en": "string", 
  "summary_zh": null,
  "url": "string",
  "source": "string",
  "image": "string|null",
  "published_at": "ISO 8601 string"
}
```

### Frontend Features
- **Card Gallery**: 10 latest items in responsive grid
- **Image Handling**: Displays featured images with fallback placeholders
- **Export Function**: Client-side PNG generation using html2canvas
- **Refresh Button**: Manual update without page reload
- **Source Links**: Click cards to open original articles

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
npm install

# Fetch news data
npm run fetch

# Serve the site locally
# Use any static server, e.g.:
npx serve .
# or
python -m http.server 8000
```

### Testing the Fetcher
```bash
# Run the news fetching script
npm run fetch

# Check the generated data
cat data/news.json
```

## 📁 Project Structure

```
├── .github/workflows/
│   └── fetch-news.yml      # Daily automation workflow
├── data/
│   ├── .gitkeep           # Ensures directory exists
│   └── news.json          # Generated news data
├── scripts/
│   └── fetch_news.mjs     # News fetching script
├── images/                # Static images
├── index.html             # Responsive frontend
├── package.json           # Node.js configuration
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## ⚙️ Configuration

### Adding/Editing Sources
Edit the `DEFAULT_SOURCES` array in `scripts/fetch_news.mjs`:

```javascript
{
  name: 'Source Name',
  domain: 'example.com',
  feedUrls: [
    'https://example.com/rss',
    'https://example.com/feed',
    'https://example.com/rss.xml'
  ]
}
```

### Changing Schedule
Edit the cron expression in `.github/workflows/fetch-news.yml`:
```yaml
schedule:
  - cron: "0 1 * * *"  # 01:00 UTC = 09:00 Beijing
```

### Adding Translation Service
To add translation capabilities:

1. **Add API Configuration**:
   ```javascript
   // In scripts/fetch_news.mjs
   const TRANSLATION_CONFIG = {
     provider: 'google|azure|deepl',
     apiKey: process.env.TRANSLATION_API_KEY,
     targetLanguage: 'zh'
   };
   ```

2. **Update GitHub Secrets**:
   - Add `TRANSLATION_API_KEY` in repository settings
   - Update workflow to use the secret

3. **Modify Processing**:
   ```javascript
   async function translateText(text, config) {
     // Implementation depends on chosen provider
   }
   ```

4. **Update Frontend**:
   ```javascript
   // Display Chinese titles/summaries when available
   const title = item.title_zh || item.title_en;
   ```

## 🚀 Deployment

### GitHub Pages
1. **Enable Pages**: Go to repository Settings → Pages
2. **Source**: Deploy from `main` branch  
3. **URL**: Your site will be available at `https://username.github.io/repository-name`

### Manual Deployment
The site is static and can be deployed to any web host:
```bash
# Build (if using a build process)
npm run fetch

# Deploy files
# - index.html
# - data/news.json  
# - Any other static assets
```

## 🔧 Troubleshooting

### No News Items Appearing
1. Check if `data/news.json` exists and has content
2. Run `npm run fetch` locally to test data fetching
3. Check browser console for JavaScript errors
4. Verify the news sources are accessible

### GitHub Actions Not Running
1. Check the Actions tab in your repository
2. Verify the workflow file syntax
3. Ensure the repository has write permissions enabled
4. Check for any error messages in the workflow logs

### Export Function Not Working
1. Ensure html2canvas library is loading
2. Check browser console for errors
3. Test on different browsers (some have CORS restrictions)
4. Verify images are accessible (CORS-enabled)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run fetch`
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own machine vision news site.

## 🔗 Links

- **Live Site**: [Add your GitHub Pages URL here]
- **Issues**: [Report bugs or request features]
- **Discussions**: [Community discussions]

---

**Note**: This implementation uses the "no-translation fallback" configuration. Chinese language fields (`title_zh`, `summary_zh`) are intentionally left as `null` and can be populated later by adding a translation service.
