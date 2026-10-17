/**
 * Generates sitemap.xml from prompts.json
 *
 * Lists the home page and one real page per prompt (p/<id>.html, built by build-pages.js).
 * The old sitemap listed "#prompt-N" URLs, which search engines ignore (everything after # is dropped).
 * lastmod uses prompt dates, not today's date, so the file only changes when prompts change —
 * otherwise the hourly Action would commit a new sitemap every day.
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://prophecy10.github.io/prompt-gallery';

const promptsPath = path.join(__dirname, '..', 'prompts.json');
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');

const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
const latest = prompts.reduce((m, p) => (p.date > m ? p.date : m), '2026-01-01');

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${latest}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

prompts.forEach(prompt => {
    xml += `  <url>
    <loc>${SITE_URL}/p/${prompt.id}.html</loc>
    <lastmod>${prompt.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

xml += `</urlset>\n`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Sitemap generated with ${prompts.length + 1} URLs`);
