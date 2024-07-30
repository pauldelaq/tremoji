// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
}

// Function to open the modal
function openModal() {
    const confirmationModal = document.getElementById('confirmationModal');
    confirmationModal.style.display = 'block';
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
    const resetScoresText = document.getElementById('resetScoresText'); // Reference to the reset scores text span
    const confirmationModal = document.getElementById('confirmationModal');

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
        15: "Religion",
        16: "MusicalInstruments",
        17: "Stationery",
        18: "HouseholdItems",
    };

    const currentLang = localStorage.getItem('currentLanguage') || 'en';
    const showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    const categoryCompletion = JSON.parse(localStorage.getItem('categoryCompletion')) || {}; // Retrieve completion data

    if (svgSwitch) {
        svgSwitch.checked = showSvg;
        if (showSvg) {
            convertToSvg();
        } else {
            revertToEmojis();
        }
    }


    function loadCommonTranslations(lang) {
        fetch('data/common.json')
            .then(response => response.json())
            .then(commonTranslations => {
                const defaultLang = 'en'; // Define a default language
                const validLang = commonTranslations.modal && commonTranslations.modal.confirmReset[lang] ? lang : defaultLang;

                const modalContentText = commonTranslations.modal.confirmReset[validLang];
                const confirmButtonText = commonTranslations.modal.confirmButton[validLang];
                const cancelButtonText = commonTranslations.modal.cancelButton[validLang];
                const resetScoresTranslation = commonTranslations.settings.resetScores[validLang]; // Get the translation for Reset Scores
                const showSvgTranslation = commonTranslations.settings.showSvg[validLang]; // Get the translation for Show SVG

                // Set modal content based on the current language
                const modalContent = document.getElementById('modalText');
                const confirmButton = document.getElementById('confirmReset');
                const cancelButton = document.getElementById('cancelReset');

                if (modalContent) modalContent.textContent = modalContentText;
                if (confirmButton) confirmButton.textContent = confirmButtonText;
                if (cancelButton) cancelButton.textContent = cancelButtonText;
                if (resetScoresText) resetScoresText.textContent = resetScoresTranslation; // Update Reset Scores text
                if (showSvgLabel) showSvgLabel.textContent = showSvgTranslation; // Update Show SVG label
            })
            .catch(error => {
                console.error('Error loading common.json:', error);
            });
    }
    
    // Load initial common translations
    loadCommonTranslations(currentLang);

    // Load index translations
    fetch('data/index.json')
        .then(response => response.json())
        .then(data => {
            const emojis = data.emojis;
            const translations = data.translations;
            const specialEmojis = data.specialEmojis;
            const defaultLang = data.defaultLang || 'en';
            const validLang = translations[currentLang] ? currentLang : defaultLang;

            // Display the special emoji
            const specialEmojiSpan = document.getElementById('special-emoji');
            if (specialEmojis.specialEmoji) {
                specialEmojiSpan.textContent = specialEmojis.specialEmoji;
            }

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
                    const categoryFileName = categoryFileNames[category.id];
                    const completionStatus = categoryCompletion[categoryFileName] || ''; // Use the file name to get completion status
                    const li = document.createElement('li');
                    li.className = 'category-item';
                    li.innerHTML = `
                        ${wrapEmojiArray(emojiArray)}
                        <span class="category-text">${category.text}</span>
                        <span class="completion-status">${completionStatus}</span>
                    `;
                    categoryList.appendChild(li);

                    li.addEventListener('click', () => {
                        window.location.href = `skit.html?category=${encodeURIComponent(categoryFileName)}`;
                    });
                });

                localStorage.setItem('currentLanguage', lang);
            
                // Convert emojis to SVG if the switch is enabled
                if (showSvg) {
                    convertToSvg();
                }

                // Load and update common translations
                loadCommonTranslations(lang);
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

    // Function to close the modal
    function closeModal() {
        confirmationModal.style.display = 'none';
    }

    // Add event listener for the confirm button to reset scores and close the modal
    const confirmResetButton = document.getElementById('confirmReset');
    if (confirmResetButton) {
        confirmResetButton.addEventListener('click', () => {
            // Clear the localStorage for scores
            localStorage.removeItem('categoryCompletion');
            closeModal();
            // Optionally, refresh the page to reflect changes
            location.reload();
        });
    }

    // Add event listener for the cancel button to close the modal
    const cancelResetButton = document.getElementById('cancelReset');
    if (cancelResetButton) {
        cancelResetButton.addEventListener('click', () => {
            closeModal();
        });
    }

    // Close the modal when clicking outside of the modal content
    window.onclick = (event) => {
        if (event.target == confirmationModal) {
            closeModal();
        }
    };

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
        return [...emoji].map(e => e.codePointAt(0).toString(16).padStart(4, '0')).join('-').toUpperCase();
    }

    // Define a set of emoji codes that should not have -FE0F
    const knownExceptions = new Set([
        '270D', // ✍️
        '23F2', // ⏲️
        '2600', // ☀️
        '26C8', // ⛈️
        '2744', // ❄️
        '270F', // ✏️
        '271D', // ✝️
        '1F5FA', // 🗺️
        '1F3DE', // 🏞️
        '1F3DC', // 🏜️
        '1F3D4', // 🏔️
        '1F6CB', // 🛋️
        '1F6CF', // 🛏️
        '1F570', // 🕰️
        '1F58C', // 🖌️
        '1F58A', // 🖊️
        '1F327', // 🌧️
        '1F32A', // 🌪️
    ]);

    function convertToSvg() {
        document.querySelectorAll('.emoji, #special-emoji').forEach(emojiSpan => {
            const emoji = emojiSpan.textContent;
            let emojiCode = [...emoji].map(e => e.codePointAt(0).toString(16).padStart(4, '0')).join('-').toUpperCase();

            if (emojiCode.includes('-FE0F')) {
                const baseEmojiCode = emojiCode.replace('-FE0F', '');
                if (knownExceptions.has(baseEmojiCode)) {
                    emojiCode = baseEmojiCode;
                }
            }

            const newUrl = `https://openmoji.org/data/color/svg/${emojiCode}.svg`;
            emojiSpan.innerHTML = `<img src=${newUrl} style="height: 1.2em;" alt="${emoji}">`;
        });
    }
    
    function revertToEmojis() {
        document.querySelectorAll('.emoji, #special-emoji').forEach(emojiSpan => {
            const imgElements = emojiSpan.querySelectorAll('img');
            if (imgElements.length > 0) {
                const emojis = Array.from(imgElements).map(img => img.getAttribute('alt')).join('');
                emojiSpan.textContent = emojis;
            }
        });
    }
});
