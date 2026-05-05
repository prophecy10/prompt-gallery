// ===== State =====
let prompts = [];
let favorites = JSON.parse(localStorage.getItem('pg_favorites')) || [];
let currentCategory = 'all';
let currentPrompt = null;

// ===== DOM =====
const galleryGrid = document.getElementById('gallery-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const detailModal = document.getElementById('detail-modal');
const favoritesPanel = document.getElementById('favorites-panel');
const toast = document.getElementById('toast');

// ===== Init =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupTheme();
    setupFilters();
    setupModal();
    setupFavoritesPanel();
    await loadPrompts();
    renderGallery();
}

// ===== Data Loading =====
async function loadPrompts() {
    try {
        // Load from local prompts.json (same repo)
        const response = await fetch('prompts.json');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();

        prompts = data.map(item => ({
            id: item.id,
            prompt: item.prompt,
            image: item.image_url || item.image,
            category: (item.category || 'other').toLowerCase(),
            date: item.date || '2000-01-01'
        }));

        // Sort newest first
        prompts.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
        console.error('Error loading prompts:', err);
        prompts = [];
    }

    loadingState.classList.add('hidden');
}

// ===== Rendering =====
function renderGallery() {
    const filtered = currentCategory === 'all'
        ? prompts
        : prompts.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        galleryGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    galleryGrid.innerHTML = filtered.map(cardHTML).join('');
    attachCardListeners();
}

function cardHTML(prompt) {
    const isFav = favorites.includes(prompt.id);
    return `
        <div class="gallery-card" data-id="${prompt.id}">
            <div class="card-image-wrap">
                <img src="${prompt.image}" alt="AI prompt image" class="card-image" loading="lazy">
                <div class="card-overlay">
                    <div class="card-actions">
                        <button class="card-btn card-fav-btn ${isFav ? 'favorited' : ''}" data-id="${prompt.id}" aria-label="Favorite">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        <button class="card-btn card-copy-btn" data-id="${prompt.id}" aria-label="Copy prompt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachCardListeners() {
    // Card click → open modal
    galleryGrid.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-btn')) return;
            const id = parseInt(card.dataset.id);
            openDetail(id);
        });
    });

    // Favorite buttons
    galleryGrid.querySelectorAll('.card-fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
            btn.classList.toggle('favorited', favorites.includes(id));
        });
    });

    // Copy buttons
    galleryGrid.querySelectorAll('.card-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const prompt = prompts.find(p => p.id === id);
            if (prompt) {
                copyToClipboard(prompt.prompt);
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1500);
            }
        });
    });
}

// ===== Filters =====
function setupFilters() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.dataset.category;
            renderGallery();
        });
    });
}

// ===== Theme =====
function setupTheme() {
    const saved = localStorage.getItem('pg_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pg_theme', next);
    });
}

// ===== Modal =====
function setupModal() {
    document.getElementById('modal-close').addEventListener('click', closeDetail);
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetail();
    });

    document.getElementById('modal-copy-btn').addEventListener('click', () => {
        if (currentPrompt) copyToClipboard(currentPrompt.prompt);
    });

    document.getElementById('modal-fav-btn').addEventListener('click', () => {
        if (currentPrompt) {
            toggleFavorite(currentPrompt.id);
            updateModalFavBtn();
        }
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (detailModal.classList.contains('open')) closeDetail();
            if (favoritesPanel.classList.contains('open')) closeFavorites();
        }
    });
}

function openDetail(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    currentPrompt = prompt;

    document.getElementById('modal-image').src = prompt.image;
    document.getElementById('modal-prompt').textContent = prompt.prompt;
    document.getElementById('modal-category').textContent = prompt.category;
    updateModalFavBtn();

    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    currentPrompt = null;
}

function updateModalFavBtn() {
    const btn = document.getElementById('modal-fav-btn');
    const text = document.getElementById('modal-fav-text');
    const isFav = favorites.includes(currentPrompt.id);

    if (isFav) {
        btn.classList.add('active');
        text.textContent = 'Unfavorite';
    } else {
        btn.classList.remove('active');
        text.textContent = 'Favorite';
    }
}

// ===== Favorites =====
function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx === -1) {
        favorites.push(id);
        showToast('Added to favorites');
    } else {
        favorites.splice(idx, 1);
        showToast('Removed from favorites');
    }
    localStorage.setItem('pg_favorites', JSON.stringify(favorites));
    renderFavoritesList();
}

function setupFavoritesPanel() {
    document.getElementById('favorites-toggle').addEventListener('click', openFavorites);
    document.getElementById('close-favorites').addEventListener('click', closeFavorites);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.id = 'panel-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeFavorites);
}

function openFavorites() {
    renderFavoritesList();
    favoritesPanel.classList.add('open');
    document.getElementById('panel-backdrop').classList.add('show');
}

function closeFavorites() {
    favoritesPanel.classList.remove('open');
    document.getElementById('panel-backdrop').classList.remove('show');
}

function renderFavoritesList() {
    const list = document.getElementById('favorites-list');
    const empty = document.getElementById('favorites-empty');
    const favPrompts = prompts.filter(p => favorites.includes(p.id));

    if (favPrompts.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = favPrompts.map(p => `
        <div class="fav-item" data-id="${p.id}">
            <img src="${p.image}" alt="" class="fav-item-image">
            <div class="fav-item-info">
                <div class="fav-item-category">${p.category}</div>
                <div class="fav-item-prompt">${p.prompt}</div>
            </div>
            <button class="fav-item-remove" data-id="${p.id}" aria-label="Remove from favorites">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');

    // Click to open detail
    list.querySelectorAll('.fav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.fav-item-remove')) return;
            const id = parseInt(item.dataset.id);
            closeFavorites();
            openDetail(id);
        });
    });

    // Remove buttons
    list.querySelectorAll('.fav-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
            renderGallery(); // Update card states
        });
    });
}

// ===== Utilities =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Prompt copied!');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Prompt copied!');
    });
}

function showToast(message) {
    const msg = document.getElementById('toast-message');
    msg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
