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
    const settingsButton = document.querySelector('.dropbtn-settings');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const svgSwitch = document.getElementById('svgSwitch');

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

    const currentLang = localStorage.getItem('currentLanguage') || 'en';
    const showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    
    if (svgSwitch) {
        svgSwitch.checked = showSvg;
        if (showSvg) {
            convertToSvg();
        } else {
            revertToEmojis();
        }
    }

    fetch('data/index.json')
        .then(response => response.json())
        .then(data => {
            const emojis = data.emojis;
            const translations = data.translations;
            const defaultLang = data.defaultLang || 'en';
            const validLang = translations[currentLang] ? currentLang : defaultLang;

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

            function wrapEmoji(emoji) {
                return `<span class="emoji" data-emoji="${emoji}">${emoji}</span>`;
            }

            function wrapEmojiArray(emojiArray) {
                return emojiArray.map(wrapEmoji).join('');
            }

            function updateLanguage(lang) {
                const translation = translations[lang];

                document.querySelector('.container h1').textContent = 'Tr.Emoji';
                welcomeText.textContent = translation.welcome;
                selectCategoryText.textContent = translation.selectCategory;

                categoryList.innerHTML = '';
                translation.categories.forEach(category => {
                    const emojiArray = emojis[category.id] || [];
                    const li = document.createElement('li');
                    li.className = 'category-item';
                    li.innerHTML = `${wrapEmojiArray(emojiArray)} <span class="category-text">${category.text}</span>`;
                    categoryList.appendChild(li);

                    li.addEventListener('click', () => {
                        const categoryFileName = categoryFileNames[category.id];
                        window.location.href = `skit.html?category=${encodeURIComponent(categoryFileName)}`;
                    });
                });

                localStorage.setItem('currentLanguage', lang);
            }

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

    // Function to get the emoji code from a single emoji character
    function getEmojiCode(emoji) {
        // Convert emoji to code points
        return [...emoji].map(e => e.codePointAt(0).toString(16).padStart(4, '0')).join('-').toUpperCase();
    }

    // Function to convert emojis to SVG
    function convertToSvg() {
        document.querySelectorAll('.emoji').forEach(emojiSpan => {
            // Get the text content and split it into individual emojis
            const emojis = [...emojiSpan.textContent];

            // Map each emoji to its SVG representation
            emojiSpan.innerHTML = emojis.map(emoji => {
                const emojiCode = getEmojiCode(emoji);

                if (emojiCode) {
                    // Generate the URL for each emoji
                    let newUrl = `https://openmoji.org/data/color/svg/${emojiCode}.svg`;
                    if (emojiCode.length === 10) newUrl = newUrl.replace("-FE0F", ""); // Handle variation selectors

                    return `<img src="${newUrl}" style="height: 1.2em;" alt="${emoji}">`; // Set height to 1.2em for slightly larger size
                }
                return emoji; // Return the original emoji if no URL is generated
            }).join(''); // Join the images back into the inner HTML of the span
        });
    }

    // Function to revert to regular emojis
    function revertToEmojis() {
        document.querySelectorAll('.emoji').forEach(emojiSpan => {
            const imgElements = emojiSpan.querySelectorAll('img');
            if (imgElements.length > 0) {
                // Collect the alt text from each img element
                const emojis = Array.from(imgElements).map(img => img.getAttribute('alt')).join('');
                emojiSpan.textContent = emojis;
            }
        });
    }
});
