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

// TTS variables
let ttsEnabled = false;
let currentVoice = null;
let voicesInitialized = false; // To ensure voices are initialized only once
let ttsSpeed = localStorage.getItem('ttsSpeed') || '1.0'; // Default to 1.0x


// Function to reset button colors to the default blue color
function resetButtonColors() {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.style.backgroundColor = '#2196F3'; // Default blue color
    });
}

// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdowns = document.getElementsByClassName("dropdown-content");

    // Close all open dropdowns
    for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].classList.contains('show') && dropdowns[i].id !== id) {
            dropdowns[i].classList.remove('show');
        }
    }

    // Toggle the clicked dropdown
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
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
    console.log('Updated currentLanguage in localStorage:', lang);

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
    document.querySelector('footer').style.borderTop = 'none';
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

    // Count correct and incorrect answers
    for (let key in answerLogs) {
        if (answerLogs[key] === 'correct') {
            correctCount++;
        } else if (answerLogs[key] === 'incorrect') {
            incorrectCount++;
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
        const currentCategory = getCurrentCategory();
        categoryCompletion[currentCategory] = `✓ ${correctCount}/${totalSkits}`;
        localStorage.setItem('categoryCompletion', JSON.stringify(categoryCompletion));
    }
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
    // Determine which logs to use based on the current mode
    const logsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    
    // Retrieve existing data from local storage
    let answerLogs = JSON.parse(localStorage.getItem(logsKey)) || {};
    console.log('Answer Logs:', answerLogs);

    // Get incorrect skits from the selected answer logs
    const incorrectSkits = Object.keys(answerLogs).filter(key => answerLogs[key] === 'incorrect');
    console.log('Incorrect Skits:', incorrectSkits);

    // Retrieve translations data
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    if (!translationsData) {
        console.error('Translations data not found.');
        return;
    }

    // Create reviewSkitsData for all languages
    const reviewSkitsData = {};

    for (const language in translationsData) {
        // Filter the skits for review based on the incorrect skits
        reviewSkitsData[language] = translationsData[language].skits.filter(skit =>
            incorrectSkits.includes(skit.id.toString())
        );
    }

    // Save the filtered skits into reviewSkitsData for review mode
    localStorage.setItem('reviewSkitsData', JSON.stringify(reviewSkitsData));
    console.log('reviewSkitsData:', JSON.parse(localStorage.getItem('reviewSkitsData')));

    // Clear review-specific logs
    localStorage.setItem('reviewAnswerLogs', '{}');

    // Reset the shuffled skit order for review mode (optional)
    localStorage.setItem('shuffledSkitIds', '[]');

    // Set flags for review mode
    isReviewingIncorrect = true;
    isReviewPageActive = false;

    // Update the UI to switch from review page to skit container
    document.getElementById('reviewPage').style.display = 'none';
    document.querySelector('.skit-container').style.display = 'block';
    document.querySelector('.options-container').style.display = 'block';
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('skitIndicator').style.display = 'block';
    document.querySelector('footer').style.borderTop = '1px solid #ddd';

    // Reset skit index and state
    currentSkitIndex = 0;
    currentSkitState = 'initial';

    // Refresh the content using the new reviewSkitsData
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
    Object.values(answerLogs).forEach(log => {
        if (log === 'correct') {
            correctCount++;
        } else if (log === 'incorrect') {
            incorrectCount++;
        }
    });

    // Symbols for correct and incorrect
    const checkmark = '✓';
    const cross = '✗';

    // Construct skit indicator text with symbols
    const skitIndicatorText = `
    ${category} ${currentSkitIndex + 1}/${skits.length}
    <label>
        <input type="checkbox" id="answeredCheckbox" ${answerLogs[`${skit.id}`] && answerLogs[`${skit.id}`] !== 'unattempted' ? 'checked' : ''} disabled>
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
    
                // Process Asian words based on spaces
                return part.split(' ').map(word => {
                    if (word.trim()) {
                        // Wrap each word in a <span>
                        return `<span id="word-${wordIndex++}" class='word'>${word}</span>`;
                    }
                    // Add space if "addSpaces" is true
                    return addSpaces ? ' ' : '';
                }).join(addSpaces ? ' ' : ''); // Add spaces if "addSpaces" is true
            }).join('');
    
            // Step 3: Restore double spaces where placeholders exist
            modifiedText = modifiedText.replace(new RegExp(` ${spacePlaceholder} `, 'g'), '  ');
    
            // Step 4: Remove any remaining placeholders (just in case)
            return modifiedText.replace(new RegExp(spacePlaceholder, 'g'), ' ');
        } else {
            // Non-Asian languages: Wrap each word and preserve emojis
            return text.replace(/(<span class='emoji'>[^<]+<\/span>)|(\S+)/g, (match, p1, p2) => {
                if (p1) {
                    return p1; // Preserve emojis as-is
                }
                if (p2) {
                    // Wrap each word in a <span>
                    return `<span id="word-${wordIndex++}" class='word'>${p2}</span>`;
                }
            });
        }
    };
    
    // Step 1: Wrap words in spans
    const isAsianLanguage = ['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage);
    const isTextSpacesEnabled = JSON.parse(localStorage.getItem('isTextSpacesEnabled'));
    let wrappedPresenterContent = wrapWordsInSpans(presenterContent, isAsianLanguage, isTextSpacesEnabled);
    
    // Step 2: Apply underlining after wrapping
    wrappedPresenterContent = wrappedPresenterContent.replace(
        /(<span.*?>.*?\[UL\].*?\[ENDUL\].*?<\/span>|<span id="word-(\d+)" class='word'>(.*?)<\/span>(.*?)\[UL\](.*?)\[ENDUL\]([.,!?;]*))/g,
        (match, fullSpan, idStart, beforeUnderline, betweenWords, afterUnderline, punctuation) => {
            if (fullSpan) {
                // Handle already-wrapped spans containing [UL] and [ENDUL]
                return fullSpan.replace(/\[UL\](.*?)\[ENDUL\]/g, (m, underlinedText) => {
                    return `<span class="underline"><span class="word">${underlinedText}</span></span>`;
                });
            } else {
                // Handle unwrapped placeholders
                const wrappedBefore = `<span id="word-${idStart}" class='word'>${beforeUnderline}</span>${betweenWords}`;
                const wrappedUnderlined = `<span class="underline"><span id="${parseInt(idStart) + 1}" class='word'>${afterUnderline}</span></span>`;
                const wrappedPunctuation = punctuation ? `<span id="word-${parseInt(idStart) + 2}" class='word'>${punctuation}</span>` : '';
                return `${wrappedBefore}${wrappedUnderlined}${wrappedPunctuation}`;
            }
        }
    );
                
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
        speakText(wordElement.innerText, wordElement);
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
    optionButtons[shuffledOrder[0]].innerHTML = skit.options[0];
    optionButtons[shuffledOrder[0]].onclick = () => checkAnswer(false);
    optionButtons[shuffledOrder[1]].innerHTML = skit.options[1];
    optionButtons[shuffledOrder[1]].onclick = () => checkAnswer(true);

    // Set button colors based on the current skit state
    if (currentSkitState === 'incorrect') {
        optionButtons[shuffledOrder[0]].style.backgroundColor = '#F44336'; // Red for incorrect
        optionButtons[shuffledOrder[0]].onclick = () => navigateSkitState(false); // Allow navigating state
    } else if (currentSkitState === 'correct') {
        optionButtons[shuffledOrder[1]].style.backgroundColor = '#00ff00'; // Green for correct
        optionButtons[shuffledOrder[1]].onclick = () => navigateSkitState(true); // Allow navigating state
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
    const hasIncorrectSkits = Object.values(answerLogs).includes('incorrect');
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
    console.log('Speaking text:', text);

    // Disable TTS if the review page is active
    if (isReviewPageActive) {
        console.log('TTS is disabled on the review page.');
        return;
    }

    if (ttsEnabled && currentVoice) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        
        // Set the TTS rate based on the slider value
        utterance.rate = getTTSSpeed();
        
        // Set the TTS volume based on the slider value
        utterance.volume = getTTSVolume(); // Add this line to control volume
        
        console.log('TTS speed set to:', utterance.rate); // Debugging log to confirm speed
        console.log('TTS volume set to:', utterance.volume); // Debugging log to confirm volume
        
        speechSynthesis.speak(utterance);

        // Highlight the clicked word
        if (wordElement) {
            wordElement.classList.add('highlight');
            setTimeout(() => {
                wordElement.classList.remove('highlight');
            }, 500); // Adjust duration as needed
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
    console.log('Initialized default voices based on JSON languages in localStorage:', defaultVoices);
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

    voices
        .filter(voice => voice.lang.startsWith(currentLanguage)) // Filter voices based on selected language
        .forEach((voice) => {
            const button = document.createElement('button');
            button.className = 'voice-btn';  // Apply a CSS class for styling
            button.textContent = voice.name;  // Set the voice name as the button label

            // Set onclick event to change the current voice
            button.onclick = () => {
                currentVoice = voice;
                console.log(`Selected voice: ${voice.name}`);

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
                console.log('TTS is ready to use the selected voice.');

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

    // If no voices are available for the selected language, show a translated message and disable sliders
    if (voiceOptionsContainer.children.length === 0) {
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
    } else {
        // If voices are available, ensure sliders are enabled
        volumeSlider.disabled = false;
        speedSlider.disabled = false;
        volumeSlider.classList.remove('disabled-slider');
        speedSlider.classList.remove('disabled-slider');
    }

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

// Function to set TTS language based on stored voice
function setTTSLanguage(lang) {
    const storedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};
    const storedVoiceName = storedVoices[lang];
    
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        currentVoice = voices.find(voice => voice.lang.startsWith(lang) && voice.name === storedVoiceName);

        if (currentVoice) {
            ttsEnabled = true;
            console.log(`Selected voice: ${currentVoice.name}, Language: ${currentVoice.lang}`);
        } else {
            ttsEnabled = false;
            console.warn(`No TTS voices found for language: ${lang}`);
        }
    }
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
        // Run the old function for Thai
        console.log('Using old function for Thai');
        return processTextOld(text);
    } else {
        // Run the new function for other languages
        console.log('Using new function for other languages');
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

    // Step 4: Collapse multiple spaces (including non-breaking spaces)
    text = text.replace(/[\p{Zs}\s]+/gu, ' ');

    // Step 5: Trim leading and trailing spaces
    return text.trim();
}

// Function to handle TTS
function handleTTS() {
    console.log('handleTTS called'); // Log when handleTTS is called
    const textElement = document.querySelector('.presenter-text');
    if (textElement) {
        let text = textElement.textContent.trim();

        // Log the original text
        console.log('Original text:', text);

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

        // Log the processed text
        console.log('Processed text for TTS:', text);

        // Speak the processed text
        speakText(text);
    } else {
        console.error('.presenter-text element not found in handleTTS.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
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

    // Event listener for keyboard shortcuts and "Back" button
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            event.preventDefault(); // Prevent default escape key behavior
            navigateToIndex(); // Call the same function as header click
        } else if (event.key === 'ArrowLeft') {
            navigatePrev(); // Navigate to previous skit on ArrowLeft key press
        } else if (event.key === 'ArrowRight') {
            navigateNext(); // Navigate to next skit on ArrowRight key press
        } else if (event.key === 'ArrowUp') {
            toggleClues(); // Toggle clues on ArrowUp key press
        } else if (event.key === 'ArrowDown') {
            switchToPreviousLanguage(); // Switch to previous language on ArrowDown key press
        } else if (event.key === 's') {
            toggleSvg(); // Toggle show/hide SVG
        } else if (event.key === '/') {
            event.preventDefault(); // Prevent default slash key behavior
            shuffleSkits();
        } else if (event.key === 'Shift') {
            toggleShowText(); // Toggle show text setting on Shift key press
        } else if (event.key === '1') {
            clickAnswerButton(0); // Simulate click on the left button on key '1'
        } else if (event.key === '2') {
            clickAnswerButton(1); // Simulate click on the right button on key '2'
        } else if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault(); // Prevent default space bar behavior (scrolling)
            console.log('Spacebar pressed');
        
            // Check the current language and call the appropriate function
            if (['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage)) {
                console.log(`Language ${currentLanguage} detected. Calling handleTTS.`);
                handleTTS(); // Call handleTTS for Chinese/Japanese/Thai
            } else {
                console.log(`Language ${currentLanguage} detected. Calling handlePresenterClickWithHighlight.`);
                handlePresenterClickWithHighlight(); // Call the highlighting function for other languages
            }
        }
    });
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
                    console.log(`Skipping punctuation: "${wordText}"`);
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
    
    console.log('Final text passed to TTS:', text);
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
        console.log('Presenter element clicked');

        // Check the current language and decide the behavior
        if (['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage)) {
            console.log(`Language ${currentLanguage} detected. Using handleTTS.`);
            handleTTS(); // Directly fire handleTTS for Chinese/Japanese/Thai
        } else {
            console.log(`Language ${currentLanguage} detected. Using handlePresenterClickWithHighlight.`);
            handlePresenterClickWithHighlight(); // Use the new highlighting logic for other languages
        }
    });
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
    console.log('DOMContentLoaded event fired'); // Log when DOM content is loaded

    // Define keys and their default values
    const keysToClear = {
        'answerLogs': {},
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

    const jsonFilePath = `data/${category}.json`;
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
        console.log(`Common data and ${category} data loaded`); // Log when both data are loaded

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
    })
    .catch(error => console.error('Error loading data:', error));

    // Ensure dropdowns close when clicking outside of them
    window.onclick = function (event) {
        if (!event.target.matches('.dropbtn') && !event.target.closest('.dropdown-content')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    };
    
    document.querySelector('.dropdown-content').addEventListener('click', (event) => {
        event.stopPropagation();
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
        console.log('TTS speed set to:', ttsSpeed);
    });

        // Add event listener for the volume slider
    document.getElementById('volumeLevelSlider').addEventListener('input', function() {
        const volume = getTTSVolume();
        localStorage.setItem('ttsVolume', volume); // Store the volume in localStorage
        console.log('TTS volume set to:', volume);
    });

    toggleTextSpacesVisibility(); // Ensure the setting visibility is correct on page load
    updateLastVisibleSettingItem(); // Ensure the last item is correctly styled
});

function populateLanguagesDropdown(translationsData) {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';  // Clear the dropdown

    Object.keys(translationsData).forEach(langCode => {
        const languageName = translationsData[langCode].languageName;

        // Skip invalid or empty entries
        if (!languageName || languageName.trim() === '') return;

        // Create a button element
        const button = document.createElement('button');
        button.textContent = languageName;
        button.classList.add('language-btn');
        button.type = 'button';  // Important: Explicitly set button type
        button.setAttribute('data-lang', langCode); // Store the language code in a data attribute

        // Add the selected class if this language is currently active
        if (langCode === currentLanguage) {
            button.classList.add('selected');
        }

        // Use addEventListener to handle language switching
        button.addEventListener('click', (event) => {
            event.preventDefault();
            changeLanguage(langCode);
        });

        dropdown.appendChild(button);
    });

    // After populating the dropdown, ensure the correct language is highlighted
    updateSelectedLanguageButton(currentLanguage);
}

// Function to navigate to the previous skit
function navigatePrev() {
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

    // Check if all skits in the current mode have been answered
    return Object.keys(answerLogs).length === totalSkits;
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

    if (skitKey in answerLogs) {
        console.log('Answer already logged for this skit:', answerLogs[skitKey]);
        return navigateSkitState(isCorrect);
    }

    // Log the answer for the current skit
    answerLogs[skitKey] = isCorrect ? 'correct' : 'incorrect';

    // Save updated logs to local storage
    localStorage.setItem(answerLogsKey, JSON.stringify(answerLogs));
    console.log(`Updated ${answerLogsKey}:`, answerLogs);

    // Update state and content
    currentSkitState = isCorrect ? 'correct' : 'incorrect';
    updatePresenter();
    updateContent();

    // Update the checkbox to reflect the answered state
    const answeredCheckbox = document.getElementById('answeredCheckbox');
    if (answeredCheckbox) {
        answeredCheckbox.checked = true;
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

// Initialize shuffled skits on page load
document.addEventListener('DOMContentLoaded', initializeShuffledSkits);