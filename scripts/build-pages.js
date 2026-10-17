/**
 * Builds one static page per prompt: p/<id>.html
 *
 * Why: the gallery is a single page, so search engines and chat apps only ever saw the home page.
 * A real page per prompt gives each one its own title, description and preview image — a shared
 * link shows the actual picture on WhatsApp / X / Telegram, and Google can index each prompt.
 * The page shows the image and prompt with a Copy button and links back into the gallery.
 *
 * Run after build-prompts.js (the GitHub Action does this). Pages for prompts that no longer
 * exist are removed.
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://prophecy10.github.io/prompt-gallery';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'p');

const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'prompts.json'), 'utf8'));

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeUrl = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? u : '';

function title(prompt) {
  // First clause of the prompt, cut at a word boundary
  const first = prompt.split(/[.,;:]/)[0].trim();
  const t = first.length > 60 ? first.slice(0, 60).replace(/\s+\S*$/, '') + '…' : first;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function page(p, prev, next) {
  const img = safeUrl(p.image_url);
  const t = title(p.prompt);
  const desc = p.prompt.length > 155 ? p.prompt.slice(0, 155).replace(/\s+\S*$/, '') + '…' : p.prompt;
  const url = `${SITE_URL}/p/${p.id}.html`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: t,
    caption: p.prompt,
    contentUrl: img || undefined,
    datePublished: p.date,
    genre: cap(p.category),
    isPartOf: { '@type': 'WebSite', name: 'Prompt Gallery', url: SITE_URL + '/' },
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(t)} — AI image prompt | Prompt Gallery</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Prompt Gallery">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
${img ? `<meta property="og:image" content="${esc(img)}">\n<meta name="twitter:image" content="${esc(img)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="theme-color" content="#000000">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
  :root{--bg:#fff;--fg:#111;--muted:#666;--card:#f4f4f5;--line:#e4e4e7;--accent:#111;--accent-fg:#fff}
  @media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f4f4f5;--muted:#a1a1aa;--card:#111113;--line:#27272a;--accent:#f4f4f5;--accent-fg:#000}}
  *{box-sizing:border-box;margin:0}
  body{font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--fg);line-height:1.6}
  main{max-width:720px;margin:0 auto;padding:16px 16px 48px}
  header{display:flex;justify-content:space-between;align-items:center;padding:4px 0 16px}
  header a{color:var(--fg);text-decoration:none;font-weight:700}
  .tag{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
  img{width:100%;height:auto;border-radius:14px;display:block;background:var(--card)}
  h1{font-size:20px;line-height:1.35;margin:18px 0 6px}
  .prompt{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:12px 0 16px;white-space:pre-wrap;font-size:15px}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  .btn{flex:1;min-width:140px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:10px;padding:12px 14px;font:inherit;font-weight:600;cursor:pointer;text-align:center;text-decoration:none}
  .btn.primary{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}
  nav{display:flex;justify-content:space-between;margin-top:22px;font-size:14px}
  nav a{color:var(--muted);text-decoration:none}
  .meta{font-size:13px;color:var(--muted);margin-top:4px}
</style>
</head>
<body>
<main>
  <header><a href="../">← Prompt Gallery</a><span class="tag">${esc(p.category)}</span></header>
  ${img ? `<img src="${esc(img)}" alt="${esc(t)}">` : ''}
  <h1>${esc(t)}</h1>
  <div class="meta">Added ${esc(p.date)}</div>
  <div class="prompt" id="prompt">${esc(p.prompt)}</div>
  <div class="row">
    <button class="btn primary" id="copy">Copy prompt</button>
    <button class="btn" id="share">Share</button>
    <a class="btn" href="../#prompt-${p.id}">Open in gallery</a>
  </div>
  <nav>${prev ? `<a href="${prev.id}.html">← Newer</a>` : '<span></span>'}${next ? `<a href="${next.id}.html">Older →</a>` : '<span></span>'}</nav>
</main>
<script>
  var text = document.getElementById('prompt').textContent;
  document.getElementById('copy').onclick = function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
      b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy prompt'; }, 1600);
    }, function () {
      var r = document.createRange(); r.selectNodeContents(document.getElementById('prompt'));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
  };
  document.getElementById('share').onclick = function () {
    var u = location.href;
    if (navigator.share) navigator.share({ title: document.title, url: u }).catch(function () {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(document.querySelector('h1').textContent + ' ' + u), '_blank', 'noopener');
  };
</script>
</body>
</html>
`;
}

fs.mkdirSync(OUT, { recursive: true });
const keep = new Set();
prompts.forEach((p, i) => {
  if (!Number.isInteger(p.id)) return;
  const file = `${p.id}.html`;
  keep.add(file);
  const html = page(p, prompts[i - 1], prompts[i + 1]);
  const target = path.join(OUT, file);
  // Write only when changed, so unchanged pages don't create commits
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) fs.writeFileSync(target, html, 'utf8');
});
for (const f of fs.readdirSync(OUT)) {
  if (/^\d+\.html$/.test(f) && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
}
console.log(`Built ${keep.size} prompt pages in p/`);
