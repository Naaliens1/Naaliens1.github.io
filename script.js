const API_KEY = '8725bd34101434452b1101972e010c72'; // Clave API de GNews
const CACHE_DURATION = 600000; // 10 minutos en milisegundos
const GOOGLE_TRANSLATE_API_KEY = 'TU_CLAVE_API_GOOGLE_TRANSLATE'; // Reemplaza con tu clave de Google Translate

const categories = [
    { name: 'medicine', query: 'cannabis medicine OR cannabis medical', subcategories: [
        { name: 'odontologia-materiales', query: 'cannabis dentistry materials' },
        { name: 'odontologia-tecnicas', query: 'cannabis dentistry techniques' }
    ]},
    { name: 'legislation', query: 'cannabis legislation OR cannabis law', subcategories: [] }
];

async function fetchNews(language = 'es', fromDate = '', toDate = '', sortBy = 'publishedAt') {
    const errorContainer = document.getElementById('error-message');
    const newsContainer = document.getElementById('news-container');
    errorContainer.innerHTML = '';
    newsContainer.innerHTML = '<div class="loader"></div>';

    const cachedData = localStorage.getItem('newsData');
    const cachedTimestamp = localStorage.getItem('newsTimestamp');
    if (cachedData && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_DURATION) {
        return JSON.parse(cachedData);
    }

    const allNews = [];
    for (const category of categories) {
        let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(category.query)}&lang=${language}&max=20&sortby=${sortBy}&apikey=${API_KEY}`;
        if (fromDate) url += `&from=${fromDate}`;
        if (toDate) url += `&to=${toDate}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.articles) {
                data.articles.forEach(article => {
                    if (article.title && article.url) {
                        allNews.push({
                            title: article.title,
                            description: article.description || 'Sin descripción disponible.',
                            url: article.url,
                            source: article.source?.name || 'Fuente desconocida',
                            publishedAt: article.publishedAt || new Date().toISOString(),
                            category: category.name,
                            subcategory: null,
                            image: article.image || 'https://via.placeholder.com/300x150?text=Sin+Imagen',
                            originalLanguage: article.language || 'en'
                        });
                    }
                });
            }
        } catch (error) {
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML += `<p>Error al cargar ${category.name}: ${error.message}</p>`;
        }

        // Subcategorías
        for (const subcat of category.subcategories) {
            url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(subcat.query)}&lang=${language}&max=20&sortby=${sortBy}&apikey=${API_KEY}`;
            if (fromDate) url += `&from=${fromDate}`;
            if (toDate) url += `&to=${toDate}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.articles) {
                    data.articles.forEach(article => {
                        if (article.title && article.url) {
                            allNews.push({
                                title: article.title,
                                description: article.description || 'Sin descripción disponible.',
                                url: article.url,
                                source: article.source?.name || 'Fuente desconocida',
                                publishedAt: article.publishedAt || new Date().toISOString(),
                                category: category.name,
                                subcategory: subcat.name,
                                image: article.image || 'https://via.placeholder.com/300x150?text=Sin+Imagen',
                                originalLanguage: article.language || 'en'
                            });
                        }
                    });
                }
            } catch (error) {
                errorContainer.classList.remove('hidden');
                errorContainer.innerHTML += `<p>Error al cargar ${subcat.name}: ${error.message}</p>`;
            }
        }
    }

    localStorage.setItem('newsData', JSON.stringify(allNews));
    localStorage.setItem('newsTimestamp', Date.now());
    return allNews;
}

async function translateText(text, targetLanguage) {
    if (!GOOGLE_TRANSLATE_API_KEY) {
        console.error('Clave API de Google Translate no configurada.');
        return text;
    }
    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                target: targetLanguage
            })
        });
        const data = await response.json();
        return data.data.translations[0].translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return text;
    }
}

async function renderNews(articles, selectedLanguage) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';
    if (articles.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center">No hay noticias disponibles en este momento.</p>';
        return;
    }
    for (const article of articles) {
        let description = article.description;
        if (article.originalLanguage === 'en' && selectedLanguage === 'es') {
            description = await translateText(article.description, 'es');
        }
        const div = document.createElement('div');
        div.classList.add('news-card', 'bg-gray-800', 'rounded-lg', 'shadow-lg', 'overflow-hidden', 'transform', 'transition', 'hover:scale-105', 'duration-300');
        div.dataset.category = article.category;
        div.dataset.subcategory = article.subcategory || '';
        div.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="w-full h-48 object-cover" loading="lazy">
            <div class="p-4">
                <h2 class="text-xl font-semibold text-white mb-2">${article.title}</h2>
                <p class="text-gray-300 mb-3">${description}</p>
                <p class="text-sm text-gray-400 mb-3">Fuente: ${article.source} | Publicado: ${new Date(article.publishedAt).toLocaleDateString()}</p>
                <a href="${article.url}" target="_blank" class="text-blue-400 hover:underline">Leer más</a>
                ${article.originalLanguage === 'en' ? '<span class="text-yellow-400 ml-2">[ENG]</span>' : ''}
                ${article.subcategory ? `<p class="text-sm text-gray-500">Subcategoría: ${article.subcategory}</p>` : ''}
            </div>
        `;
        container.appendChild(div);
    }
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

async function loadNews() {
    const language = document.getElementById('language-select').value;
    const fromDate = document.getElementById('date-from').value;
    const toDate = document.getElementById('date-to').value;
    const sortBy = document.getElementById('search-bar').value ? 'relevance' : 'publishedAt';
    const news = await fetchNews(language, fromDate, toDate, sortBy);
    renderNews(news, language);
}

setInterval(loadNews, CACHE_DURATION);

async function init() {
    loadNews();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterNews(btn.dataset.category);
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('bg-blue-600'));
            btn.classList.add('bg-blue-600');
        });
    });

    document.getElementById('search-bar').addEventListener('input', (e) => {
        searchNews(e.target.value);
        if (e.target.value) loadNews(); // Recargar con relevancia si se busca
    });
    document.getElementById('refresh-button').addEventListener('click', loadNews);
    document.getElementById('language-select').addEventListener('change', loadNews);
    document.getElementById('date-from').addEventListener('change', loadNews);
    document.getElementById('date-to').addEventListener('change', loadNews);
}

init();
