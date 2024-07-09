document.addEventListener('DOMContentLoaded', () => {
    const helpButton = document.querySelector('.help-btn');
    helpButton.addEventListener('click', () => {
        window.history.back(); // Return to the previous page
    });

    const dropdown = document.querySelector('.dropdown');
    const dropbtn = document.querySelector('.dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');

    dropbtn.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    const updateLanguage = async (lang) => {
        try {
            const response = await fetch('data/faq.json'); // Fetch the JSON file from data/faq.json
            if (!response.ok) {
                throw new Error('Failed to fetch translations data');
            }
            const translations = await response.json(); // Parse JSON response

            const selectedLang = translations[lang];
            if (selectedLang) {
                document.getElementById('faq-title').textContent = selectedLang.title;

                const faqContainer = document.getElementById('faqs');
                faqContainer.innerHTML = ''; // Clear existing content

                selectedLang.faqs.forEach((faq, index) => {
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

                selectedLang.shortcuts.forEach(shortcut => {
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
                    keyboardShortcutsHeading.textContent = selectedLang.keyboardShortcutsHeading;
                } else {
                    console.error('Keyboard shortcuts heading element not found');
                }
            } else {
                console.error(`No data found for language: ${lang}`);
            }
        } catch (error) {
            console.error('Error fetching or parsing translations data:', error);
        }
    };

    const languageLinks = document.querySelectorAll('.dropdown-content a');
    languageLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const lang = event.target.getAttribute('data-lang');
            updateLanguage(lang);
        });
    });

    // Initialize with English as default
    updateLanguage('en');
});
