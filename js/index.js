let loadedEmojis = {};
let difficultyTranslations = null;

// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
}

// Function to highlight currently selected language
function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');
    
    // Remove 'selected' class from all buttons
    buttons.forEach(button => {
        button.classList.remove('selected');
    });

    // Find the button that corresponds to the selected language and add the 'selected' class
    const selectedButton = [...buttons].find(button => button.getAttribute('data-lang') === lang);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

// Function to open the modal
function openModal() {
    const confirmationModal = document.getElementById('confirmationModal');
    confirmationModal.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body; // Correctly define body in the DOMContentLoaded scope
    const categoryList = document.getElementById('category-list');
    const welcomeText = document.getElementById('welcome-text');
    const selectCategoryText = document.getElementById('select-category');
    const langButton = document.getElementById('langToggleBtn');
    const dropdownContent = document.getElementById('language-dropdown');
    const helpButton = document.querySelector('.help-btn');
    const settingsButton = document.getElementById('settingsToggleBtn');
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
        19: "Health",
        20: "PlacesInTheCity",
    };

    const storyFileNames = {
        1: "Introduction",
        2: "Restaurant",
      };

    const categorySkits = {
        1: 18,
        2: 20,
        3: 20,
        4: 21,
        5: 20,
        6: 20,
        7: 20,
        8: 20,
        9: 20,
        10: 20,
        11: 20,
        12: 20,
        13: 20,
        14: 20,
        15: 20,
        16: 20,
        17: 20,
        18: 20,
        19: 20,
        20: 20
    };    

    const currentLang = localStorage.getItem('currentLanguage') || 'en';
    const showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    const categoryCompletion = JSON.parse(localStorage.getItem('categoryCompletion')) || {}; // Retrieve completion data

    // Load the special emoji based on "Show SVG" state
    const specialEmojiSpan = document.getElementById('special-emoji');
    const specialEmoji = "😌"; // Default special emoji
    const specialEmojiSVGUrl = 'https://openmoji.org/data/color/svg/1F60C.svg'; // Your SVG URL

    if (svgSwitch) {
        svgSwitch.checked = showSvg; // Set the state of the switch

        // Check if we should show SVG or regular emoji for the special emoji
        if (showSvg) {
            specialEmojiSpan.innerHTML = `<img src="${specialEmojiSVGUrl}" style="height: 1.2em;" alt="Special Emoji">`;
        } else {
            specialEmojiSpan.textContent = specialEmoji; // Set regular emoji
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

                const difficultyLabel = document.getElementById('difficultyLabel');
                const easyOption = document.getElementById('easyOption');
                const mediumOption = document.getElementById('mediumOption');
                const hardOption = document.getElementById('hardOption');

                difficultyTranslations = commonTranslations.settings.difficulty;

                if (difficultyLabel) difficultyLabel.textContent = difficultyTranslations.label[validLang];
                if (easyOption) easyOption.textContent = difficultyTranslations.options.easy[validLang];
                if (mediumOption) mediumOption.textContent = difficultyTranslations.options.medium[validLang];
                if (hardOption) hardOption.textContent = difficultyTranslations.options.hard[validLang];

            })
            .catch(error => {
                console.error('Error loading common.json:', error);
            });
    }
    
    // Load initial common translations
    loadCommonTranslations(currentLang);

    // Load index translations
    function loadIndexTranslations() {
        return fetch('data/index.json') // Return the fetch Promise for Promise.all
            .then(response => response.json())
            .then(data => {
                loadedEmojis = data.emojis; // Store main emojis
                const translations = data.translations;
                const defaultLang = data.defaultLang || 'en';
                const validLang = translations[currentLang] ? currentLang : defaultLang;
    
                // Create language buttons
                const betaLanguages = ['de', 'is', 'th', 'ja', 'ko'];
                const normalLangs = [];
                const betaLangs = [];
                
                for (const lang in translations) {
                    const button = document.createElement('button');
                    button.className = 'language-btn';
                    button.type = 'button';
                    button.textContent = translations[lang].name;
                    button.setAttribute('data-lang', lang);
                
                    button.addEventListener('click', (event) => {
                        event.preventDefault();
                        updateLanguage(lang);
                    
                        // Close the language dropdown after selection
                        dropdownContent.classList.remove('show');
                    });
                                    
                    if (betaLanguages.includes(lang)) {
                        betaLangs.push(button);
                    } else {
                        normalLangs.push(button);
                    }
                }
                
                // Append normal languages
                normalLangs.forEach(btn => dropdownContent.appendChild(btn));
                
                // Remove bottom border from last regular lang if beta section exists
                if (normalLangs.length && betaLangs.length) {
                    normalLangs[normalLangs.length - 1].style.borderBottom = 'none';
                }
                
                // Add Beta section if applicable
                if (betaLangs.length > 0) {
                    const topHr = document.createElement('hr');
                
                    const label = document.createElement('div');
                    label.className = 'beta-label';
                    label.textContent = 'Beta';
                
                    const bottomHr = document.createElement('hr');
                
                    dropdownContent.appendChild(topHr);
                    dropdownContent.appendChild(label);
                    dropdownContent.appendChild(bottomHr);
                
                    betaLangs.forEach(btn => dropdownContent.appendChild(btn));
                }
                    
                // Highlight the selected language
                updateSelectedLanguageButton(validLang);
    
                // Display categories with emojis for the first time
                displayCategories(translations[validLang], currentLang, difficultyTranslations);
    
                function wrapEmoji(emoji) {
                    return `<span class="emoji" data-emoji="${emoji}">${emoji}</span>`;
                }
    
                function wrapEmojiArray(emojiArray) {
                    return emojiArray.map(wrapEmoji).join('');
                }
    
                // Function to display categories
                function displayCategories(translation, currentLang, difficultyTranslations) {
                    categoryList.innerHTML = ''; // Clear existing categories

                    translation.categories.forEach(category => {
                        const emojiArray = loadedEmojis[category.id] || []; // Use the loaded emojis
                        const categoryFileName = categoryFileNames[category.id];

                        const categoryData = categoryCompletion[currentLang]?.[categoryFileName];
                        let score = '';
                        let date = '';
                        let difficulty = '';
                        let difficultyClass = '';

                        if (categoryData) {
                            // ✅ Fully completed
                            score = categoryData.score || '';
                            date = categoryData.date || '';
                            difficulty = categoryData.difficulty || '';

                            if (difficulty === 'easy') difficultyClass = 'difficulty-easy';
                            else if (difficulty === 'medium') difficultyClass = 'difficulty-medium';
                            else if (difficulty === 'hard') difficultyClass = 'difficulty-hard';
                        } else {
                            // ✅ Not fully completed — check partial progress
                            const answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};
                            const answeredSkits = answerLogs?.[currentLang]?.[categoryFileName] || {};
                            const answeredCount = Object.keys(answeredSkits).length;
                            const totalSkits = categorySkits[category.id] || 0;

                            if (answeredCount > 0 && totalSkits > 0) {
                                score = `${answeredCount}/${totalSkits}`;
                            }
                        }

                        const li = document.createElement('li');
                        li.className = `category-item${difficultyClass ? ' ' + difficultyClass : ''}`;

                        const translatedDifficulty = difficultyTranslations?.options?.[difficulty]?.[currentLang] || '';

                        li.innerHTML = `
                        <div class="category-line">
                          <div class="emoji-block">${wrapEmojiArray(emojiArray)}</div>
                          <div class="text-container">
                            <div class="top-row">
                              <div class="category-text">${category.text}</div>
                              <div class="score-text">${score}</div>
                            </div>
                            <div class="bottom-row">
                              <div class="date-text">${date}</div>
                              <div class="difficulty-text">${translatedDifficulty}</div>
                            </div>
                          </div>
                        </div>
                      `;
                                                                                        
                        categoryList.appendChild(li);

                        
                        li.addEventListener('click', () => {
                            window.location.href = `skit.html?category=${encodeURIComponent(categoryFileName)}`;
                        });
                    });

                    // Convert emojis to SVG if "Show SVG" is enabled
                    if (JSON.parse(localStorage.getItem('showSvg'))) {
                        convertToSvg();
                    }
                }
    
                function displayStories(stories, lang) {
                    const storyList = document.getElementById('story-list');
                    storyList.innerHTML = '';
                
                    stories.forEach(story => {
                        const emojiArray = loadedEmojis[story.emoji] || [];
                        const li = document.createElement('li');
                        li.className = 'category-item'; // match skit classes exactly
                
                        const translatedDifficulty = ''; // no difficulty shown for now
                        const score = '';
                        const date = '';
                
                        li.innerHTML = `
                        <div class="category-line">
                          <div class="emoji-block">${wrapEmojiArray(emojiArray)}</div>
                          <div class="text-container">
                            <div class="top-row">
                              <div class="category-text">${story.text}</div>
                              <div class="score-text">${score}</div>
                            </div>
                            <div class="bottom-row">
                              <div class="date-text">${date}</div>
                              <div class="difficulty-text">${translatedDifficulty}</div>
                            </div>
                          </div>
                        </div>
                      `;
                                                                                                        
                        li.addEventListener('click', () => {
                            window.location.href = `story.html?file=${encodeURIComponent(story.id)}`;
                        });
                
                        storyList.appendChild(li);
                    });
                
                    if (JSON.parse(localStorage.getItem('showSvg'))) {
                        convertToSvg();
                    }
                }
                                
                displayStories(translations[validLang].stories || [], currentLang);

                // Function to update the language
                function updateLanguage(lang) {
                    const translation = translations[lang];
                
                    // Update text content only
                    welcomeText.textContent = translation.welcome;
                    selectCategoryText.textContent = translation.selectCategory;
                    const skitModeHeader = document.getElementById('skit-mode-header');
                    const storyModeHeader = document.getElementById('story-mode-header');

                    if (skitModeHeader) skitModeHeader.textContent = translation.skitMode;
                    if (storyModeHeader) storyModeHeader.textContent = translation.storyMode;

                    const selectStoryCategoryText = document.getElementById('select-story-category');
                    if (selectStoryCategoryText) {
                        selectStoryCategoryText.textContent = translation.selectCategory;
                    }
                
                    // ✅ Pass the correct language for filtering
                    displayCategories(translation, lang, difficultyTranslations);
                    displayStories(translation.stories || [], lang);
                
                    // Store the current language in localStorage
                    localStorage.setItem('currentLanguage', lang);
                
                    // Highlight the selected language
                    updateSelectedLanguageButton(lang);
                
                    // Reload difficulty labels
                    loadCommonTranslations(lang);
                }
                    
                updateLanguage(validLang);
    
                const addDropdownToggle = (button, dropdown, otherButton, otherDropdown) => {
                    const handler = (event) => {
                        event.stopPropagation();
                
                        const isOpen = dropdown.classList.contains('show');
                        const isOtherOpen = otherDropdown.classList.contains('show');
                
                        if (isOtherOpen) {
                            otherDropdown.classList.remove('show');
                            otherButton.classList.remove('active');
                        }
                
                        dropdown.classList.toggle('show', !isOpen);
                        button.classList.toggle('active', !isOpen);
                    };
                
                    button.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation(); // important to avoid unintended closing
                    
                        const isOpen = dropdown.classList.contains('show');
                        const isOtherOpen = otherDropdown.classList.contains('show');
                    
                        if (isOtherOpen) {
                            otherDropdown.classList.remove('show');
                            otherButton.classList.remove('active');
                        }
                    
                        dropdown.classList.toggle('show', !isOpen);
                        button.classList.toggle('active', !isOpen);
                    });
                };
                
                addDropdownToggle(langButton, dropdownContent, settingsButton, settingsDropdown);
                addDropdownToggle(settingsButton, settingsDropdown, langButton, dropdownContent);
                                    
                // Close the dropdown menus if the user clicks outside of them
                window.addEventListener('click', (event) => {
                    const clickedInsideLang = dropdownContent.contains(event.target) || langButton.contains(event.target);
                    const clickedInsideSettings = settingsDropdown.contains(event.target) || settingsButton.contains(event.target);
                
                    if (!clickedInsideLang) {
                        dropdownContent.classList.remove('show');
                        langButton.classList.remove('active'); // ✅ clear lang highlight
                    }
                    
                    if (!clickedInsideSettings) {
                        settingsDropdown.classList.remove('show');
                        settingsButton.classList.remove('active'); // ✅ clear settings highlight
                    }
                });

                window.addEventListener('touchstart', (event) => {
                    const clickedInsideLang = dropdownContent.contains(event.target) || langButton.contains(event.target);
                    const clickedInsideSettings = settingsDropdown.contains(event.target) || settingsButton.contains(event.target);
                
                    if (!clickedInsideLang) {
                        dropdownContent.classList.remove('show');
                        langButton.classList.remove('active');
                    }
                
                    if (!clickedInsideSettings) {
                        settingsDropdown.classList.remove('show');
                        settingsButton.classList.remove('active');
                    }
                });                

                // Add event listener for the help button
                helpButton.addEventListener('click', () => {
                    window.location.href = 'faq.html';
                });
        })
        .catch(error => {
            console.error('Error loading index.json:', error);
        });
    }
    
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

    const confirmResetButton = document.getElementById('confirmReset');
    if (confirmResetButton) {
        confirmResetButton.addEventListener('click', () => {
            const currentLang = localStorage.getItem('currentLanguage') || 'en';
            
            // Handle categoryCompletion
            const categoryCompletion = JSON.parse(localStorage.getItem('categoryCompletion')) || {};
            delete categoryCompletion[currentLang];
            localStorage.setItem('categoryCompletion', JSON.stringify(categoryCompletion));
            
            // Handle answerLogs
            const answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};
            delete answerLogs[currentLang];
            localStorage.setItem('answerLogs', JSON.stringify(answerLogs));
    
            closeModal();
            location.reload(); // refresh to reflect the cleared progress
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
    
        const specialEmojiSpan = document.getElementById('special-emoji');
        const specialEmoji = "😌"; // Your default special emoji
    
        if (showSvg) {
            // Show the SVG for the special emoji
            const specialEmojiSVGUrl = 'https://openmoji.org/data/color/svg/1F60C.svg'; // Your desired SVG URL
            specialEmojiSpan.innerHTML = `<img src="${specialEmojiSVGUrl}" style="height: 1.2em;" alt="Special Emoji">`;
        } else {
            // Revert to the usual emoji
            specialEmojiSpan.textContent = specialEmoji; // Show the usual emoji
        }
    
        // Convert other emojis based on the SVG toggle state
        if (showSvg) {
            convertToSvg(); // Convert other emojis to SVG
        } else {
            revertToEmojis(); // Revert other emojis back to their original form
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
        document.querySelectorAll('.emoji').forEach(emojiSpan => {
            const emoji = emojiSpan.getAttribute('data-emoji');
            if (!emoji) return;
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
        document.querySelectorAll('.emoji').forEach(emojiSpan => {
            const imgElements = emojiSpan.querySelectorAll('img');
            if (imgElements.length > 0) {
                const emojis = Array.from(imgElements).map(img => img.getAttribute('alt')).join('');
                emojiSpan.textContent = emojiSpan.getAttribute('data-emoji') || emojis;
            }
        });
    }
    
    // Adding Promise.all to handle loading completion
    Promise.all([loadCommonTranslations(currentLang), loadIndexTranslations()])
    .then(() => {
        // Add the content-ready class once everything is loaded
        body.classList.add('content-ready');

        // ✅ Handle difficulty setting from localStorage
        const savedDifficulty = localStorage.getItem('difficulty');
        if (savedDifficulty) {
            const radio = document.querySelector(`input[name="difficulty"][value="${savedDifficulty}"]`);
            if (radio) radio.checked = true;
        }

        document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
            radio.addEventListener('change', () => {
                localStorage.setItem('difficulty', radio.value);
            });
        });
    })
    .catch(error => {
        console.error('Error during loading:', error);
    });
});