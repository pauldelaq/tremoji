// Initialize global variables
let currentLanguage = localStorage.getItem('currentLanguage') || 'en'; // Default language
let previousLanguage = 'en'; // To store the previous language
let showClues = JSON.parse(localStorage.getItem('showClues')) || false; // Default is to hide clues
let showSvg = JSON.parse(localStorage.getItem('showSvg')) || false; // Default is system emojis
let currentSkitIndex = 0; // Global variable to store the current skit index
let currentSkitState = 'initial'; // Current state of the skit
let shuffledOrder = [0, 1]; // To store the shuffled order of buttons
let isShowCluesToggle = false; // Variable to prevent "Show Clues" setting from causing shuffling
let isReviewPageActive = false;
let fontSize = localStorage.getItem('fontSize') || '16'; // Default font size
let isReviewingIncorrect = false; // This flag will determine if we're reviewing incorrect skits
let isLanguageChange = false; // Flag to prevent button shuffling during language change
let isTextSpacesEnabled = JSON.parse(localStorage.getItem('isTextSpacesEnabled')) || false; // Default is to remove spaces
let isTextSpacesToggle = false; // Flag to prevent button shuffling during text spaces toggle
let currentWord = null;  // Stores the currently selected word's data-word-id

// TTS variables
let ttsEnabled = false;
let currentVoice = null;
let voicesInitialized = false; // To ensure voices are initialized only once
let ttsSpeed = localStorage.getItem('ttsSpeed') || '1.0'; // Default to 1.0x

// Create a global instance of JSConfetti
const jsConfetti = new JSConfetti();

// Function to reset button colors to the default blue color
function resetButtonColors() {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.style.backgroundColor = '#2196F3'; // Default blue color
    });
}

// Function to toggle dropdown menu
function toggleDropdown(id, button) {
    const dropdown = document.getElementById(id);
    const isOpen = dropdown.classList.contains("show");
  
    // 🔹 Close all dropdowns and remove active classes
    document.querySelectorAll(".dropdown-content").forEach(d => d.classList.remove("show"));
    document.querySelectorAll(".dropbtn").forEach(b => b.classList.remove("active"));
  
    // 🔹 If this dropdown was already open, just return (it's now closed)
    if (isOpen) return;
  
    // 🔹 Otherwise, open this one and highlight the button
    dropdown.classList.add("show");
    if (button) button.classList.add("active");
  }
  
// Function to update Thai-specific spacing label
function updateCustomLabelText() {
    const customLabelElement = document.getElementById('customLabel');

    // Check if the current language is Thai
    if (currentLanguage === 'th') {
        // Replace the Chinese characters with Thai translation and format with line break and indentation
        customLabelElement.innerHTML = `
            แยกคำ 
            <img src="https://openmoji.org/data/black/svg/27A1.svg" alt="Arrow" width="20" height="20">
            <br>
            <span style="display: inline-block; margin-left: 40px;">แยก คำ</span>
        `;
    } else {
        // Default: Render the original Chinese characters
        customLabelElement.innerHTML = `
            文字
            <img src="https://openmoji.org/data/black/svg/27A1.svg" alt="Arrow" width="20" height="20">
            文 字
        `;
    }
}

// Function to update content based on the current language
function updateContent() {
    // Retrieve translationsData from localStorage
    const storedTranslationsData = localStorage.getItem('translationsData');
    
    if (!storedTranslationsData) {
        console.error('No translations data found in localStorage.');
        return;
    }

    // Parse the stored JSON data
    const data = JSON.parse(storedTranslationsData);

    // Ensure the category and language are properly set
    const translations = data.translations;
    const defaultLang = data.defaultLang || 'en';
    const translation = translations[currentLanguage] || translations[defaultLang];
    
    // Update UI elements with translated content
    document.getElementById('category').textContent = translation.categoryName;
    const contentContainer = document.getElementById('content');
    contentContainer.innerHTML = ''; // Clear previous content
    translation.items.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.text;
        contentContainer.appendChild(div);
    });
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

// Function to change the language
function changeLanguage(lang) {
    previousLanguage = currentLanguage;
    currentLanguage = lang;
    
    isLanguageChange = true; // Set the flag to prevent shuffling
    updateContent();
    isLanguageChange = false; // Reset the flag

    setTTSLanguage(lang); // Set TTS language

    // Refresh the available voices after language change
    refreshAvailableVoices(); // Ensure voices are updated for the newly selected language

    // Update the UI to highlight the selected language
    updateSelectedLanguageButton(lang); // <-- Ensure the selected language button is highlighted

    toggleDropdown('languageDropdown'); // Close the dropdown menu after language change

    // Store the current language in localStorage for consistency
    localStorage.setItem('currentLanguage', lang);

    // Toggle the visibility of the "文字" setting based on the selected language
    toggleTextSpacesVisibility();
    updateLastVisibleSettingItem(); // Ensure the last item is correctly styled
}

// Function to refresh available voices for the newly selected language
function refreshAvailableVoices() {
    // Use the speechSynthesis.onvoiceschanged event to wait for the voices to be updated
    speechSynthesis.onvoiceschanged = () => {
        logAvailableVoices(); // Log and populate the available voices for the new language
    };

    // If voices are already available, log them immediately
    if (speechSynthesis.getVoices().length) {
        logAvailableVoices(); // Log and populate the voices immediately if they are available
    }
}

// Function to switch to the previous language
function switchToPreviousLanguage() {
    const temp = currentLanguage;
    currentLanguage = previousLanguage;
    previousLanguage = temp;

    localStorage.setItem('currentLanguage', currentLanguage);

    isLanguageChange = true; // Set the flag to prevent shuffling
    updateContent();
    isLanguageChange = false; // Reset the flag

    setTTSLanguage(currentLanguage); // Set the TTS language

    // Refresh the available voices after switching languages
    refreshAvailableVoices(); // Ensure voices are updated when switching

    // Update the UI to highlight the selected language
    updateSelectedLanguageButton(currentLanguage); // <-- Ensure the selected language button is highlighted

    // Toggle the visibility of the "文字" setting based on the selected language
    toggleTextSpacesVisibility();
    updateLastVisibleSettingItem(); // Ensure the last item is correctly styled
}

// Function to remove the line under the last Settings item
function updateLastVisibleSettingItem() {
    const settingItems = document.querySelectorAll('.setting-item');
    let lastVisibleItem = null;

    settingItems.forEach(item => {
        if (item.style.display !== 'none') {
            lastVisibleItem = item;
        }
    });

    // Reset styles for all items
    settingItems.forEach(item => {
        item.style.borderBottom = '1px solid #ccc';
        item.style.paddingBottom = '10px';
    });

    // Remove border and padding from the last visible item
    if (lastVisibleItem) {
        lastVisibleItem.style.borderBottom = 'none';
        lastVisibleItem.style.paddingBottom = '0';
    }
}

// Function to show the review page
function showReviewPage() {
    isReviewPageActive = true;

    // Hide skit interface elements and show the review page
    document.querySelector('.skit-container').style.display = 'none';
    document.querySelector('.options-container').style.display = 'none';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('skitIndicator').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    document.getElementById('reviewPage').style.display = 'flex';

    // Determine which answer logs to use based on the session type
    const answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    const answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const reviewSkitsData = JSON.parse(localStorage.getItem('reviewSkitsData'));

    // Calculate the total number of skits based on the session type
    const totalSkits = isReviewingIncorrect
        ? (reviewSkitsData[currentLanguage]?.skits?.length || reviewSkitsData[currentLanguage]?.length || 0)
        : translationsData[currentLanguage].skits.length;

        let correctCount = 0;
        let incorrectCount = 0;
        
        if (isReviewingIncorrect) {
            // Flat structure
            for (let key in answerLogs) {
                if (answerLogs[key] === 'correct') {
                    correctCount++;
                } else if (answerLogs[key] === 'incorrect') {
                    incorrectCount++;
                }
            }
        } else {
            // Nested structure
            const currentLang = localStorage.getItem('currentLanguage') || 'en';
            const currentCategory = getCurrentCategory();
            const categoryLogs = answerLogs?.[currentLang]?.[currentCategory] || {};
        
            for (let key in categoryLogs) {
                if (categoryLogs[key] === 'correct') {
                    correctCount++;
                } else if (categoryLogs[key] === 'incorrect') {
                    incorrectCount++;
                }
            }
        }
        
    // Update the review page with correct and incorrect counts
    document.getElementById('correctCount').innerText = correctCount;
    document.getElementById('incorrectCount').innerText = incorrectCount;
    document.querySelectorAll('#totalCount').forEach(totalCountSpan => {
        totalCountSpan.innerText = totalSkits;
    });

    // Update the category completion status if not in review mode
    if (!isReviewingIncorrect) {
        const categoryCompletion = JSON.parse(localStorage.getItem('categoryCompletion')) || {};
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();
        const difficulty = localStorage.getItem('difficulty') || 'easy';
    
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
        // Initialize the language section if needed
        if (!categoryCompletion[currentLang]) {
            categoryCompletion[currentLang] = {};
        }
    
        // Save data for this category in this language
        categoryCompletion[currentLang][currentCategory] = {
            score: `✓ ${correctCount}/${totalSkits}`,
            difficulty,
            date: dateStr
        };
    
        localStorage.setItem('categoryCompletion', JSON.stringify(categoryCompletion));
    }
    
    // Trigger confetti animation when the review page is displayed
    jsConfetti.addConfetti({
        emojis: ['🎉', '😎', '🌟', '🥳', '🎈'],
        confettiRadius: 4,
        confettiNumber: 50,
    });
}

// Function to get the current category from the URL
function getCurrentCategory() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category');
}

// Function to restart skits
function restartSkits() {
    // If in review mode, reset review-specific data first
    if (isReviewingIncorrect) {
        // Clear review-specific logs and incorrect skits
        localStorage.removeItem('reviewAnswerLogs');
        localStorage.removeItem('SkitsForReview');

    }

    // Set the review page active flag to false
    isReviewPageActive = false;

    // Hide the review page
    document.getElementById('reviewPage').style.display = 'none';

    // Show main content
    document.querySelector('.skit-container').style.display = 'block';
    document.querySelector('.options-container').style.display = 'block';

    // Show navigation buttons
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';

    // Show skit indicator
    document.getElementById('skitIndicator').style.display = 'block';

    // Restore footer border
    document.querySelector('footer').style.display = 'flex';
    document.querySelector('footer').style.borderTop = '1px solid #ddd';
    
    // Reset answer logs
    localStorage.removeItem('answerLogs');

    // Reset shuffled skit order
    localStorage.setItem('shuffledSkitIds', '[]');

    // Set isReviewingIncorrect to false after clearing review-specific data
    isReviewingIncorrect = false;

    // Navigate to the first skit
    currentSkitIndex = 0;
    currentSkitState = 'initial';

    // Update the content to the first skit
    updateContent();
}

// Function to restart only the incorrect skits
function restartIncorrect() {
    const logsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    const answerLogs = JSON.parse(localStorage.getItem(logsKey)) || {};
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    if (!translationsData) {
        console.error('Translations data not found.');
        return;
    }

    let incorrectIds = [];

    if (isReviewingIncorrect) {
        // REVIEW MODE: flat structure
        incorrectIds = Object.keys(answerLogs).filter(id => answerLogs[id] === 'incorrect');
    } else {
        // NORMAL MODE: nested structure
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();
        const categoryLogs = answerLogs?.[currentLang]?.[currentCategory] || {};

        incorrectIds = Object.keys(categoryLogs).filter(id => categoryLogs[id] === 'incorrect');
    }

    if (incorrectIds.length === 0) {
        console.warn('No incorrect skits to review.');
        return;
    }

    const reviewSkitsData = {};

    for (const lang in translationsData) {
        const langSkits = translationsData[lang]?.skits || [];
        reviewSkitsData[lang] = langSkits.filter(skit => 
            incorrectIds.includes(skit.id.toString())
        );
    }

    localStorage.setItem('reviewSkitsData', JSON.stringify(reviewSkitsData));
    localStorage.setItem('reviewAnswerLogs', '{}'); // Reset review logs

    isReviewingIncorrect = true;
    isReviewPageActive = false;
    currentSkitIndex = 0;
    currentSkitState = 'initial';

    document.getElementById('reviewPage').style.display = 'none';
    document.querySelector('.skit-container').style.display = 'block';
    document.querySelector('.options-container').style.display = 'block';
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('skitIndicator').style.display = 'block';
    document.querySelector('footer').style.display = 'flex';
    document.querySelector('footer').style.borderTop = '1px solid #ddd';

    updateContent();
}

function updateContent() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const commonData = JSON.parse(localStorage.getItem('commonData'));

    if (!translationsData || !commonData) {
        console.error('Translations or common data not found in local storage.');
        return;
    }

    let skits;
    let answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';

    // Safely retrieve answerLogs from localStorage
    let answerLogs = {};
    try {
        answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};
    } catch (error) {
        console.error(`Error parsing ${answerLogsKey}:`, error);
        answerLogs = {};
    }

    // Determine the source of skits based on the mode
    if (isReviewingIncorrect) {
        // Use reviewSkitsData for the current language
        const reviewSkitsData = JSON.parse(localStorage.getItem('reviewSkitsData')) || {};
        skits = reviewSkitsData[currentLanguage] || [];
    } else {
        // Use all skits from translationsData
        skits = translationsData[currentLanguage].skits;
    }

    if (skits.length === 0) {
        console.error('No skits available to display.');
        return;
    }

    // Ensure the current skit index is within bounds
    if (currentSkitIndex >= skits.length) {
        currentSkitIndex = skits.length - 1;
    }

    const skit = skits[currentSkitIndex];
    const category = translationsData[currentLanguage].category;
    
    // Load settings data from commonData and translationsData
    const settings = {
        ...translationsData[currentLanguage].settings
    };

    // Extract settings for the current language from commonData
    const languageSettings = commonData.settings;
    const settingsLabels = {
        showClues: languageSettings.showClues[currentLanguage] || "Show Clues",
        showText: languageSettings.showText[currentLanguage] || "Show Text",
        showSvg: languageSettings.showSvg[currentLanguage] || "Show SVG",
        fontSize: languageSettings.fontSize[currentLanguage] || "Font Size",
        shuffleSkits: languageSettings.shuffleSkits[currentLanguage] || "Shuffle Skits",
        help: languageSettings.help[currentLanguage] || "Help",
    
        // New sound menu settings
        volume: languageSettings.volume[currentLanguage] || "Volume",
        ttsSpeed: languageSettings.ttsSpeed[currentLanguage] || "TTS Speed",
        ttsSettings: languageSettings.ttsSettings[currentLanguage] || "TTS Settings",
        ttsVoices: languageSettings.ttsVoices[currentLanguage] || "TTS Voices"
    };

    // Initialize answerLogs for review mode to show skits as unattempted
    if (isReviewingIncorrect) {
        const skitKey = `${skit.id}`;
        if (!(skitKey in answerLogs)) {
            answerLogs[skitKey] = 'unattempted'; // Treat skits as unattempted in review mode
        }
    }

    // Update skit indicator with answers
    let correctCount = 0;
    let incorrectCount = 0;
    
    if (isReviewingIncorrect) {
        // Review mode: flat structure
        Object.values(answerLogs).forEach(log => {
            if (log === 'correct') {
                correctCount++;
            } else if (log === 'incorrect') {
                incorrectCount++;
            }
        });
    } else {
        // Normal mode: nested structure
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();
    
        const categoryLogs = answerLogs?.[currentLang]?.[currentCategory] || {};
    
        Object.values(categoryLogs).forEach(log => {
            if (log === 'correct') {
                correctCount++;
            } else if (log === 'incorrect') {
                incorrectCount++;
            }
        });
    }
    
    // Symbols for correct and incorrect with inline styles for color
    const checkmark = '<span style="color: #4CAF50;">✓</span>';
    const cross = '<span style="color: rgb(244, 67, 54);">✗</span>';

    // Construct skit indicator text with symbols
    const skitIndicatorText = `
        ${category} ${currentSkitIndex + 1}/${skits.length}
        <label>
            <input type="checkbox" id="answeredCheckbox" ${
                isReviewingIncorrect 
                    ? (answerLogs[`${skit.id}`] && answerLogs[`${skit.id}`] !== 'unattempted' ? 'checked' : '')
                    : (answerLogs[currentLanguage]?.[getCurrentCategory()]?.[`${skit.id}`] ? 'checked' : '')
            } disabled>
            <span class="custom-checkbox"></span>
        </label>
        <br>
        ${checkmark} ${correctCount}, ${cross} ${incorrectCount}
    `;

    document.getElementById('skitIndicator').innerHTML = skitIndicatorText;

    // Handle showClues setting
    const showCluesCheckbox = document.getElementById('emojiSwitch');
    if (showCluesCheckbox) {
        showClues = showCluesCheckbox.checked;
    }

    if (showClues) {
        document.querySelector('.presenter-text').classList.remove('hide-clues');
    } else {
        document.querySelector('.presenter-text').classList.add('hide-clues');
    }

    // Handle showSvg setting
    const showSvgCheckbox = document.getElementById('svgSwitch');
    if (showSvgCheckbox) {
        showSvg = showSvgCheckbox.checked;
    }

    updateCustomLabelText(); // Update the 文字 setting label with Thai text

    // Prepare presenter content based on current skit state
    let presenterContent = '';
    let presenterEmoji = '';
    
    // Extract presenter content and emoji based on the current skit state
    if (currentSkitState === 'initial') {
        presenterContent = skit.presenter;
        presenterEmoji = skit.emojiPresenter;
    } else if (currentSkitState === 'correct') {
        presenterContent = skit.responseCorrect;
        presenterEmoji = skit.emojiCorrect;
    } else if (currentSkitState === 'incorrect') {
        presenterContent = skit.responseIncorrect;
        presenterEmoji = skit.emojiIncorrect;
    }
    
    const wrapWordsInSpans = (text, isAsianLanguage, addSpaces = false) => {
        let wordIndex = 0; // Counter for unique IDs
    
        if (isAsianLanguage) {
            const spacePlaceholder = '␣'; // Placeholder for managing double spaces
        
            // Step 1: Replace double spaces with placeholder
            let modifiedText = text.replace(/\s{2}/g, ` ${spacePlaceholder} `);
        
            // Step 2: Split text into parts (handling emojis separately)
            modifiedText = modifiedText.split(/(<span class='emoji'>[^<]+<\/span>)/g).map(part => {
                if (part.match(/<span class='emoji'>[^<]+<\/span>/)) {
                    return part; // Preserve emojis as-is
                }
        
                // Process words
                return part.split(' ').map(word => {
                    if (word.trim()) {
                        // 🆕 Skip processing if word is wrapped in {curly braces}
                        if (word.startsWith('{') && word.endsWith('}')) {
                            const rawWord = word.slice(1, -1); // remove braces
                            return `<span id="word-${wordIndex++}" class='word'>${rawWord}</span>`;
                        }
        
                        // Extract the word and multiple IDs
                        let match = word.match(/^(.+?)(\d+(_\d+)*)$/);
                        let cleanWord = match ? match[1] : word;
                        let wordIds = match ? match[2].split('_') : [];
        
                        // Create a space-separated list for `data-word-id`
                        let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';
        
                        // Wrap the word in a <span>
                        return `<span id="word-${wordIndex++}" class='word' ${dataWordId}>${cleanWord}</span>`;
                    }
                    return addSpaces ? ' ' : '';
                }).join(addSpaces ? ' ' : '');
            }).join('');
                
            // Step 3: Restore double spaces where placeholders exist
            modifiedText = modifiedText.replace(new RegExp(` ${spacePlaceholder} `, 'g'), '  ');
    
            return modifiedText.replace(new RegExp(spacePlaceholder, 'g'), ' ');
        } else {
            // Non-Asian languages: Wrap each word and preserve emojis
            return text.replace(/(<span class='emoji'>[^<]+<\/span>)|(\{[^}]+\}|\S+)/g, (match, emoji, word) => {
                if (emoji) {
                    return emoji; // Preserve emojis as-is
                }
                if (word) {
                    // NEW: If the word is wrapped in {curly braces}, skip number processing
                    if (word.startsWith('{') && word.endsWith('}')) {
                        const rawWord = word.slice(1, -1); // Remove the {}
                        return `<span id="word-${wordIndex++}" class='word'>${rawWord}</span>`;
                    }
            
                    // Existing number-handling logic
                    let match = word.match(/^(.+?)(\d+(_\d+)*)$/);
                    let cleanWord = match ? match[1] : word;
                    let wordIds = match ? match[2].split('_') : [];
            
                    let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';
            
                    return `<span id="word-${wordIndex++}" class='word' ${dataWordId}>${cleanWord}</span>`;
                }
            });
        }
    };
                
// Step 1: Wrap words in spans
const isAsianLanguage = ['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage);
const isTextSpacesEnabled = JSON.parse(localStorage.getItem('isTextSpacesEnabled'));
let wrappedPresenterContent = wrapWordsInSpans(presenterContent, isAsianLanguage, isTextSpacesEnabled);

// Step 2: Apply [UL] Processing AFTER Wrapping Words
wrappedPresenterContent = wrappedPresenterContent.replace(
    /<span id="word-(\d+)" class='word'>(.*?)<\/span>\s*\[UL\](.*?)\[ENDUL\]/g,
    (match, idStart, beforeUnderline, underlinedText) => {
        // Extract numbers from the underlined text (e.g., "salon473_474")
        let matchUnderlined = underlinedText.match(/^(.+?)(\d+(_\d+)*)$/);
        let cleanUnderlinedText = matchUnderlined ? matchUnderlined[1] : underlinedText;
        let wordIds = matchUnderlined ? matchUnderlined[2].split('_') : [];

        // Preserve multiple IDs in data-word-id
        let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';

        // Apply highlight while keeping correct IDs
        return `<span id="word-${idStart}" class='word' ${dataWordId} style="color: springgreen;">${cleanUnderlinedText}</span>`;
    }
).replace(/\[UL\](.*?)\[ENDUL\]/g, (match, highlightedText) => {
    // Extract word and number from standalone UL markers
    let matchText = highlightedText.match(/^(.+?)(\d+(_\d+)*)$/);
    let cleanText = matchText ? matchText[1] : highlightedText;
    let wordIds = matchText ? matchText[2].split('_') : [];

    let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';

    return `<span class='word' ${dataWordId} style="color: springgreen;">${cleanText}</span>`;
});

// Step 3: Apply Highlighting After DOM Updates
if (currentWord && Array.isArray(currentWord)) {
    setTimeout(() => {
        const selector = currentWord.map(id => `.word[data-word-id~='${id}']`).join(',');
        console.log(`Applying highlight with selector: ${selector}`);

        document.querySelectorAll(selector).forEach(word => {
            word.classList.add('highlight');
        });

        console.log(`Applied highlight to words with data-word-id: ${currentWord}`);
    }, 100); // Small delay to ensure the DOM updates first
}

console.log('Wrapped Presenter Content:', wrappedPresenterContent);

// Declare presenterElement and presenterTextElement only once
const presenterElement = document.querySelector('.presenter');
const presenterTextElement = document.querySelector('.presenter-text');

// Apply the Thai text style based on the current language
if (currentLanguage === 'th') {
    presenterTextElement.classList.add('thai-text');
} else {
    presenterTextElement.classList.remove('thai-text');
}

// Now update the content
presenterElement.innerHTML = presenterEmoji;
presenterTextElement.innerHTML = wrappedPresenterContent;

// Add click listeners to words
presenterTextElement.querySelectorAll('.word').forEach(wordElement => {
    console.log('Adding click listener to:', wordElement.innerText);
    
    wordElement.addEventListener('click', (event) => {
        console.log('Clicked word:', wordElement.innerText);
        event.stopPropagation(); // Prevent event bubbling in case of nested elements
    
        // Get all word IDs (some words have multiple IDs separated by spaces)
        const wordIds = wordElement.getAttribute('data-word-id');
    
        // If the word has an ID, store it as an array
        if (wordIds) {
            currentWord = wordIds.split(' '); // Convert "131 132" → ["131", "132"]
            localStorage.setItem('currentWord', JSON.stringify(currentWord)); // Store as array in localStorage
            console.log(`Updated currentWord: ${currentWord} (Stored in localStorage)`);
        } else {
            currentWord = null; // Clear currentWord for non-ID words
            localStorage.removeItem('currentWord');
            console.log(`Clicked word has no data-word-id.`);
        }
    
        // Remove highlight from all words first
        document.querySelectorAll('.word').forEach(word => word.classList.remove('highlight'));
    
        // Highlight the clicked word (even if it has no data-word-id)
        wordElement.classList.add('highlight');
    
        // If the word has an ID, highlight all words with the same ID(s)
        if (wordIds) {
            currentWord.forEach(id => {  // Now currentWord is an array
                document.querySelectorAll(`.word[data-word-id~='${id}']`).forEach(word => {
                    word.classList.add('highlight');
                });
            });
        }
    
        // Call the existing TTS function
        speakText(wordElement.innerText, wordElement);
    });
            
            // Highlight all words with the same data-word-id
            document.querySelectorAll(`.word[data-word-id='${currentWord}']`).forEach(word => {
                word.classList.add('highlight');
            });
    
});

// Handle button shuffling
if (currentSkitState === 'initial' && !isShowCluesToggle && !isLanguageChange && !isTextSpacesToggle) {
    shuffledOrder = [0, 1]; // Reset order
    for (let i = shuffledOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOrder[i], shuffledOrder[j]] = [shuffledOrder[j], shuffledOrder[i]];
    }
}

    const optionButtons = document.querySelectorAll('.option-btn');
    
    // Reset button colors
    optionButtons.forEach(button => {
        button.style.backgroundColor = ''; // Reset color
    });

    // Set button text and actions
    optionButtons[shuffledOrder[0]].innerHTML = `<span class="emoji">${skit.options[0]}</span>`;
    optionButtons[shuffledOrder[0]].onclick = () => checkAnswer(false);
    optionButtons[shuffledOrder[1]].innerHTML = `<span class="emoji">${skit.options[1]}</span>`;
    optionButtons[shuffledOrder[1]].onclick = () => checkAnswer(true);
    
    // Set button colors based on the current skit state
    if (currentSkitState === 'incorrect') {
        const incorrectButton = optionButtons[shuffledOrder[0]]; // Reference the incorrect button
        incorrectButton.style.backgroundColor = '#F44336'; // Red for incorrect
        incorrectButton.style.border = '2px solid rgb(33, 150, 243)'; // Blue border
        incorrectButton.onclick = () => navigateSkitState(false); // Allow navigating state

        // Add the shake effect to the emoji or SVG within the button
        if (!isLanguageChange) { // <-- only add shake if NOT switching language
            const emoji = incorrectButton.querySelector('.emoji');
            if (emoji) {
                emoji.classList.add('shake');
                emoji.addEventListener('animationend', () => {
                    emoji.classList.remove('shake');
                }, { once: true });
            }
        }
        } else if (currentSkitState === 'correct') {
        const correctButton = optionButtons[shuffledOrder[1]]; // Reference the correct button
        correctButton.style.backgroundColor = '#00ff00'; // Green for correct
        correctButton.style.border = '2px solid rgb(33, 150, 243)'; // Blue border
        correctButton.onclick = () => navigateSkitState(true); // Allow navigating state
        
                // Add the shake effect to the emoji or SVG within the button
                if (!isLanguageChange) {
                    const emoji = correctButton.querySelector('.emoji');
                    if (emoji) {
                        emoji.classList.add('rotate-shake');
                        emoji.addEventListener('animationend', () => {
                            emoji.classList.remove('rotate-shake');
                        }, { once: true });
                    }
                }
        }

    // Update settings labels with translations
    document.getElementById('showCluesLabel').textContent = settingsLabels.showClues;
    document.getElementById('showTextLabel').textContent = settingsLabels.showText;
    document.getElementById('showSvgLabel').textContent = settingsLabels.showSvg;
    document.getElementById('fontSizeLabel').textContent = settingsLabels.fontSize;

    // Update sound settings labels with translations
    document.getElementById('volumeLevelLabel').textContent = settingsLabels.volume;
    document.getElementById('TTSSpeedLabel').textContent = settingsLabels.ttsSpeed;

    // Update TTS Settings and TTS Voices headers
    document.querySelector('.setting-category p').textContent = settingsLabels.ttsSettings;
    document.querySelectorAll('.setting-category p')[1].textContent = settingsLabels.ttsVoices;

    // Update "Shuffle Skits" setting text dynamically
    const shuffleSkitsLabel = document.getElementById('shuffleSkits');
    if (shuffleSkitsLabel) {
        shuffleSkitsLabel.textContent = settingsLabels.shuffleSkits;
    }

    // Update "Help" setting text dynamically
    const helpLabel = document.getElementById('helpLabel');
    if (helpLabel) {
        helpLabel.textContent = settingsLabels.help;
    }

    if (showSvg) {
        convertToSvg();
    } else {
        revertToEmojis();
    }

    // Display completion message based on common data
    const completionMessageElement = document.getElementById('completionMessage');
    if (completionMessageElement) {
        const completionMessage = commonData.completionMessage[currentLanguage];
        completionMessageElement.textContent = completionMessage;
    }

    // Update the visibility of the "⟳(✗)" button based on incorrect skits presence
    let hasIncorrectSkits = false;

    if (isReviewingIncorrect) {
        hasIncorrectSkits = Object.values(answerLogs).includes('incorrect');
    } else {
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();
        const categoryLogs = answerLogs?.[currentLang]?.[currentCategory] || {};
        hasIncorrectSkits = Object.values(categoryLogs).includes('incorrect');
    }
        const restartIncorrectBtn = document.getElementById('restartIncorrectBtn');
    if (restartIncorrectBtn) {
        restartIncorrectBtn.style.display = hasIncorrectSkits ? 'block' : 'none';
    }
}

// Function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to shuffle skits globally
function shuffleSkits() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const reviewSkitsData = JSON.parse(localStorage.getItem('reviewSkitsData'));

    if (isReviewingIncorrect) {
        if (!reviewSkitsData || !reviewSkitsData[currentLanguage]) {
            console.warn('No skits available for shuffling in review mode.');
            return;
        }

        // Access skits based on reviewSkitsData format
        const reviewLanguageData = reviewSkitsData[currentLanguage];
        const reviewSkits = Array.isArray(reviewLanguageData)
            ? reviewLanguageData
            : reviewLanguageData.skits || [];

        if (reviewSkits.length === 0) {
            console.warn('No skits available for shuffling in review mode.');
            return;
        }

        // Shuffle the review skits
        const shuffledReviewSkits = shuffleArray([...reviewSkits]);

        // Update the reviewSkitsData with the shuffled skits
        if (Array.isArray(reviewLanguageData)) {
            reviewSkitsData[currentLanguage] = shuffledReviewSkits; // Flat array format
        } else {
            reviewSkitsData[currentLanguage].skits = shuffledReviewSkits; // Nested skits format
        }

        localStorage.setItem('reviewSkitsData', JSON.stringify(reviewSkitsData));

        // Reset the index and update the content
        currentSkitIndex = 0;
        updateContent();
        return;
    }

    if (!translationsData || !translationsData[currentLanguage]) {
        console.error('Translations data not found in local storage.');
        return;
    }

    // Default behavior: Shuffle all skits in translationsData
    const skitIds = translationsData[currentLanguage].skits.map(skit => skit.id);
    const shuffledSkitIds = shuffleArray([...skitIds]);

    for (const language in translationsData) {
        if (translationsData[language]?.skits) {
            translationsData[language].skits = shuffledSkitIds.map(id =>
                translationsData[language].skits.find(skit => skit.id === id)
            );
        }
    }

    localStorage.setItem('translationsData', JSON.stringify(translationsData));

    // Reset the index and update the content
    currentSkitIndex = 0;
    updateContent();
}

// Function to initialize shuffled skits on page load
function initializeShuffledSkits() {
    const shuffledSkitIds = JSON.parse(localStorage.getItem('shuffledSkitIds'));
    if (!shuffledSkitIds) {
        return; // No shuffled order found
    }

    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    if (!translationsData) {
        console.error('Translations data not found in local storage.');
        return;
    }

    // Apply the shuffled order to all languages
    for (const language in translationsData) {
        const skits = translationsData[language].skits;
        const reorderedSkits = shuffledSkitIds.map(id => skits.find(skit => skit.id === id));
        translationsData[language].skits = reorderedSkits;
    }

    // Save the reordered skits in local storage
    localStorage.setItem('translationsData', JSON.stringify(translationsData));
}

// Add event listener to the restart button
document.getElementById('restartBtn').addEventListener('click', restartSkits);

// Event listener for "⟳(✗)" button
document.getElementById('restartIncorrectBtn').addEventListener('click', restartIncorrect);

// Add event listener to the help icon for opening the FAQ page
document.addEventListener('DOMContentLoaded', function() {
    const helpIcon = document.getElementById('helpIcon');
    if (helpIcon) {
        helpIcon.addEventListener('click', () => {
            window.open('faq.html', '_blank', 'noopener,noreferrer');
        });
    }
});
    
// Function to speak text
function speakText(text, wordElement = null) {

    // Disable TTS if the review page is active
    if (isReviewPageActive) {
        return;
    }

    if (ttsEnabled && currentVoice) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        
        // Set the TTS rate based on the slider value
        utterance.rate = getTTSSpeed();
        
        // Set the TTS volume based on the slider value
        utterance.volume = getTTSVolume(); // Add this line to control volume
        
        speechSynthesis.speak(utterance);

        // Highlight the clicked word
        if (wordElement) {
            // Remove the highlight from any previously highlighted word
            document.querySelectorAll('.word.highlight').forEach(el => {
                el.classList.remove('highlight');
            });

            // Highlight only the clicked word
            wordElement.classList.add('highlight');
        }
    }
}

// Function to update presenter emoji based on skit state
function updatePresenter() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    if (!translationsData) {
        console.error('Translations data not found in local storage.');
        return;
    }

    const skit = translationsData[currentLanguage].skits[currentSkitIndex];
    const presenterEmojiElement = document.querySelector('.presenter');

    switch (currentSkitState) {
        case 'initial':
            presenterEmojiElement.textContent = skit.presenter; // Update presenter text
            break;
        case 'correct':
            presenterEmojiElement.textContent = skit.responseCorrect; // Update correct response
            break;
        case 'incorrect':
            presenterEmojiElement.textContent = skit.responseIncorrect; // Update incorrect response
            break;
        default:
            // Handle default case or additional states as needed
            break;
    }

    if (showSvg) {
        convertPresenterToSvg(presenterEmojiElement); // Convert presenter to SVG if showSvg is enabled
    }
}

function convertPresenterToSvg(presenterEmojiElement) {
    const emoji = presenterEmojiElement.textContent;
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
        presenterEmojiElement.innerHTML = `<img src=${newUrl} style="height: 1.5em;" alt="${emoji}">`; // Adjust height as needed
    }
}

// Function to initialize localStorage with default voices based on languages in translationsData from localStorage
function initializeDefaultVoices() {
    const voices = speechSynthesis.getVoices();
    const defaultVoices = {}; // Object to store default voices by language

    // Parse translationsData from localStorage
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));

    if (!translationsData) {
        console.error('translationsData not found in localStorage.');
        return;
    }

    // Get the list of languages from translationsData
    const jsonLanguages = Object.keys(translationsData); // Assuming translationsData contains language codes

    // Loop through the JSON languages and assign the first available voice for each
    jsonLanguages.forEach(language => {
        const availableVoice = voices.find(voice => voice.lang.startsWith(language));
        if (availableVoice) {
            defaultVoices[language] = availableVoice.name; // Store the first available voice for this language
        }
    });

    // Store the default voices in localStorage
    localStorage.setItem('selectedVoices', JSON.stringify(defaultVoices));
}

// Function to check and initialize default voices if not already in localStorage
function checkAndInitializeVoices() {
    if (!localStorage.getItem('selectedVoices')) {
        initializeDefaultVoices(); // Initialize the default voices if they don't exist
    }

    // Now, log and set available voices for the current language
    logAvailableVoices();
}

// Function to initialize TTS and set language
function initializeTTS() {
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            if (!voicesInitialized && localStorage.getItem('translationsData')) {
                voicesInitialized = true;
                
                // Check if selectedVoices is blank or missing, and only initialize if needed
                const selectedVoices = JSON.parse(localStorage.getItem('selectedVoices'));
                if (!selectedVoices || Object.keys(selectedVoices).length === 0) {
                    initializeDefaultVoices(); // Only call if selectedVoices is blank or not present
                }
                
                logAvailableVoices(); // Log all available voices and update the menu
                setTTSLanguage(currentLanguage); // Set the language based on the loaded voices
            }
        };

        // If voices are already available, initialize them immediately
        const voices = speechSynthesis.getVoices();
        if (voices.length && localStorage.getItem('translationsData')) {
            voicesInitialized = true;
            
            // Check if selectedVoices is blank or missing, and only initialize if needed
            const selectedVoices = JSON.parse(localStorage.getItem('selectedVoices'));
            if (!selectedVoices || Object.keys(selectedVoices).length === 0) {
                initializeDefaultVoices(); // Only call if selectedVoices is blank or not present
            }
            
            logAvailableVoices();
            setTTSLanguage(currentLanguage);
        }
    } else {
        console.warn('TTS not supported in this browser.');
    }
}

// Function to log all available voices and populate the TTS voices menu
function logAvailableVoices() {
    const voices = speechSynthesis.getVoices();
    const voiceOptionsContainer = document.getElementById('voiceOptions');
    const volumeSlider = document.getElementById('volumeLevelSlider');
    const speedSlider = document.getElementById('TTSSpeedSlider');

    voiceOptionsContainer.innerHTML = ''; // Clear previous voice options

    // Retrieve stored voices from localStorage
    const storedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};

    // Parse commonData from localStorage
    const commonData = JSON.parse(localStorage.getItem('commonData'));
    if (!commonData) {
        console.error('commonData not found in localStorage.');
        return;
    }

    // Get the stored voice for the current language, if available
    let storedVoiceName = storedVoices[currentLanguage];

    // Filter voices for the current language
    const languageVoices = voices.filter(voice => voice.lang.startsWith(currentLanguage));
    if (languageVoices.length > 0) {
        ttsEnabled = true; // Enable TTS as voices are available
        languageVoices.forEach((voice) => {
            const button = document.createElement('button');
            button.className = 'voice-btn';  // Apply a CSS class for styling
            button.textContent = voice.name;  // Set the voice name as the button label

            // Set onclick event to change the current voice
            button.onclick = () => {
                currentVoice = voice;

                // Remove 'selected' class from all buttons
                document.querySelectorAll('.voice-btn').forEach(btn => btn.classList.remove('selected'));

                // Add 'selected' class to the clicked button
                button.classList.add('selected');

                // Store the selected voice for the current language
                storedVoices[currentLanguage] = voice.name;
                localStorage.setItem('selectedVoices', JSON.stringify(storedVoices));

                // Enable sliders
                volumeSlider.disabled = false;
                speedSlider.disabled = false;
                volumeSlider.classList.remove('disabled-slider');
                speedSlider.classList.remove('disabled-slider');

                // Ensure TTS is ready with the new voice immediately
                ttsEnabled = true;

                // Close the Sound dropdown menu after voice selection
                toggleDropdown('soundDropdown');
            };

            // Highlight the stored or default voice
            if (storedVoiceName === voice.name) {
                button.classList.add('selected');
                currentVoice = voice; // Set the current voice as the stored or first one
            }

            // Append the button to the voice options container
            voiceOptionsContainer.appendChild(button);
        });

        // Enable sliders if voices are available
        volumeSlider.disabled = false;
        speedSlider.disabled = false;
        volumeSlider.classList.remove('disabled-slider');
        speedSlider.classList.remove('disabled-slider');
    } else {
        ttsEnabled = false; // Disable TTS as no voices are available
        const message = document.createElement('p');
        
        // Retrieve the translated message from commonData
        const languageSettings = commonData.settings;
        const noVoicesMessage = languageSettings.noVoicesAvailable[currentLanguage] || "No voices available for this language";

        message.textContent = noVoicesMessage; // Set the translated message
        message.classList.add('unavailable-message'); // Apply the CSS class for light gray styling
        voiceOptionsContainer.appendChild(message);

        // Disable sliders and apply grayed-out styles
        volumeSlider.disabled = true;
        speedSlider.disabled = true;
        volumeSlider.classList.add('disabled-slider');
        speedSlider.classList.add('disabled-slider');
    }

    // Update the TTS UI to reflect the current state
    updateTTSUI();

    // Final Step: Remove duplicate entries in the menu
    removeDuplicateButtons(voiceOptionsContainer);
}

// Function to remove duplicate buttons from the voice options
function removeDuplicateButtons(container) {
    const buttons = container.querySelectorAll('.voice-btn');
    const seen = new Set();

    buttons.forEach(button => {
        const text = button.textContent;
        if (seen.has(text)) {
            button.remove(); // Remove duplicate button
        } else {
            seen.add(text); // Mark this button as seen
        }
    });
}

// Function to enable/disable TTS depending on voice availability
function updateTTSUI() {
    const ttsControls = document.querySelectorAll('.tts-control');
    if (ttsEnabled) {
        ttsControls.forEach(control => control.classList.remove('disabled'));
    } else {
        ttsControls.forEach(control => control.classList.add('disabled'));
    }

    const ttsMessage = document.getElementById('ttsStatusMessage');
    if (ttsMessage) {
        ttsMessage.textContent = ttsEnabled
            ? "TTS is enabled for this language."
            : "TTS is disabled as no voices are available for this language.";
    }
}

// Function to set TTS language based on stored voice
function setTTSLanguage(lang) {
    const storedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};
    const storedVoiceName = storedVoices[lang];

    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        currentVoice = voices.find(voice => voice.lang.startsWith(lang) && voice.name === storedVoiceName);

        // Enable TTS only if a voice is found for the language
        ttsEnabled = !!currentVoice;
    } else {
        // Disable TTS if speechSynthesis is not supported
        ttsEnabled = false;
    }

    // Update UI elements (volume slider, speed slider, etc.) based on TTS availability
    logAvailableVoices(); // Updates voice options and re-enables sliders if voices exist
    updateTTSUI();        // Ensures UI reflects the current TTS state globally

}

// Function to get the current TTS speed based on the slider value
function getTTSSpeed() {
    const sliderElement = document.getElementById('TTSSpeedSlider');
    return parseFloat(sliderElement.value); // Get the current value of the slider and convert to float
}

// Function to get the current volume based on the slider value
function getTTSVolume() {
    const volumeSlider = document.getElementById('volumeLevelSlider');
    return parseFloat(volumeSlider.value); // Get the current volume from the slider
}

function processTextBasedOnLanguage(text, currentLanguage) {
    if (currentLanguage === 'th') {
        // Step 1: Use existing cleanup logic
        text = processTextOld(text);
    
        // Step 2: Add a virtual period for TTS when "ๆ" is followed by a single space
        text = text.replace(/ๆ /g, 'ๆ. '); // Add period only for TTS, no changes in display
    
        return text; // Return the modified text for TTS
        
        } else {
        // Run the new function for other languages
        return processTextNew(text);
    }
}

// Old function (used for Thai)
function processTextOld(text) {
    // Remove invisible Unicode characters (e.g., Variation Selector)
    text = text.replace(/[\uFE0F]/g, '');

    // Regular expression to remove flag emojis (two regional indicator symbols)
    const flagEmojiRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;

    return text.replace(flagEmojiRegex, '')      // Remove flag emojis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '')  // Alchemical Symbols
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')  // Geometric Shapes Extended
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')  // Supplemental Arrows-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols and Pictographs Extended-A
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
}

function processTextNew(text) {
    // Step 1: Remove <span> tags
    text = text.replace(/<span[^>]*>.*?<\/span>/g, '');

    // Step 2: Remove invisible Unicode characters (e.g., Variation Selector)
    text = text.replace(/[\uFE0F]/g, '');

    // Step 3: Remove ZWJ and other emoji components causing spaces
    text = text.replace(/\u200D/g, ''); // Remove Zero-Width Joiner

    // Step 3: Remove emojis
    const flagEmojiRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;

    text = text.replace(flagEmojiRegex, '')      // Remove flag emojis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '')  // Alchemical Symbols
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')  // Geometric Shapes Extended
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')  // Supplemental Arrows-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols and Pictographs Extended-A
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats

    // Step 5: Collapse multiple spaces (including non-breaking spaces)
    text = text.replace(/\s{2,}/g, ' ').trim();
    
    // Step 5: Trim leading and trailing spaces
    return text.trim();
}

// Function to handle TTS
function handleTTS() {
    const textElement = document.querySelector('.presenter-text');
    if (textElement) {
        let text = textElement.textContent.trim();

        // Process the text
        text = processTextBasedOnLanguage(text, currentLanguage);

        // Special handling for Thai language based on "add spaces" setting
        if (currentLanguage === 'th') {
            if (isTextSpacesEnabled) {
                // When "add spaces" is enabled:
                // Preserve double spaces as single spaces, remove single spaces between words
                text = text.replace(/ {2,}/g, '␣')  // Replace double (or more) spaces with a placeholder
                           .replace(/ +/g, '')       // Remove all single spaces
                           .replace(/␣/g, ' ');     // Restore placeholder as a single space
            } else {
                // When "add spaces" is disabled:
                // Collapse all spaces (single or double) into a single space
                text = text.replace(/\s+/g, ' ');   // Collapse all spaces into a single space
            }
        }

        // Speak the processed text
        speakText(text);
    } else {
        console.error('.presenter-text element not found in handleTTS.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const difficulty = localStorage.getItem('difficulty') || 'easy';

    // 1. Hide language UI if not in Easy mode
    if (difficulty !== 'easy') {
        const switchLangBtn = document.querySelector('.switch-lang-btn');
        if (switchLangBtn) switchLangBtn.style.display = 'none';

        const dropdownBtn = document.querySelector('.dropbtn[onclick*="languageDropdown"]');
        if (dropdownBtn) dropdownBtn.style.display = 'none';
    }

    // 2. In Hard mode, force Show Text to false and lock the toggle
    if (difficulty === 'hard') {
        const textSwitch = document.getElementById('textSwitch');
        const skitContainer = document.querySelector('.skit-container');
        const presenterEmoji = document.querySelector('.presenter');

        if (textSwitch) {
            textSwitch.checked = false;
            textSwitch.disabled = true;
            localStorage.setItem('showText', false);
        }

        // Hide text visually
        if (skitContainer) skitContainer.classList.add('hide-text');
        if (presenterEmoji) presenterEmoji.classList.add('large-emoji');

        // Hide setting menu items in Hard mode
        const emojiSettingItem = document.getElementById('emojiSwitch')?.closest('.setting-item');
        const textSettingItem = document.getElementById('textSwitch')?.closest('.setting-item');

        if (emojiSettingItem) emojiSettingItem.style.display = 'none';
        if (textSettingItem) textSettingItem.style.display = 'none';
    }

    // Reusable function to navigate to index.html and handle review page logic
    function navigateToIndex() {
        if (isReviewPageActive) {
            // Clear answer logs if on review page
            localStorage.removeItem('answerLogs');
        }
        window.location.href = 'index.html';
    }

    // Add event listener to the Header text
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.addEventListener('click', navigateToIndex);
    }

    // Event listener for "Home" button in Review page
    document.getElementById('homeBtn').addEventListener('click', navigateToIndex);

    // Keyboard navigation
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            navigateToIndex();
        } else if (event.key === 'ArrowLeft') {
            navigatePrev(); // Navigate to previous skit
        } else if (event.key === 'ArrowRight') {
            navigateNext(); // Navigate to next skit
        } else if (event.key === 'ArrowUp') {
            if (difficulty !== 'hard') {
                toggleClues();
            }
        } else if (event.key === 'ArrowDown') {
            if (difficulty === 'easy') {
                switchToPreviousLanguage();
            }
        } else if (event.key === 's') {
            toggleSvg();
        } else if (event.key === '/') {
            event.preventDefault();
            shuffleSkits();
        } else if (event.key === 'Shift') {
            if (difficulty !== 'hard') {
                toggleShowText();
            }
        } else if (event.key === '1') {
            clickAnswerButton(0);
        } else if (event.key === '2') {
            clickAnswerButton(1);
        } else if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
        
            const presenter = document.querySelector('.presenter');
            if (presenter) {
                presenter.click(); // ✅ Simulate a click on the presenter emoji
            }
        }        
    });

    // === SWIPE GESTURE LOGIC WITH FIXED SNAP-BACK ===
    let touchStartX = 0;
    let isDragging = false;
    let isSliderActive = false; // New flag for slider activity
    const container = document.querySelector('.skit-container'); // Target container
    const swipeThreshold = 50; // Minimum distance for swipe
    
    // Detect touch start position
    document.addEventListener('touchstart', (event) => {
        // Check if the touch is inside a slider
        if (event.target.closest('input[type="range"]')) {
            isSliderActive = true; // Temporarily disable swiping
            return;
        }
    
        touchStartX = event.changedTouches[0].screenX;
        isDragging = true;
        container.style.transition = 'none'; // Disable transitions during drag
    });
    
    // Handle touch move for visual feedback
    document.addEventListener('touchmove', (event) => {
        // If slider is active, do nothing
        if (isSliderActive) return;
    
        event.preventDefault(); // Prevent default scrolling behavior
        if (!isDragging) return;
    
        const touchMoveX = event.changedTouches[0].screenX;
        const moveDistance = touchMoveX - touchStartX; // Calculate drag distance
    
        // Apply transform for dragging effect
        container.style.transform = `translateX(calc(-50% + ${moveDistance}px))`;
    });
    
    // Handle touch end and finalize swipe
    document.addEventListener('touchend', (event) => {
        // If slider was active, reset the flag and exit
        if (isSliderActive) {
            isSliderActive = false;
            return;
        }
    
        if (!isDragging) return;
        isDragging = false;
    
        const touchEndX = event.changedTouches[0].screenX;
        const moveDistance = touchEndX - touchStartX; // Final drag distance
    
        // Add smooth snap-back transition
        container.style.transition = 'transform 0.3s ease';
    
        if (moveDistance < -swipeThreshold) {
            // Swipe left detected
            container.style.transform = 'translateX(calc(-50% - 100%))'; // Slide out effect
            setTimeout(() => {
                container.style.transform = 'translateX(-50%)'; // Snap back to center
                navigateNext(); // Perform navigation
            }, 300);
        } else if (moveDistance > swipeThreshold) {
            // Swipe right detected
            container.style.transform = 'translateX(calc(-50% + 100%))'; // Slide out effect
            setTimeout(() => {
                container.style.transform = 'translateX(-50%)'; // Snap back to center
                navigatePrev(); // Perform navigation
            }, 300);
        } else {
            // No valid swipe, just snap back
            container.style.transform = 'translateX(-50%)';
        }        
    });

        const volumeSlider = document.getElementById('volumeLevelSlider');
        const volumeMinIcon = document.getElementById('volumeMinIcon');
        const volumeMaxIcon = document.getElementById('volumeMaxIcon');

        if (volumeMinIcon && volumeSlider) {
            volumeMinIcon.addEventListener('click', () => {
                volumeSlider.value = 0;
                localStorage.setItem('ttsVolume', '0'); // ✅ Save it
                updateSpeakerIcon(0);
            });
        }
        
        if (volumeMaxIcon && volumeSlider) {
            volumeMaxIcon.addEventListener('click', () => {
                volumeSlider.value = 1;
                localStorage.setItem('ttsVolume', '1'); // ✅ Save it
                updateSpeakerIcon(1);
            });
        }
        
        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                localStorage.setItem('ttsVolume', volumeSlider.value); // ✅ Save whenever slider moves
                updateSpeakerIcon(parseFloat(volumeSlider.value));
            });
        
            // ✅ On page load, restore the saved volume value if available
            const savedVolume = localStorage.getItem('ttsVolume');
            if (savedVolume !== null) {
                volumeSlider.value = savedVolume;
            }
        
            setTimeout(() => {
                updateSpeakerIcon(parseFloat(volumeSlider.value));
            }, 0);
        }
    });
    
function handlePresenterClickWithHighlight() {
    const textElement = document.querySelector('.presenter-text');
    if (!textElement) {
        console.error('Presenter text element not found.');
        return;
    }

    let text = textElement.textContent.trim();
    text = processTextBasedOnLanguage(text, currentLanguage); // Clean the text for TTS

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = currentVoice;
    utterance.rate = getTTSSpeed();
    utterance.volume = getTTSVolume();

    let wordIndex = 0;

    // Highlight words using `onboundary`
    utterance.onboundary = (event) => {
        if (event.name === 'word') {
            const wordSpan = document.getElementById(`word-${wordIndex}`);
            if (wordSpan) {
                const wordText = wordSpan.textContent.trim();
                
                // Skip punctuation marks when preceded by a space
                if (['!', '?', ':', ';'].includes(wordText) && wordSpan.previousSibling?.textContent.trim() === '') {
                    wordIndex++;
                    return; // Skip this word
                }
    
                // Highlight the current word
                document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
                wordSpan.classList.add('highlight');
            }
            wordIndex++;
        }
    };
    
    utterance.onend = () => {
        // Clear highlights when TTS ends
        document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
    };
    
    speechSynthesis.speak(utterance);
}

// Define the addPresenterClickListener function
function addPresenterClickListener() {
    const presenterElement = document.querySelector('.presenter');
    if (!presenterElement) {
        console.error('Presenter element not found.');
        return;
    }

    presenterElement.addEventListener('click', () => {

        // Prevent TTS from being triggered if it's disabled
        if (!ttsEnabled) {
            console.warn('TTS is disabled. Presenter click will not trigger TTS.');
            return;
        }

        // Add the shake effect to the presenter element
        presenterElement.classList.add('rotate-shake');
        
        // Remove the shake class after the animation ends
        presenterElement.addEventListener('animationend', () => {
            presenterElement.classList.remove('rotate-shake');
        }, { once: true });

        // Check the current language and decide the behavior
        if (['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage)) {
            handleTTS(); // Directly fire handleTTS for Chinese/Japanese/Thai
        } else {
            handlePresenterClickWithHighlight(); // Use the new highlighting logic for other languages
        }
    });
}

function updateSpeakerIcon(volume) {
    const volumeMinIcon = document.getElementById('volumeMinIcon');
    if (!volumeMinIcon) return;

    if (volume == 0) {
        volumeMinIcon.src = 'https://openmoji.org/data/color/svg/1F507.svg'; // Muted speaker
    } else {
        volumeMinIcon.src = 'https://openmoji.org/data/color/svg/1F508.svg'; // Regular low-volume speaker
    }
}

// Function to transform and store JSON data with shared fields
function transformAndStoreData(categoryData) {
    // Check if the data contains sharedFields
    const hasSharedFields = categoryData.hasOwnProperty('sharedFields');

    // If there are sharedFields, transform the data
    if (hasSharedFields) {
        const { sharedFields, ...languages } = categoryData;

        // Transform each language section by merging shared fields with skits
        for (const lang in languages) {
            if (languages.hasOwnProperty(lang)) {
                const languageData = languages[lang];

                languageData.skits = languageData.skits.map(skit => {
                    const shared = sharedFields[skit.id];
                    return {
                        ...skit,
                        ...shared // Merge shared fields into each skit
                    };
                });
            }
        }

        // Store the transformed data back in categoryData
        categoryData = languages;
    }

    // Store the data in localStorage
    localStorage.setItem('translationsData', JSON.stringify(categoryData));
}

// Initialize content and event listeners on page load
document.addEventListener('DOMContentLoaded', () => {

    // Add a class to hide the content initially
    const body = document.body;
    body.classList.add('loading');

    // Define keys and their default values
    const keysToClear = {
        'reviewAnswerLogs': {},
        'SkitsForReview': [],
        'shuffledSkitIds': []
    };

    // Clear and reinitialize the specified keys
    Object.entries(keysToClear).forEach(([key, defaultValue]) => {
        localStorage.setItem(key, JSON.stringify(defaultValue)); // Clear and initialize with default value
    });

    // Initialize categoryCompletion if it does not exist
    if (!localStorage.getItem('categoryCompletion')) {
        localStorage.setItem('categoryCompletion', JSON.stringify({}));
    }

    // Retrieve category from URL
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');

    if (!category) {
        console.error('No category specified in URL');
        return;
    }

    const jsonFilePath = `data/skits/${category}.json`;
    const commonFilePath = 'data/common.json';

    // Retrieve the stored language from localStorage or fallback to 'en'
    currentLanguage = localStorage.getItem('currentLanguage') || 'en';

    // Apply stored settings or set defaults
    const storedShowClues = JSON.parse(localStorage.getItem('showClues')) || false;
    const storedShowText = localStorage.getItem('showText') !== null ? JSON.parse(localStorage.getItem('showText')) : true;
    const storedShowSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    const storedFontSize = localStorage.getItem('fontSize') || '16';
    const storedTextSpaces = JSON.parse(localStorage.getItem('isTextSpacesEnabled')) || false; // New switch state
    const storedTTSSpeed = localStorage.getItem('ttsSpeed') || '1.0';
    const storedTTSVolume = localStorage.getItem('ttsVolume') || '1';

    // Set the UI elements to reflect the stored settings
    document.getElementById('emojiSwitch').checked = storedShowClues;
    document.getElementById('textSwitch').checked = storedShowText;
    document.getElementById('svgSwitch').checked = storedShowSvg;
    document.getElementById('fontSizeSlider').value = storedFontSize;
    document.getElementById('customSwitch').checked = storedTextSpaces; // Reflect the stored state of "文字" switch
    document.querySelector('.presenter-text').style.fontSize = `${storedFontSize}px`;
    document.getElementById('TTSSpeedSlider').value = storedTTSSpeed;
    document.getElementById('volumeLevelSlider').value = storedTTSVolume;

    // Apply stored settings to global variables
    showClues = storedShowClues;
    showSvg = storedShowSvg;
    isTextSpacesEnabled = storedTextSpaces; // Update global variable for text spaces

    // Apply the showText setting to the UI
    const skitContainer = document.querySelector('.skit-container');
    const presenterEmoji = document.querySelector('.presenter'); // Ensure you select the correct presenter emoji element

    if (storedShowText) {
        skitContainer.classList.remove('hide-text');
        if (presenterEmoji) {
            presenterEmoji.classList.remove('large-emoji');
        }
    } else {
        skitContainer.classList.add('hide-text');
        if (presenterEmoji) {
            presenterEmoji.classList.add('large-emoji');
        }
    }

    // Fetch both common data and category-specific data
    Promise.all([
        fetch(commonFilePath).then(response => response.json()),
        fetch(jsonFilePath).then(response => response.json())
    ])
    .then(([commonData, categoryData]) => {

        // Store common data in local storage
        localStorage.setItem('commonData', JSON.stringify(commonData));

        // Transform and store category data
        transformAndStoreData(categoryData);

        // Update content and TTS settings based on current language
        updateContent(); // Ensure initial content update after loading translations
        checkAndInitializeVoices();
        initializeTTS(); // Initialize TTS with the selected language

        // Populate UI elements
        populateLanguagesDropdown(categoryData);

        // Add event listener for presenter click to speak text
        addPresenterClickListener();

        // Mark content as ready
        body.classList.remove('loading');
        body.classList.add('content-ready');
    })
    .catch(error => {
        console.error('Error loading data:', error);
        body.classList.remove('loading');
    });

    function handleClickOutsideDropdown(event) {
        if (
            !event.target.matches('.dropbtn') &&
            !event.target.closest('.dropdown-content')
        ) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
    
            // ✅ Remove .active from all dropbtns
            const buttons = document.getElementsByClassName("dropbtn");
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove("active");
            }
        }
    }
    
    // ✅ Support both mouse and touch devices
    window.addEventListener('click', handleClickOutsideDropdown);
    window.addEventListener('touchstart', handleClickOutsideDropdown);
    
    // ✅ Prevent inner clicks from bubbling and closing the dropdown
    document.querySelectorAll('.dropdown-content').forEach(content => {
        content.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });
    
    // Add event listeners for navigation buttons
    const prevButton = document.getElementById('prevBtn');
    const nextButton = document.getElementById('nextBtn');

    if (prevButton) {
        prevButton.addEventListener('click', navigatePrev);
    } else {
        console.error('Previous button not found.');
    }

    if (nextButton) {
        nextButton.addEventListener('click', navigateNext);
    } else {
        console.error('Next button not found.');
    }

    // Add event listeners for settings switches
    const emojiSwitch = document.getElementById('emojiSwitch');
    if (emojiSwitch) {
        emojiSwitch.addEventListener('change', toggleClues);
    }

    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
        textSwitch.addEventListener('change', toggleShowText);
    }

    const svgSwitch = document.getElementById('svgSwitch');
    if (svgSwitch) {
        svgSwitch.addEventListener('change', toggleSvg);
    }

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (event) => {
            adjustFontSize(event.target.value);
        });
    }

    const customSwitch = document.getElementById('customSwitch'); // New event listener for "文字" switch
    if (customSwitch) {
        customSwitch.addEventListener('change', toggleTextSpaces);
    }

    const switchLanguageBtn = document.getElementById('switchLanguageBtn');
    if (switchLanguageBtn) {
        switchLanguageBtn.addEventListener('click', switchToPreviousLanguage);
    }

    // Add an event listener for when the user changes the TTS speed slider value
    document.getElementById('TTSSpeedSlider').addEventListener('input', function() {
        const ttsSpeed = getTTSSpeed();
        localStorage.setItem('ttsSpeed', ttsSpeed); // Store the speed in localStorage
    });

    // Add event listener for the volume slider
    document.getElementById('volumeLevelSlider').addEventListener('input', function() {
        const volume = getTTSVolume();
        localStorage.setItem('ttsVolume', volume); // Store the volume in localStorage
    });

    toggleTextSpacesVisibility(); // Ensure the setting visibility is correct on page load
    updateLastVisibleSettingItem(); // Ensure the last item is correctly styled

    // Retrieve and restore the last clicked word from localStorage
    const storedCurrentWord = localStorage.getItem('currentWord');
    if (storedCurrentWord) {
        try {
            currentWord = JSON.parse(storedCurrentWord); // Convert stored string to array
            if (!Array.isArray(currentWord)) {
                currentWord = [currentWord]; // Ensure it's always an array
            }
            console.log(`Restored currentWord from localStorage:`, currentWord);
        } catch (error) {
            console.error('Error parsing currentWord from localStorage:', error);
            currentWord = null;
        }
    } else {
        currentWord = null;
    }

    // Event listener to remove highlight when clicking outside the speech bubble
document.body.addEventListener('click', function (event) {
    const speechBubble = document.querySelector('.presenter-text'); // Speech bubble element
    const isInsideSpeechBubble = speechBubble.contains(event.target); // Check if click is inside

    // Check if the click was NOT inside the speech bubble and not on header/footer
    if (!isInsideSpeechBubble && !event.target.closest('header') && !event.target.closest('footer')) {
        document.querySelectorAll('.word.highlight').forEach(el => {
            el.classList.remove('highlight'); // Remove all highlights
        });

        // Reset `currentWord` and remove from `localStorage`
        currentWord = null;
        localStorage.removeItem('currentWord');
        console.log("Highlight cleared. currentWord has been reset.");
    }
});
});

function populateLanguagesDropdown(translationsData) {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';  // Clear the dropdown

    const betaLanguages = ['de', 'is', 'th', 'ja', 'ko'];
    const normalLangs = [];
    const betaLangs = [];

    Object.entries(translationsData).forEach(([langCode, langData]) => {
        const languageName = langData.languageName;

        // Skip invalid or empty entries
        if (!languageName || languageName.trim() === '') return;

        // Create a button element
        const button = document.createElement('button');
        button.textContent = languageName;
        button.classList.add('language-btn');
        button.type = 'button';
        button.setAttribute('data-lang', langCode);

        // Add selected class if active
        if (langCode === currentLanguage) {
            button.classList.add('selected');
        }

        // Attach language switching event
        button.addEventListener('click', (event) => {
            event.preventDefault();
            changeLanguage(langCode);
        });

        // Store in appropriate list
        if (betaLanguages.includes(langCode)) {
            betaLangs.push(button);
        } else {
            normalLangs.push(button);
        }
    });

    // Append normal language buttons
    normalLangs.forEach(btn => dropdown.appendChild(btn));

    // Remove bottom border from the last normal language button (if Beta section exists)
    if (betaLangs.length > 0 && normalLangs.length > 0) {
        const lastNormalBtn = normalLangs[normalLangs.length - 1];
        lastNormalBtn.style.borderBottom = 'none';
    }

    // Add separator if needed
    if (betaLangs.length > 0) {
        const topHr = document.createElement('hr');
    
        const separator = document.createElement('div');
        separator.textContent = 'Beta';
        separator.className = 'beta-label';
    
        const bottomHr = document.createElement('hr');
    
        dropdown.appendChild(topHr);
        dropdown.appendChild(separator);
        dropdown.appendChild(bottomHr);
    
        betaLangs.forEach(btn => dropdown.appendChild(btn));
    }
    
    // Highlight the currently selected language
    updateSelectedLanguageButton(currentLanguage);
}

// Function to navigate to the previous skit
function navigatePrev() {
    // Guard clause: Do nothing if review page is active
    if (isReviewPageActive) return;

    const skits = isReviewingIncorrect
        ? JSON.parse(localStorage.getItem('reviewSkitsData'))?.[currentLanguage] || []
        : JSON.parse(localStorage.getItem('translationsData'))?.[currentLanguage]?.skits || [];

    if (currentSkitIndex > 0 && skits.length > 0) {
        currentSkitIndex--;
        currentSkitState = 'initial';
        resetButtonColors(); // Reset button colors when navigating between skits
        updateContent();
    }
}

// Function to navigate to the next skit
function navigateNext() {
    // Guard clause: Do nothing if review page is active
    if (isReviewPageActive) return;

    const skits = isReviewingIncorrect
        ? JSON.parse(localStorage.getItem('reviewSkitsData'))?.[currentLanguage] || []
        : JSON.parse(localStorage.getItem('translationsData'))?.[currentLanguage]?.skits || [];

    const totalSkits = skits.length;

    if (currentSkitIndex < totalSkits - 1 && totalSkits > 0) {
        currentSkitIndex++;
        currentSkitState = 'initial';
        resetButtonColors(); // Reset button colors when navigating between skits
        updateContent();
    } else if (currentSkitIndex === totalSkits - 1 && allSkitsAnswered(skits)) {
        showReviewPage();
    }
}

// Function to check if all skits have been answered
function allSkitsAnswered() {
    const answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    const skitsKey = isReviewingIncorrect ? 'reviewSkitsData' : 'translationsData';
    
    const skits = isReviewingIncorrect
        ? JSON.parse(localStorage.getItem(skitsKey))?.[currentLanguage] || []
        : JSON.parse(localStorage.getItem(skitsKey))?.[currentLanguage]?.skits || [];

    const answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};
    const totalSkits = skits.length;

    if (isReviewingIncorrect) {
        // In review mode: flat structure
        return Object.keys(answerLogs).length === totalSkits;
    } else {
        // In normal mode: nested structure
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();
        const categoryLogs = answerLogs?.[currentLang]?.[currentCategory] || {};

        return Object.keys(categoryLogs).length === totalSkits;
    }
}

function toggleClues() {
    showClues = !showClues;
    document.getElementById('emojiSwitch').checked = showClues; // Ensure the switch reflects the state
    localStorage.setItem('showClues', JSON.stringify(showClues)); // Store the state in localStorage

    // Set the flag to indicate this call is from toggleClues
    isShowCluesToggle = true;
    updateContent(); // Update UI to reflect new state
    isShowCluesToggle = false; // Reset the flag after the update
}

function toggleShowText() {
    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
        const skitContainer = document.querySelector('.skit-container');
        const presenterEmojiElement = document.querySelector('.presenter');

        // Predict the new visibility state based on the current state
        const willTextBeVisible = !skitContainer.classList.contains('hide-text');

        // Adjust the size of the presenter emoji based on the predicted new state
        if (presenterEmojiElement) {
            presenterEmojiElement.classList.toggle('large-emoji', willTextBeVisible);
        }

        // Now toggle the text visibility
        const isTextVisible = skitContainer.classList.toggle('hide-text');

        // Update the switch state and store the setting
        textSwitch.checked = !isTextVisible;
        localStorage.setItem('showText', JSON.stringify(!isTextVisible));
    }
}

function toggleSvg() {
    showSvg = !showSvg;
    localStorage.setItem('showSvg', JSON.stringify(showSvg)); // Store the state in localStorage
    
    const showSvgCheckbox = document.getElementById('svgSwitch');
    if (showSvgCheckbox) {
        showSvgCheckbox.checked = showSvg; // Update the switch to reflect the current state
    }
    
    if (showSvg) {
        convertToSvg();
    } else {
        revertToEmojis(); // Function to revert SVGs to emojis
    }
}

function convertToSvg() {
    document.querySelectorAll('.emoji').forEach(emojiSpan => {
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
            emojiSpan.innerHTML = `<img src=${newUrl} style="height: 1.2em;" alt="${emoji}">`; // Set height to 1.2em for slightly larger size
        }
    });

    document.querySelectorAll('.option-btn').forEach(optionBtn => {
        const emoji = optionBtn.textContent;
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
            optionBtn.innerHTML = `<img src=${newUrl} style="height: 1.5em;" alt="${emoji}">`; // Set height to 1.5em for x1.5 size
        }
    });

    const speechBubbleEmojis = document.querySelectorAll('.speech-bubble img');
    speechBubbleEmojis.forEach(emojiImg => {
        emojiImg.style.height = '1.5em'; // Set height to 1.5em for x1.5 size
    });

    // Convert presenter emoji to SVG with slightly larger default size
    const presenterEmoji = document.querySelector('.presenter');
    if (presenterEmoji) {
        const emoji = presenterEmoji.textContent;
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
            presenterEmoji.innerHTML = `<img src=${newUrl} style="height: 1.5em;" alt="${emoji}">`; // Set height to 1.5em for x1.5 size
        }
    }

    // Convert review emoji to SVG
    document.querySelectorAll('.reviewemoji').forEach(reviewEmoji => {
        const emoji = reviewEmoji.textContent;
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
            reviewEmoji.innerHTML = `<img src=${newUrl} style="height: 1.5em;" alt="${emoji}">`; // Set height to 1.5em for x1.5 size
        }
    });
}

function revertToEmojis() {
    document.querySelectorAll('.emoji').forEach(emojiSpan => {
        const imgElement = emojiSpan.querySelector('img');
        if (imgElement) {
            const emojiAlt = imgElement.getAttribute('alt');
            emojiSpan.textContent = emojiAlt;
        }
    });

    document.querySelectorAll('.option-btn').forEach(optionBtn => {
        const imgElement = optionBtn.querySelector('img');
        if (imgElement) {
            const emojiAlt = imgElement.getAttribute('alt');
            optionBtn.textContent = emojiAlt;
        }
    });

    const speechBubbleEmojis = document.querySelectorAll('.speech-bubble img');
    speechBubbleEmojis.forEach(emojiImg => {
        emojiImg.style.height = ''; // Remove the height attribute to revert to original size
    });

    // Revert presenter emoji to original size
    const presenterEmoji = document.querySelector('.presenter');
    if (presenterEmoji) {
        const imgElement = presenterEmoji.querySelector('img');
        if (imgElement) {
            const emojiAlt = imgElement.getAttribute('alt');
            presenterEmoji.textContent = emojiAlt;
        }
    }

    // Revert review emoji to original size
    document.querySelectorAll('.reviewemoji').forEach(reviewEmoji => {
        const imgElement = reviewEmoji.querySelector('img');
        if (imgElement) {
            const emojiAlt = imgElement.getAttribute('alt');
            reviewEmoji.textContent = emojiAlt;
        }
    });
}

function adjustFontSize(size) {
    document.querySelector('.presenter-text').style.fontSize = `${size}px`;
    localStorage.setItem('fontSize', size); // Store the font size in localStorage
}

function checkAnswer(isCorrect) {
    const skits = isReviewingIncorrect
        ? JSON.parse(localStorage.getItem('reviewSkitsData'))?.[currentLanguage] || []
        : JSON.parse(localStorage.getItem('translationsData'))?.[currentLanguage]?.skits || [];

    const skit = skits[currentSkitIndex]; // Retrieve the correct skit
    if (!skit) {
        console.error('Skit not found for current index:', currentSkitIndex);
        return;
    }

    const skitKey = `${skit.id}`; // Use skit ID as the key
    const answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';

    // Safely retrieve logs or initialize if empty
    let answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};

    if (isReviewingIncorrect) {
        // REVIEW MODE: flat structure, keep simple
        if (skitKey in answerLogs) {
            return navigateSkitState(isCorrect);
        }
        answerLogs[skitKey] = isCorrect ? 'correct' : 'incorrect';
    } else {
        // NORMAL MODE: nested structure by language and category
        const currentLang = localStorage.getItem('currentLanguage') || 'en';
        const currentCategory = getCurrentCategory();

        if (!answerLogs[currentLang]) {
            answerLogs[currentLang] = {};
        }
        if (!answerLogs[currentLang][currentCategory]) {
            answerLogs[currentLang][currentCategory] = {};
        }

        if (skitKey in answerLogs[currentLang][currentCategory]) {
            return navigateSkitState(isCorrect);
        }

        answerLogs[currentLang][currentCategory][skitKey] = isCorrect ? 'correct' : 'incorrect';
    }

    // Save updated logs to local storage
    localStorage.setItem(answerLogsKey, JSON.stringify(answerLogs));

    // Update state and content
    currentSkitState = isCorrect ? 'correct' : 'incorrect';

    // Save the current answered state for the skit in answerLogs
    // (already saved earlier, no need to resave here)

    updatePresenter();
    updateContent();

    // Recheck the checkbox properly
    const answeredCheckbox = document.getElementById('answeredCheckbox');
    if (answeredCheckbox) {
        const skitKey = `${skit.id}`;
        let isAnswered = false;

        if (isReviewingIncorrect) {
            isAnswered = answerLogs?.[skitKey] ? true : false;
        } else {
            const currentLang = localStorage.getItem('currentLanguage') || 'en';
            const currentCategory = getCurrentCategory();
            isAnswered = answerLogs?.[currentLang]?.[currentCategory]?.[skitKey] ? true : false;
        }

        answeredCheckbox.checked = isAnswered;
    }
}

// Function to toggle visibility of text spaces for Asian languages
function toggleTextSpaces() {
    const customSwitch = document.getElementById('customSwitch');
    isTextSpacesEnabled = customSwitch.checked;

    isTextSpacesToggle = true; // Set the flag to prevent shuffling
    localStorage.setItem('isTextSpacesEnabled', JSON.stringify(isTextSpacesEnabled)); // Store the state in localStorage
    updateContent(); // Update UI to reflect new state
    isTextSpacesToggle = false; // Reset the flag
}

function toggleTextSpacesVisibility() {
    const customSwitchContainer = document.querySelector('.custom-switch-container');
    const asianLanguages = ['zh-CN', 'zh-TW', 'ja', 'th'];

    if (asianLanguages.includes(currentLanguage)) {
        customSwitchContainer.style.display = 'block'; // Show the setting
    } else {
        customSwitchContainer.style.display = 'none'; // Hide the setting
    }

    // Update the last visible setting item
    updateLastVisibleSettingItem();
}

// Function to navigate to different states of the skit after logging the answer
function navigateSkitState(isCorrect) {
    currentSkitState = isCorrect ? 'correct' : 'incorrect';
    updatePresenter(); // Update the presenter's response
    updateContent();   // Update the content to reflect the new state
}

// Function to simulate clicking the answer buttons
function clickAnswerButton(index) {
    const optionButtons = document.querySelectorAll('.option-btn');
    if (optionButtons[index]) {
        optionButtons[index].click();
    }
}

document.querySelectorAll('.dropbtn').forEach(button => {
    const id = button.dataset.target;
    if (!id) return;
  
    const handler = (e) => {
      e.preventDefault();
      toggleDropdown(id, button);
    };
  
    button.addEventListener('click', handler);
    button.addEventListener('touchend', handler); // mobile support
  });  

// Initialize shuffled skits on page load
document.addEventListener('DOMContentLoaded', initializeShuffledSkits);