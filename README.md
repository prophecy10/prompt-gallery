# Prompt Gallery

A curated gallery of AI image generation prompts. Browse stunning AI-generated images and copy the exact prompts used to create them.

## Features

- 🎨 Browse curated AI prompts by category
- 🌗 Dark/Light theme (auto-detects system preference)
- ❤️ Save favorites (persisted in browser localStorage)
- 📋 One-click copy prompts
- 📱 Fully responsive (mobile, tablet, desktop)
- 👁️ Visitor counter in footer

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose `main` branch and `/ (root)` folder
5. Click Save — your site will be live at `https://yourusername.github.io/repo-name/`

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
