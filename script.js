const API_KEY = '75f4e7e6c419452cb8874c1201750deb'; // Clave API ya reemplazada
const CACHE_DURATION = 3600000; // 1 hora en milisegundos

const categories = [
    { name: 'cannabis-medicine', query: 'cannabis medicine OR cannabis medical' },
    { name: 'cannabis-legislation', query: 'cannabis legislation OR cannabis law' },
    { name: 'dentistry-materials', query: 'dentistry materials OR dental materials' },
    { name: 'dentistry-techniques', query: 'dentistry techniques OR dental techniques' }
];

async function fetchNews() {
    const errorContainer = document.getElementById('error-message');
    const newsContainer = document.getElementById('news-container');

    // Verificar caché
    const cachedData = localStorage.getItem('newsData');
    const cachedTimestamp = localStorage.getItem('newsTimestamp');
    if (cachedData && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_DURATION) {
        return JSON.parse(cachedData);
    }

    const allNews = [];
    for (const category of categories) {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(category.query)}&apiKey=${API_KEY}&pageSize=10`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (data.status === 'ok') {
                data.articles.forEach(article => {
                    // Validar datos del artículo
                    if (article.title && article.url) {
                        allNews.push({
                            title: article.title,
                            description: article.description || 'No description available.',
                            url: article.url,
                            source: article.source?.name || 'Unknown Source',
                            publishedAt: article.publishedAt || new Date().toISOString(),
                            category: category.name
                        });
                    }
                });
            } else {
                throw new Error(data.message || 'Error desconocido de NewsAPI');
            }
        } catch (error) {
            console.error(`Error fetching ${category.name}:`, error);
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML += `<p>Error al cargar ${category.name}: ${error.message}</p>`;
        }
    }

    if (allNews.length === 0) {
        errorContainer.classList.remove('hidden');
        errorContainer.innerHTML = '<p>No se pudieron cargar noticias. Verifica tu clave API o conexión a internet.</p>';
        newsContainer.innerHTML = '';
        return [];
    }

    localStorage.setItem('newsData', JSON.stringify(allNews));
    localStorage.setItem('newsTimestamp', Date.now());
    return allNews;
}

function renderNews(articles) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';
    if (articles.length === 0) {
        container.innerHTML = '<p>No hay noticias disponibles en este momento.</p>';
        return;
    }
    articles.forEach(article => {
        const div = document.createElement('div');
        div.classList.add('bg-white', 'p-4', 'rounded', 'shadow');
        div.dataset.category = article.category;
        div.innerHTML = `
            <h2 class="text-xl font-bold">${article.title}</h2>
            <p class="text-gray-600">${article.description}</p>
            <p class="text-sm text-gray-500">Source: ${article.source} | Published: ${new Date(article.publishedAt).toLocaleDateString()}</p>
            <a href="${article.url}" target="_blank" class="text-blue-500">Read more</a>
        `;
        container.appendChild(div);
    });
}

function filterNews(category) {
    const articles = document.querySelectorAll('#news-container > div');
    articles.forEach(article => {
        if (category === 'all' || article.dataset.category === category) {
            article.style.display = 'block';
        } else {
            article.style.display = 'none';
        }
    });
}

function searchNews(query) {
    const lowerQuery = query.toLowerCase();
    const articles = document.querySelectorAll('#news-container > div');
    articles.forEach(article => {
        const title = article.querySelector('h2').textContent.toLowerCase();
        const description = article.querySelector('p').textContent.toLowerCase();
        if (title.includes(lowerQuery) || description.includes(lowerQuery)) {
            article.style.display = 'block';
        } else {
            article.style.display = 'none';
        }
    });
}

async function init() {
    const news = await fetchNews();
    renderNews(news);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterNews(btn.dataset.category));
    });

    document.getElementById('search-bar').addEventListener('input', (e) => searchNews(e.target.value));
}

init();
