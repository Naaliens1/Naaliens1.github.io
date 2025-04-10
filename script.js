// Configuración de claves API y parámetros de caché
const API_KEY = '8725bd34101434452b1101972e010c72'; // Reemplaza con tu clave de GNews API
const GOOGLE_TRANSLATE_API_KEY = 'TU_CLAVE_API_GOOGLE_TRANSLATE'; // Reemplaza con tu clave de Google Translate
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Lista de dominios de medios reconocidos (ajústalos según tus necesidades)
const recognizedDomains = 'bbc.co.uk,cnn.com,nytimes.com,elpais.com,latimes.com';

// Definición de categorías con queries mejoradas:
// - La categoría "salud" incluye términos de cannabis y salud
// - La categoría "legislation" define reglas para legislación de cannabis
// - La categoría "chile" prioriza resultados que contengan "cannabis", "chile" y "salud" (en español)
const categories = [
    { 
        name: 'salud', 
        query: '"cannabis health" OR "cannabis medicine" OR "salud cannabis" OR "cannabis medical"'
    },
    { 
        name: 'legislation', 
        query: '"cannabis legislation" OR "cannabis law" OR "cannabis regulation"'
    },
    { 
        name: 'chile', 
        query: '"cannabis chile" OR "marihuana chile" OR "salud cannabis chile"'
    }
];

// Opciones de filtro por fecha
const dateFilterOptions = {
    '24h': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    'week': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    'month': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
};

let sortBy = 'publishedAt'; // Orden por defecto
let currentCategory = 'all';

// Función que obtiene noticias para una categoría con cacheo y manejo de errores
async function fetchNewsForCategory(category, fromDate, sortBy) {
    const cacheKey = `news_${category.name}_${fromDate}_${sortBy}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cachedData && Date.now() - cachedTimestamp < CACHE_DURATION) return cachedData;

    // Construcción de la URL: se eliminó "in:title" para evitar problemas de formato en la consulta.
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(category.query)}&max=20&sortby=${sortBy}&apikey=${API_KEY}&domains=${recognizedDomains}` +
                (fromDate ? `&from=${fromDate}` : '');
    try {
        // Imprime la URL para depuración
        console.log(`Consultando ${category.name}: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        
        // Verifica si la respuesta contiene la propiedad "articles"
        if (!data.articles) {
            console.error(`API error en ${category.name}:`, data);
            return [];
        }
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

// Renderiza las noticias en la interfaz de usuario
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
                    <span class="translate-toggle" onclick="translateDescription(this, \`${article.description}\`, 'es')">Traducir</span>
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

// Filtra las noticias según la categoría seleccionada
function filterNews(category) {
    currentCategory = category;
    document.querySelectorAll('.news-card').forEach(card => {
        card.style.display = (category === 'all' || card.dataset.category === category) ? 'block' : 'none';
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Función de búsqueda que revisa título y descripción
function searchNews(query) {
    const lowerQuery = query.toLowerCase();
    document.querySelectorAll('.news-card').forEach(card => {
        const text = card.querySelector('h2').textContent.toLowerCase() + ' ' + card.querySelector('.description').textContent.toLowerCase();
        card.style.display = (currentCategory === 'all' || card.dataset.category === currentCategory) && text.includes(lowerQuery) ? 'block' : 'none';
    });
}

// Función principal para cargar las noticias de todas las categorías
async function loadNews() {
    const fromDate = dateFilterOptions[document.getElementById('date-filter').value] || '';
    const newsArray = await Promise.all(categories.map(category => fetchNewsForCategory(category, fromDate, sortBy)));
    const allNews = newsArray.flat();
    renderNews(allNews);
    filterNews(currentCategory);
}

// Función que traduce la descripción usando Google Translate
async function translateDescription(element, text, targetLanguage) {
    if (!GOOGLE_TRANSLATE_API_KEY || GOOGLE_TRANSLATE_API_KEY === 'TU_CLAVE_API_GOOGLE_TRANSLATE') {
        alert('Configura una clave API de Google Translate.');
        return;
    }
    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({ q: text, target: targetLanguage }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const translatedText = data.data.translations[0].translatedText;
        // Actualiza la descripción traducida
        element.parentNode.nextElementSibling.nextElementSibling.textContent = translatedText;
        element.textContent = 'Original';
        element.setAttribute('onclick', `showOriginalDescription(this, \`${text}\`)`);
    } catch (error) {
        console.error('Error al traducir:', error);
    }
}

// Función que restaura la descripción original
function showOriginalDescription(element, originalText) {
    element.parentNode.nextElementSibling.nextElementSibling.textContent = originalText;
    element.textContent = 'Traducir';
    element.setAttribute('onclick', `translateDescription(this, \`${originalText}\`, 'es')`);
}

// Configuración de eventos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    loadNews();

    // Configuración de botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterNews(btn.dataset.category));
    });

    // Búsqueda dinámica
    document.getElementById('search-bar').addEventListener('input', e => searchNews(e.target.value));

    // Actualiza noticias al cambiar el filtro de fecha
    document.getElementById('date-filter').addEventListener('change', loadNews);

    // Botón para cambiar el orden (más reciente / más relevante)
    document.getElementById('relevance-toggle').addEventListener('click', () => {
        sortBy = sortBy === 'publishedAt' ? 'relevance' : 'publishedAt';
        document.getElementById('relevance-toggle').textContent = sortBy === 'publishedAt' ? 'Más reciente' : 'Más relevante';
        loadNews();
    });

    // Etiquetas clave para búsquedas rápidas
    document.querySelectorAll('.keyword-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.getElementById('search-bar').value = tag.textContent;
            searchNews(tag.textContent);
        });
    });
});
