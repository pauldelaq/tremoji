document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const welcomeText = document.getElementById('welcome-text');
    const selectCategoryText = document.getElementById('select-category');
    const langButton = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');

    // Fetch the translation data from the JSON file
    fetch('data/index.json')
        .then(response => response.json())
        .then(data => {
            const translations = data.translations;
            const defaultLang = data.defaultLang || 'en';

            // Populate the language dropdown
            for (const lang in translations) {
                const a = document.createElement('a');
                a.href = '#';
                a.setAttribute('data-lang', lang);
                a.textContent = translations[lang].name;
                dropdownContent.appendChild(a);

                a.addEventListener('click', (event) => {
                    event.preventDefault();
                    updateLanguage(lang);
                });
            }

            function updateLanguage(lang) {
                const translation = translations[lang];

                document.querySelector('.container h1').textContent = 'Tr.Emoji';
                welcomeText.textContent = translation.welcome;
                selectCategoryText.textContent = translation.selectCategory;

                categoryList.innerHTML = '';
                translation.categories.forEach(category => {
                    const li = document.createElement('li');
                    li.className = 'category-item';
                    li.innerHTML = `${category.emoji} <span class="category-text">${category.text}</span>`;
                    categoryList.appendChild(li);

                    li.addEventListener('click', () => {
                        window.location.href = `skit.html?category=${encodeURIComponent(category.text)}`;
                    });
                });
            }

            // Set default language
            updateLanguage(defaultLang);
        })
        .catch(error => console.error('Error loading index.json:', error));

    const helpButton = document.querySelector('.help-btn');
    helpButton.addEventListener('click', () => {
        window.location.href = 'faq.html'; // Redirect to the FAQ page
    });

    langButton.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContent.classList.toggle('show');
    });

    // Close the dropdown when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!langButton.contains(event.target) && !dropdownContent.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });
});
