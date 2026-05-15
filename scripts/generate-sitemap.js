/**
 * Generates sitemap.xml from prompts.json
 * Update SITE_URL to your actual GitHub Pages URL
 */

const fs = require('fs');
const path = require('path');

// TODO: Update this to your actual site URL
const SITE_URL = 'https://prophecy10.github.io/prompt-gallery';

const promptsPath = path.join(__dirname, '..', 'prompts.json');
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');

const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

// Add each prompt as a URL (using hash-based routing)
prompts.forEach(prompt => {
    xml += `  <url>
    <loc>${SITE_URL}/#prompt-${prompt.id}</loc>
    <lastmod>${prompt.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

xml += `</urlset>\n`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Sitemap generated with ${prompts.length + 1} URLs`);
