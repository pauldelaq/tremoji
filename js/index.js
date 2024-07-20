document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const welcomeText = document.getElementById('welcome-text');
    const selectCategoryText = document.getElementById('select-category');
    const langButton = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');
    const helpButton = document.querySelector('.help-btn'); // Add this line to select the help button

    // Mapping of category IDs to their corresponding JSON file names
    const categoryFileNames = {
        1: "Emotions",
        2: "Jobs",
        3: "Sports",
        4: "Actions",
        5: "People",
        6: "Animals",
        7: "Plants",
        8: "Food",
        9: "Geography",
        10: "Countries",
        11: "Transportation",
        12: "Time",
        13: "Weather",
        14: "Clothing",
        15: "SportsEquipment",
        16: "MusicalInstruments",
        17: "Stationery",
        18: "HouseholdItems",
        19: "Religion"
    };

    // Retrieve the stored language from localStorage or fallback to 'en'
    const currentLang = localStorage.getItem('currentLanguage') || 'en';

    // Fetch the translation data from the JSON file
    fetch('data/index.json')
        .then(response => response.json())
        .then(data => {
            const translations = data.translations;
            const defaultLang = data.defaultLang || 'en';

            // Ensure currentLang is valid or fallback to defaultLang
            const validLang = translations[currentLang] ? currentLang : defaultLang;

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
                        const categoryFileName = categoryFileNames[category.id]; // Get the file name for the category ID
                        window.location.href = `skit.html?category=${encodeURIComponent(categoryFileName)}`;
                    });
                });                

                // Store the current language in localStorage for consistency
                localStorage.setItem('currentLanguage', lang);
            }

            // Set default language
            updateLanguage(validLang);

            // Add event listener for the language dropdown button
            langButton.addEventListener('click', () => {
                dropdownContent.classList.toggle('show');
            });

            // Close the dropdown menu if the user clicks outside of it
            window.onclick = (event) => {
                if (!event.target.matches('.dropbtn')) {
                    if (dropdownContent.classList.contains('show')) {
                        dropdownContent.classList.remove('show');
                    }
                }
            };

            // Add event listener for the help button
            helpButton.addEventListener('click', () => {
                window.location.href = 'faq.html'; // Navigate to FAQ page without language in the URL
            });

        })
        .catch(error => {
            console.error('Error loading index.json:', error);
        });
});
