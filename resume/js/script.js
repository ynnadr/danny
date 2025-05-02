document.addEventListener('DOMContentLoaded', () => {
    const langIdBtn = document.getElementById('lang-id-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const translatableElements = document.querySelectorAll('[data-translate]');
    let currentLangData = {};

    // Function to fetch language data
    async function loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load language file: ${response.statusText}`);
            }
            currentLangData = await response.json();
            updateTextElements();
            updateHtmlLangAttribute(lang); // Update HTML lang attr
            setActiveButton(lang); // Update active button style
            localStorage.setItem('preferredLang', lang); // Store preference
        } catch (error) {
            console.error('Error loading language:', error);
            // Optionally fallback to a default language or show an error
        }
    }

    // Function to update text content
    function updateTextElements() {
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (currentLangData[key]) {
                // Handle special cases like title
                if (element.tagName === 'TITLE') {
                    document.title = currentLangData[key];
                } else {
                    element.textContent = currentLangData[key];
                }
            } else {
                console.warn(`Translation key "${key}" not found in language file.`);
                // Keep original text if key not found (useful for debugging)
            }
        });
    }

    // Function to update HTML lang attribute
    function updateHtmlLangAttribute(lang) {
        document.documentElement.lang = lang;
    }

     // Function to set the active button style
     function setActiveButton(lang) {
        if (lang === 'id') {
            langIdBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        } else if (lang === 'en') {
            langEnBtn.classList.add('active');
            langIdBtn.classList.remove('active');
        }
     }

    // Event listeners for buttons
    langIdBtn.addEventListener('click', () => {
        if (document.documentElement.lang !== 'id') {
            loadLanguage('id');
        }
    });

    langEnBtn.addEventListener('click', () => {
         if (document.documentElement.lang !== 'en') {
            loadLanguage('en');
        }
    });

    // Initial load: Check localStorage or default to 'id'
    const preferredLang = localStorage.getItem('preferredLang') || 'id';
    loadLanguage(preferredLang);
});
