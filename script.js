const API_KEY = '8725bd34101434452b1101972e010c72'; // Clave API de GNews
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
    errorContainer.innerHTML = ''; // Limpiar errores previos

    // Verificar caché
    const cachedData = localStorage.getItem('newsData');
    const cachedTimestamp = localStorage.getItem('newsTimestamp');
    if (cachedData && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_DURATION) {
        return JSON.parse(cachedData);
    }

    const allNews = [];
    for (const category of categories) {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(category.query)}&lang=es,en&max=10&apikey=${API_KEY}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (data.articles) {
                if (data.articles.length === 0) {
                    errorContainer.classList.remove('hidden');
                    errorContainer.innerHTML += `<p>No se encontraron noticias para ${category.name}.</p>`;
                }
                data.articles.forEach(article => {
                    if (article.title && article.url) {
                        allNews.push({
                            title: article.title,
                            description: article.description || 'No description available.',
                            url: article.url,
                            source: article.source?.name || 'Unknown Source',
                            publishedAt: article.publishedAt || new Date().toISOString(),
                            category: category.name,
                            image: article.image || 'https://via.placeholder.com/300x150?text=No+Image' // Imagen por defecto si no hay
                        });
                    }
                });
            } else {
                throw new Error(data.errors?.join(', ') || 'Error desconocido de GNews API');
            }
        } catch (error) {
            console.error(`Error fetching ${category.name}:`, error);
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML += `<p>Error al cargar ${category.name}: ${error.message}</p>`;
        }
    }

    if (allNews.length === 0) {
        errorContainer.classList.remove('hidden');
        errorContainer.innerHTML += '<p>No se encontraron noticias para ninguna categoría. Verifica tu conexión o intenta de nuevo más tarde.</p>';
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
        container.innerHTML = '<p class="text-gray-500 text-center">No hay noticias disponibles en este momento.</p>';
        return;
    }
    articles.forEach(article => {
        const div = document.createElement('div');
        div.classList.add('news-card', 'bg-white', 'rounded-lg', 'shadow-lg', 'overflow-hidden', 'transform', 'transition', 'hover:scale-105', 'duration-300');
        div.dataset.category = article.category;
        div.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="w-full h-48 object-cover">
            <div class="p-4">
                <h2 class="text-xl font-semibold text-gray-800 mb-2">${article.title}</h2>
                <p class="text-gray-600 mb-3">${article.description}</p>
                <p class="text-sm text-gray-500 mb-3">Source: ${article.source} | Published: ${new Date(article.publishedAt).toLocaleDateString()}</p>
                <a href="${article.url}" target="_blank" class="text-blue-500 hover:underline">Read more</a>
            </div>
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
        btn.addEventListener('click', () => {
            filterNews(btn.dataset.category);
            // Resaltar botón activo
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('bg-blue-600'));
            btn.classList.add('bg-blue-600');
        });
    });

    document.getElementById('search-bar').addEventListener('input', (e) => searchNews(e.target.value));
}

init();
