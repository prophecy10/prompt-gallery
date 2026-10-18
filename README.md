# Prompt Gallery

A curated gallery of AI image generation prompts. Browse stunning AI-generated images and copy the exact prompts used to create them.

## Features

- 🎨 Browse curated AI prompts by category
- 🌗 Dark/Light theme (auto-detects system preference)
- ❤️ Save favorites (persisted in browser localStorage)
- 📋 One-click copy prompts
- 📱 Fully responsive (mobile, tablet, desktop)
- 👁️ Visitor counter in footer
- 🔗 **A page for every prompt** (`p/<id>.html`) with its own title and preview image, so shared links show the picture on WhatsApp / X / Telegram and Google can index each prompt
- 📤 Share button on every prompt; `#prompt-<id>` links open that prompt in the gallery
- 📶 Works offline after the first visit

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose `main` branch and `/ (root)` folder
5. Click Save — your site will be live at `https://yourusername.github.io/repo-name/`

## How new prompts get published

New prompts come from a Google Form → Google Sheet. A GitHub Action (`.github/workflows/update-prompts.yml`) runs hourly:

1. `scripts/build-prompts.js` reads the sheet (CSV) into `prompts.json`. Rows whose image link isn't a plain `https://` URL are skipped, since the form is open to submissions.
2. `scripts/build-pages.js` writes one page per prompt into `p/` (only changed pages are rewritten).
3. `scripts/generate-sitemap.js` lists the home page and every prompt page.
4. It commits only if something actually changed.

## Adding New Prompts

Edit `prompts.json` directly on GitHub. Each prompt entry:

```json
{
  "id": 4,
  "category": "men",
  "prompt": "Your prompt text here...",
  "image_url": "https://res.cloudinary.com/your-cloud/image/upload/...",
  "date": "2026-03-10"
}
```

- **id**: Unique number
- **category**: `men`, `women`, `kids`, or `family`
- **prompt**: The full AI prompt text
- **image_url**: Cloudinary (or any) image URL
- **date**: YYYY-MM-DD (newest appear first)

## Visitor Counter

The footer uses [visitor-badge.laobi.icu](https://visitor-badge.laobi.icu). Update the `page_id` in `index.html` to match your repo name for accurate tracking.

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no build tools needed)
- Google Fonts (Inter)
- Cloudinary for image hosting
