// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
}

document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const welcomeText = document.getElementById('welcome-text');
    const selectCategoryText = document.getElementById('select-category');
    const langButton = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');
    const helpButton = document.querySelector('.help-btn');
    const settingsButton = document.querySelector('.dropbtn-settings'); // Use the correct class for the settings button
    const settingsDropdown = document.getElementById('settingsDropdown');
    const svgSwitch = document.getElementById('svgSwitch');

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

    // Initialize Show SVG setting from localStorage
    const showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    if (svgSwitch) {
        svgSwitch.checked = showSvg;
        if (showSvg) {
            convertToSvg();
        } else {
            revertToEmojis();
        }
    }

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
                        const categoryFileName = categoryFileNames[category.id];
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

            // Add event listener for the Settings dropdown button
            if (settingsButton) {
                settingsButton.addEventListener('click', () => {
                    toggleDropdown('settingsDropdown');
                });
            }

            // Close the dropdown menus if the user clicks outside of them
            window.onclick = (event) => {
                if (!event.target.matches('.dropbtn') && !event.target.matches('.dropbtn-settings')) {
                    if (dropdownContent.classList.contains('show')) {
                        dropdownContent.classList.remove('show');
                    }
                    if (settingsDropdown.classList.contains('show')) {
                        settingsDropdown.classList.remove('show');
                    }
                }
            };

            // Add event listener for the help button
            helpButton.addEventListener('click', () => {
                window.location.href = 'faq.html';
            });

        })
        .catch(error => {
            console.error('Error loading index.json:', error);
        });

    // Add event listener for the Show SVG switch
    if (svgSwitch) {
        svgSwitch.addEventListener('change', () => {
            toggleSvg();
        });
    }

// Function to toggle SVG display
function toggleSvg() {
    const showSvg = svgSwitch.checked;
    localStorage.setItem('showSvg', JSON.stringify(showSvg)); // Store the state in localStorage
    if (showSvg) {
        convertToSvg();
    } else {
        revertToEmojis();
    }
}

// Function to convert emojis to SVG
function convertToSvg() {
    document.querySelectorAll('.emoji-container').forEach(container => {
        container.querySelectorAll('.emoji').forEach(emojiSpan => {
            const emoji = emojiSpan.textContent;
            const emojiCode = [...emoji].map(e => {
                if (e.codePointAt) {
                    return e.codePointAt(0).toString(16).padStart(4, '0');
                } else {
                    return '';
                }
            }).join('-').toUpperCase();
            if (emojiCode) {
                let newUrl = `https://openmoji.org/data/color/svg/${emojiCode}.svg`;
                if (emojiCode.length === 10) newUrl = newUrl.replace("-FE0F", "");
                emojiSpan.innerHTML = `<img src="${newUrl}" style="height: 1.2em;" alt="${emoji}">`; // Set height to 1.2em for slightly larger size
            }
        });
    });
}

// Function to revert to regular emojis
function revertToEmojis() {
    document.querySelectorAll('.emoji-container').forEach(container => {
        container.querySelectorAll('.emoji').forEach(emojiSpan => {
            const imgElement = emojiSpan.querySelector('img');
            if (imgElement) {
                const emojiAlt = imgElement.getAttribute('alt');
                emojiSpan.textContent = emojiAlt;
            }
        });
    });
}
});
