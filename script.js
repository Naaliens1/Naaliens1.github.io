const API_KEY = '8725bd34101434452b1101972e010c72'; // Reemplaza con tu clave de GNews API
const GOOGLE_TRANSLATE_API_KEY = 'TU_CLAVE_API_GOOGLE_TRANSLATE'; // Reemplaza con tu clave de Google Translate
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

const categories = [
    { name: 'medicine', query: '"cannabis medicine" OR "cannabis medical" OR "cannabis health" in:title -inurl:(politics)' },
    { name: 'legislation', query: '"cannabis legislation" OR "cannabis law" OR "cannabis regulation" in:title -inurl:(health)' },
    { name: 'chile', query: '"cannabis chile" OR "marihuana chile" in:title lang:es' }
];

const dateFilterOptions = {
    '24h': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    'week': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    'month': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
};

let sortBy = 'publishedAt'; // Orden por defecto
let currentCategory = 'all';

// Obtener noticias con caché
async function fetchNewsForCategory(category, fromDate, sortBy) {
    const cacheKey = `news_${category.name}_${fromDate}_${sortBy}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cachedData && Date.now() - cachedTimestamp < CACHE_DURATION) return cachedData;

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(category.query)}&max=20&sortby=${sortBy}&apikey=${API_KEY}` +
                (fromDate ? `&from=${fromDate}` : '');
    try {
        const response = await fetch(url);
        const data = await response.json();
        const articles = data.articles.map(article => ({
            ...article,
            category: category.name,
            language: article.language || 'en'
        }));
        localStorage.setItem(cacheKey, JSON.stringify(articles));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now());
        return articles;
    } catch (error) {
        console.error(`Error al obtener ${category.name}:`, error);
        return [];
    }
}

// Renderizar noticias
function renderNews(articles) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';
    articles.forEach(article => {
        const div = document.createElement('div');
        div.classList.add('news-card');
        div.dataset.category = article.category;
        div.innerHTML = `
            <img src="${article.image || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}" alt="${article.title}" loading="lazy" class="w-full h-48 object-cover">
            <div class="p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="translate-toggle" onclick="translateDescription(this, '${article.description}', 'es')">Traducir</span>
                    <span class="language-badge">${article.language.toUpperCase()}</span>
                </div>
                <h2 class="text-lg font-semibold mb-2 line-clamp-2">${article.title}</h2>
                <p class="description text-gray-600 text-sm mb-3 line-clamp-3">${article.description || 'Sin descripción disponible.'}</p>
                <p class="text-xs text-gray-500 mb-3">Fuente: ${article.source.name} | ${new Date(article.publishedAt).toLocaleDateString('es-ES')}</p>
                <a href="${article.url}" target="_blank" class="text-blue-600 text-sm hover:underline">Leer más</a>
            </div>
        `;
        container.appendChild(div);
    });
}

// Filtrar noticias por categoría
function filterNews(category) {
    currentCategory = category;
    document.querySelectorAll('.news-card').forEach(card => {
        card.style.display = (category === 'all' || card.dataset.category === category) ? 'block' : 'none';
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('bg-gray-700', btn.dataset.category === category && btn.dataset.category !== 'chile');
        btn.classList.toggle('bg-white', btn.dataset.category === 'chile' && btn.dataset.category === category);
        btn.classList.toggle('text-white', btn.dataset.category === category && btn.dataset.category !== 'chile');
        btn.classList.toggle('text-gray-700', btn.dataset.category === 'chile' && btn.dataset.category === category);
    });
}

// Buscar noticias
function searchNews(query) {
    const lowerQuery = query.toLowerCase();
    document.querySelectorAll('.news-card').forEach(card => {
        const text = card.querySelector('h2').textContent.toLowerCase() + ' ' + card.querySelector('.description').textContent.toLowerCase();
        card.style.display = (currentCategory === 'all' || card.dataset.category === currentCategory) && text.includes(lowerQuery) ? 'block' : 'none';
    });
}

// Cargar noticias
async function loadNews() {
    const fromDate = dateFilterOptions[document.getElementById('date-filter').value] || '';
    const news = await Promise.all(categories.map(category => fetchNewsForCategory(category, fromDate, sortBy)));
    const allNews = news.flat();
    renderNews(allNews);
    filterNews(currentCategory);
}

// Traducir descripción
async function translateDescription(element, text, targetLanguage) {
    if (!GOOGLE_TRANSLATE_API_KEY || GOOGLE_TRANSLATE_API_KEY === 'TU_CLAVE_API_GOOGLE_TRANSLATE') {
        alert('Configura una clave API de Google Translate.');
        return;
    }
    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({ q: text, target: targetLanguage })
        });
        const data = await response.json();
        const translatedText = data.data.translations[0].translatedText;
        element.parentNode.nextSibling.nextSibling.nextSibling.textContent = translatedText; // Selecciona el párrafo de descripción
        element.textContent = 'Original';
        element.setAttribute('onclick', `showOriginalDescription(this, '${text}')`);
    } catch (error) {
        console.error('Error al traducir:', error);
    }
}

// Mostrar descripción original
function showOriginalDescription(element, originalText) {
    element.parentNode.nextSibling.nextSibling.nextSibling.textContent = originalText;
    element.textContent = 'Traducir';
    element.setAttribute('onclick', `translateDescription(this, '${originalText}', 'es')`);
}

// Listeners de eventos
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterNews(btn.dataset.category));
    });
    document.getElementById('search-bar').addEventListener('input', e => searchNews(e.target.value));
    document.getElementById('date-filter').addEventListener('change', loadNews);
    document.getElementById('relevance-toggle').addEventListener('click', () => {
        sortBy = sortBy === 'publishedAt' ? 'relevance' : 'publishedAt';
        document.getElementById('relevance-toggle').textContent = sortBy === 'publishedAt' ? 'Más reciente' : 'Más relevante';
        loadNews();
    });
    document.querySelectorAll('.keyword-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.getElementById('search-bar').value = tag.textContent;
            searchNews(tag.textContent);
        });
    });
});
