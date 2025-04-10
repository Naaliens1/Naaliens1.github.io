const API_KEY = '8725bd34101434452b1101972e010c72'; // Reemplaza con tu clave de GNews
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const categories = [
    { name: 'medicine', query: 'cannabis medicine OR cannabis medical' },
    { name: 'legislation', query: 'cannabis legislation OR cannabis law' },
    { name: 'chile', query: 'cannabis chile AND (avances OR noticias)' }
];

// Fetch news with caching
async function fetchNews(language = 'es', fromDate = '', toDate = '', sortBy = 'publishedAt') {
    const errorContainer = document.getElementById('error-message');
    const newsContainer = document.getElementById('news-container');
    errorContainer.classList.add('hidden');
    newsContainer.innerHTML = '<div class="loader"></div>';

    const cacheKey = `news_${language}_${fromDate}_${toDate}_${sortBy}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cachedData && Date.now() - cachedTimestamp < CACHE_DURATION) return cachedData;

    const allNews = [];
    for (const category of categories) {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(category.query)}&lang=${language}&max=20&sortby=${sortBy}&apikey=${API_KEY}` +
            (fromDate ? `&from=${fromDate}` : '') + (toDate ? `&to=${toDate}` : '');
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.articles) {
                allNews.push(...data.articles.map(article => ({
                    title: article.title || 'Sin título',
                    description: article.description || 'Sin descripción',
                    url: article.url,
                    source: article.source?.name || 'Desconocido',
                    publishedAt: article.publishedAt || new Date().toISOString(),
                    category: category.name,
                    image: article.image || 'https://via.placeholder.com/300x150?text=Sin+Imagen'
                })));
            }
        } catch (error) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = `Error al cargar ${category.name}: ${error.message}`;
        }
    }

    localStorage.setItem(cacheKey, JSON.stringify(allNews));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now());
    return allNews;
}

// Render news cards
function renderNews(articles) {
    const container = document.getElementById('news-container');
    container.innerHTML = articles.length ? '' : '<p class="text-gray-400 text-center">No hay noticias disponibles.</p>';
    articles.forEach(article => {
        const div = document.createElement('div');
        div.classList.add('news-card', 'bg-gray-800', 'rounded-lg', 'shadow-lg', 'overflow-hidden', 'transition', 'hover:scale-105');
        div.dataset.category = article.category;
        div.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="w-full h-48 object-cover" loading="lazy">
            <div class="p-4">
                <h2 class="text-xl font-semibold mb-2">${article.title}</h2>
                <p class="text-gray-300 mb-3">${article.description}</p>
                <p class="text-sm text-gray-400 mb-3">Fuente: ${article.source} | ${new Date(article.publishedAt).toLocaleDateString()}</p>
                <a href="${article.url}" target="_blank" class="text-blue-400 hover:underline">Leer más</a>
            </div>
        `;
        container.appendChild(div);
    });
}

// Filter news by category
function filterNews(category) {
    document.querySelectorAll('#news-container > div').forEach(article => {
        article.style.display = (category === 'all' || article.dataset.category === category) ? 'block' : 'none';
    });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('bg-blue-600', btn.dataset.category === category));
}

// Search news
function searchNews(query) {
    const lowerQuery = query.toLowerCase();
    document.querySelectorAll('#news-container > div').forEach(article => {
        const text = `${article.querySelector('h2').textContent} ${article.querySelector('p').textContent}`.toLowerCase();
        article.style.display = text.includes(lowerQuery) ? 'block' : 'none';
    });
}

// Load news with filters
async function loadNews() {
    const language = document.getElementById('language-select').value;
    const fromDate = document.getElementById('date-from').value;
    const toDate = document.getElementById('date-to').value;
    const sortBy = document.getElementById('search-bar').value ? 'relevance' : 'publishedAt';
    const news = await fetchNews(language, fromDate, toDate, sortBy);
    renderNews(news);
}

// Event listeners
function init() {
    loadNews();
    setInterval(loadNews, CACHE_DURATION);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterNews(btn.dataset.category));
    });
    document.getElementById('search-bar').addEventListener('input', e => {
        searchNews(e.target.value);
        if (e.target.value) loadNews();
    });
    document.getElementById('refresh-button').addEventListener('click', loadNews);
    document.getElementById('language-select').addEventListener('change', loadNews);
    document.getElementById('date-from').addEventListener('change', loadNews);
    document.getElementById('date-to').addEventListener('change', loadNews);
}

init();
