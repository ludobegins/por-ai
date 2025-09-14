const translations = {
    'en': {
        'title': 'Ludo por aí ☀️🚲',
        'subtitle': 'A journey by bike from Natal to... ?',
        'arrival-label': 'Arrival',
        'basemap-outdoors': 'Outdoors',
        'basemap-dark': 'Dark',
        'basemap-satellite': 'Satellite',
    },
    'pt-br': {
        'title': 'Ludo por aí ☀️🚲',
        'subtitle': 'Jornada de bike de Natal até ...?',
        'arrival-label': 'Chegada',
        'basemap-outdoors': 'Natureza',
        'basemap-dark': 'Escuro',
        'basemap-satellite': 'Satélite',
    }
};

let currentLanguage = 'pt-br';

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);

    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        element.textContent = translations[lang][key];
    });

    document.getElementById('lang-pt-br').classList.toggle('active', lang === 'pt-br');
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
}

document.addEventListener('DOMContentLoaded', () => {
    const langToggleButton = document.getElementById('language-toggle-btn');
    const langOptions = document.querySelector('.language-options');

    langToggleButton.addEventListener('click', () => {
        langOptions.classList.toggle('hidden');
    });

    document.getElementById('lang-pt-br').addEventListener('click', () => {
        setLanguage('pt-br');
        langOptions.classList.add('hidden');
    });

    document.getElementById('lang-en').addEventListener('click', () => {
        setLanguage('en');
        langOptions.classList.add('hidden');
    });

    const savedLang = localStorage.getItem('preferredLanguage') || 'pt-br';
    setLanguage(savedLang);
});