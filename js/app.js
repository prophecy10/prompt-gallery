// ===== State =====
let prompts = [];
let favorites = JSON.parse(localStorage.getItem('pg_favorites')) || [];
let viewCounts = JSON.parse(localStorage.getItem('pg_views')) || {};
let currentCategory = 'all';
let currentPrompt = null;
let searchQuery = '';
let displayedCount = 0;
const BATCH_SIZE = 20;

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
    setupSearch();
    setupModal();
    setupFavoritesPanel();
    setupInfiniteScroll();
    setupPullToRefresh();
    setupSwipeNavigation();
    registerServiceWorker();
    await loadPrompts();
    renderGallery();
}

// ===== Data Loading =====
async function loadPrompts() {
    try {
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

// ===== Filtering & Search =====
function getFilteredPrompts() {
    let filtered = currentCategory === 'all'
        ? prompts
        : prompts.filter(p => p.category === currentCategory);

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => p.prompt.toLowerCase().includes(query));
    }

    return filtered;
}

// ===== Rendering =====
function renderGallery() {
    displayedCount = 0;
    galleryGrid.innerHTML = '';

    const filtered = getFilteredPrompts();

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    loadMoreCards();
}

function loadMoreCards() {
    const filtered = getFilteredPrompts();
    const nextBatch = filtered.slice(displayedCount, displayedCount + BATCH_SIZE);

    if (nextBatch.length === 0) return;

    const html = nextBatch.map(cardHTML).join('');
    galleryGrid.insertAdjacentHTML('beforeend', html);
    displayedCount += nextBatch.length;

    attachCardListeners();
}

function cardHTML(prompt) {
    const isFav = favorites.includes(prompt.id);
    const isNew = isNewPrompt(prompt.date);
    const views = viewCounts[prompt.id] || 0;

    return `
        <div class="gallery-card" data-id="${prompt.id}">
            <div class="card-image-wrap loading">
                <img src="${prompt.image}" alt="AI prompt image" class="card-image" loading="lazy" onload="this.parentElement.classList.remove('loading')">
                ${isNew ? '<span class="card-badge">New</span>' : ''}
                ${views > 0 ? `<span class="card-views"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>${views}</span>` : ''}
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

function isNewPrompt(dateStr) {
    const promptDate = new Date(dateStr);
    const now = new Date();
    const diffDays = (now - promptDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 3; // "New" badge for prompts added in last 3 days
}

function attachCardListeners() {
    galleryGrid.querySelectorAll('.gallery-card').forEach(card => {
        // Remove old listeners by cloning (only for newly added)
        if (card.dataset.bound) return;
        card.dataset.bound = 'true';

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-btn')) return;
            const id = parseInt(card.dataset.id);
            openDetail(id);
        });
    });

    galleryGrid.querySelectorAll('.card-fav-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
            btn.classList.toggle('favorited', favorites.includes(id));
        });
    });

    galleryGrid.querySelectorAll('.card-copy-btn').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';

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

// ===== Infinite Scroll =====
function setupInfiniteScroll() {
    const sentinel = document.getElementById('load-more-sentinel');
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreCards();
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
}

// ===== Search =====
function setupSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    searchToggle.addEventListener('click', () => {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            searchQuery = '';
            renderGallery();
        }
    });

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = searchInput.value.trim();
            renderGallery();
        }, 300);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchBar.classList.add('hidden');
        renderGallery();
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

    // Navigation arrows
    document.getElementById('modal-prev').addEventListener('click', () => navigateModal(-1));
    document.getElementById('modal-next').addEventListener('click', () => navigateModal(1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (detailModal.classList.contains('open')) closeDetail();
            if (favoritesPanel.classList.contains('open')) closeFavorites();
        }
        if (detailModal.classList.contains('open')) {
            if (e.key === 'ArrowLeft') navigateModal(-1);
            if (e.key === 'ArrowRight') navigateModal(1);
        }
    });
}

function openDetail(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    currentPrompt = prompt;

    // Increment view count
    viewCounts[id] = (viewCounts[id] || 0) + 1;
    localStorage.setItem('pg_views', JSON.stringify(viewCounts));

    document.getElementById('modal-image').src = prompt.image;
    document.getElementById('modal-prompt').textContent = prompt.prompt;
    document.getElementById('modal-category').textContent = prompt.category;
    document.getElementById('modal-view-count').textContent = viewCounts[id];
    updateModalFavBtn();
    updateNavButtons();

    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    currentPrompt = null;
}

function navigateModal(direction) {
    if (!currentPrompt) return;
    const filtered = getFilteredPrompts();
    const currentIdx = filtered.findIndex(p => p.id === currentPrompt.id);
    const nextIdx = currentIdx + direction;

    if (nextIdx < 0 || nextIdx >= filtered.length) return;

    openDetail(filtered[nextIdx].id);
}

function updateNavButtons() {
    const filtered = getFilteredPrompts();
    const currentIdx = filtered.findIndex(p => p.id === currentPrompt.id);
    document.getElementById('modal-prev').disabled = currentIdx <= 0;
    document.getElementById('modal-next').disabled = currentIdx >= filtered.length - 1;
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

// ===== Swipe Navigation (touch) =====
function setupSwipeNavigation() {
    const modalContainer = document.getElementById('modal-container');
    let touchStartX = 0;
    let touchEndX = 0;

    modalContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modalContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 60) { // Minimum swipe distance
            if (diff > 0) {
                navigateModal(1); // Swipe left → next
            } else {
                navigateModal(-1); // Swipe right → prev
            }
        }
    }, { passive: true });
}

// ===== Pull to Refresh =====
function setupPullToRefresh() {
    const indicator = document.getElementById('pull-indicator');
    let startY = 0;
    let pulling = false;

    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
            pulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        const diff = e.touches[0].pageY - startY;
        if (diff > 80 && window.scrollY === 0) {
            indicator.classList.add('visible');
        }
    }, { passive: true });

    document.addEventListener('touchend', async () => {
        if (indicator.classList.contains('visible')) {
            indicator.classList.add('refreshing');
            indicator.querySelector('span').textContent = 'Refreshing...';

            await loadPrompts();
            renderGallery();

            setTimeout(() => {
                indicator.classList.remove('visible', 'refreshing');
                indicator.querySelector('span').textContent = 'Release to refresh';
            }, 800);
        }
        pulling = false;
    }, { passive: true });
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

    list.querySelectorAll('.fav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.fav-item-remove')) return;
            const id = parseInt(item.dataset.id);
            closeFavorites();
            openDetail(id);
        });
    });

    list.querySelectorAll('.fav-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
            renderGallery();
        });
    });
}

// ===== PWA Service Worker =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // Service worker registration failed, not critical
        });
    }
}

// ===== Utilities =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Prompt copied!');
    }).catch(() => {
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
