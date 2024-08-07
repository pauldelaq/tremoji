document.addEventListener('DOMContentLoaded', () => {
    const helpButton = document.querySelector('.help-btn');
    helpButton.addEventListener('click', () => {
        window.location.href = 'index.html'; // Navigate directly to index.html
    });

    const dropdown = document.querySelector('.dropdown');
    const dropbtn = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');

    dropbtn.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    // Function to get the language from localStorage
    function getStoredLanguage() {
        return localStorage.getItem('currentLanguage') || 'en'; // Default to 'en' if no language stored
    }

    // Function to update the page content based on the current language
    const updateLanguage = async (lang) => {
        try {
            const response = await fetch('data/faq.json'); // Fetch the JSON file from data/faq.json
            if (!response.ok) {
                throw new Error('Failed to fetch translations data');
            }
            const data = await response.json(); // Parse JSON response
            const translations = data.translations;

            console.log('Translations:', translations); // Log the translations object
            const currentLang = translations[lang];
            if (currentLang) {
                document.getElementById('faq-title').textContent = currentLang.title;

                const faqContainer = document.getElementById('faqs');
                faqContainer.innerHTML = ''; // Clear existing content

                currentLang.faqs.forEach((faq, index) => {
                    const faqItem = document.createElement('div');
                    faqItem.classList.add('faq-item');

                    const questionElement = document.createElement('h2');
                    questionElement.textContent = faq.question;

                    const answerElement = document.createElement('p');
                    answerElement.innerHTML = faq.answer;

                    faqItem.appendChild(questionElement);
                    faqItem.appendChild(answerElement);

                    faqContainer.appendChild(faqItem);
                });

                // Update keyboard shortcuts
                const shortcutsList = document.getElementById('shortcuts-list');
                shortcutsList.innerHTML = ''; // Clear existing content

                currentLang.shortcuts.forEach(shortcut => {
                    const shortcutItem = document.createElement('div');
                    shortcutItem.classList.add('shortcut');

                    const shortcutKey = document.createElement('div');
                    shortcutKey.classList.add('shortcut-key');
                    shortcutKey.textContent = shortcut.key;

                    const shortcutDescription = document.createElement('div');
                    shortcutDescription.classList.add('shortcut-description');
                    shortcutDescription.textContent = shortcut.action;

                    shortcutItem.appendChild(shortcutKey);
                    shortcutItem.appendChild(shortcutDescription);

                    shortcutsList.appendChild(shortcutItem);
                });

                // Update keyboard shortcuts heading
                const keyboardShortcutsHeading = document.getElementById('keyboard-shortcuts-heading');
                if (keyboardShortcutsHeading) {
                    keyboardShortcutsHeading.textContent = currentLang.keyboardShortcutsHeading;
                } else {
                    console.error('Keyboard shortcuts heading element not found');
                }
            } else {
                console.error(`No data found for language: ${lang}`);
                console.log('Available languages:', Object.keys(translations)); // Log available languages
            }
        } catch (error) {
            console.error('Error fetching or parsing translations data:', error);
        }
    };

    // Populate the language dropdown
    const populateLanguageDropdown = async () => {
        try {
            const response = await fetch('data/faq.json'); // Fetch the JSON file from data/faq.json
            if (!response.ok) {
                throw new Error('Failed to fetch translations data');
            }
            const data = await response.json(); // Parse JSON response
            const translations = data.translations;

            console.log('Translations:', translations); // Log the translations object

            for (const lang in translations) {
                const a = document.createElement('a');
                a.href = '#';
                a.setAttribute('data-lang', lang);
                a.textContent = translations[lang].name; // Assuming each translation object has a `name` property
                dropdownContent.appendChild(a);

                a.addEventListener('click', (event) => {
                    event.preventDefault();
                    const lang = event.target.getAttribute('data-lang');
                    localStorage.setItem('currentLanguage', lang); // Store language in localStorage
                    updateLanguage(lang);
                    dropdownContent.classList.remove('show'); // Close the dropdown menu after language change
                });
            }
        } catch (error) {
            console.error('Error fetching or parsing translations data:', error);
        }
    };

    // Initialize with language from localStorage or default to 'en'
    const lang = getStoredLanguage();
    updateLanguage(lang);
    populateLanguageDropdown(); // Populate the dropdown after fetching translations
});
