// Initialize global variables
let currentLanguage = localStorage.getItem('currentLanguage') || 'en'; // Default language
let previousLanguage = 'en'; // To store the previous language
let showClues = JSON.parse(localStorage.getItem('showClues')) || false; // Default is to hide clues
let showSvg = JSON.parse(localStorage.getItem('showSvg')) || false; // Default is system emojis
let currentSkitIndex = 0; // Global variable to store the current skit index
let currentSkitState = 'initial'; // Current state of the skit
let shuffledOrder = [0, 1]; // To store the shuffled order of buttons
let isReviewPageActive = false;
let fontSize = localStorage.getItem('fontSize') || '16'; // Default font size
let isReviewingIncorrect = false; // This flag will determine if we're reviewing incorrect skits

// TTS variables
let ttsEnabled = false;
let currentVoice = null;
let voicesInitialized = false; // To ensure voices are initialized only once

// Function to reset button colors to the default blue color
function resetButtonColors() {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.style.backgroundColor = '#2196F3'; // Default blue color
    });
}

// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
}

// Function to update content based on the current language
function updateContent() {
    // Fetch the content from the JSON file based on currentLanguage
    fetch(`data/${getCurrentCategory()}.json`)
        .then(response => response.json())
        .then(data => {
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
        })
        .catch(error => {
            console.error('Error loading skit JSON:', error);
        });
}

// Function to change the language
function changeLanguage(lang) {
    previousLanguage = currentLanguage;
    currentLanguage = lang;
    updateContent();
    setTTSLanguage(lang); // Set TTS language
    toggleDropdown('languageDropdown'); // Close the dropdown menu after language change

    // Store the current language in localStorage for consistency
    localStorage.setItem('currentLanguage', lang);
    console.log('Updated currentLanguage in localStorage:', lang); // Debugging line
}
// Function to switch to previous language
function switchToPreviousLanguage() {
    const temp = currentLanguage;
    currentLanguage = previousLanguage;
    previousLanguage = temp;
    updateContent();
    setTTSLanguage(currentLanguage); // Set TTS language
}

// Function to show the review page
function showReviewPage() {
    isReviewPageActive = true;

    document.querySelector('.skit-container').style.display = 'none';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('skitIndicator').style.display = 'none';
    document.getElementById('reviewPage').style.display = 'flex';

    const answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    const answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const totalSkits = isReviewingIncorrect
        ? JSON.parse(localStorage.getItem('reviewIncorrectSkits')).length
        : translationsData[currentLanguage].skits.length;

    let correctCount = 0;
    let incorrectCount = 0;

    for (let key in answerLogs) {
        if (answerLogs[key] === 'correct') {
            correctCount++;
        } else if (answerLogs[key] === 'incorrect') {
            incorrectCount++;
        }
    }

    document.getElementById('correctCount').innerText = correctCount;
    document.getElementById('incorrectCount').innerText = incorrectCount;
    document.querySelectorAll('#totalCount').forEach(totalCountSpan => {
        totalCountSpan.innerText = totalSkits;
    });

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

// Function to restart the skits
function restartSkits() {
    isReviewingIncorrect = false;

    // Set the review page active flag to false
    isReviewPageActive = false;

    // Hide the review page
    document.getElementById('reviewPage').style.display = 'none';

    // Show main content
    document.querySelector('.skit-container').style.display = 'block';

    // Show navigation buttons
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';

    // Show skit indicator
    document.getElementById('skitIndicator').style.display = 'block';

    // Reset answer logs
    localStorage.removeItem('answerLogs');

    // Reset incorrect skits
    localStorage.removeItem('incorrectSkits');

    // If in review mode, also reset review-specific data
    if (isReviewingIncorrect) {
        // Clear review-specific logs and incorrect skits
        localStorage.removeItem('reviewAnswerLogs');
        localStorage.removeItem('reviewIncorrectSkits');
    }

    // Navigate to the first skit
    currentSkitIndex = 0;
    currentSkitState = 'initial';

    // Update the content to the first skit
    updateContent();
}

// Function to restart only the incorrect skits
function restartIncorrect() {
    isReviewingIncorrect = true;
    isReviewPageActive = false;

    document.getElementById('reviewPage').style.display = 'none';
    document.querySelector('.skit-container').style.display = 'block';
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('skitIndicator').style.display = 'block';

    let answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};

    const incorrectSkits = Object.keys(answerLogs).filter(key => answerLogs[key] === 'incorrect');
    localStorage.setItem('reviewIncorrectSkits', JSON.stringify(incorrectSkits));

    // Clear review answer logs for fresh session
    localStorage.setItem('reviewAnswerLogs', '{}');

    currentSkitIndex = 0;
    currentSkitState = 'initial';

    updateContent();
}

// Function to shuffle the buttons
function shuffleButtons() {
    shuffledOrder = [0, 1].sort(() => Math.random() - 0.5);
}

function updateContent() {
    // Load data from local storage
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const commonData = JSON.parse(localStorage.getItem('commonData'));

    if (!translationsData || !commonData) {
        console.error('Translations or common data not found in local storage.');
        return;
    }

    let skits;
    let answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    let incorrectSkitsKey = isReviewingIncorrect ? 'reviewIncorrectSkits' : 'incorrectSkits';

    // Retrieve answer logs and incorrect skits from local storage
    let answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};

    if (isReviewingIncorrect) {
        // Load only incorrect skits
        const incorrectSkits = JSON.parse(localStorage.getItem(incorrectSkitsKey)) || [];
        skits = translationsData[currentLanguage].skits.filter(skit => incorrectSkits.includes(skit.id.toString()));
    } else {
        // Load all skits normally
        skits = translationsData[currentLanguage].skits;
    }

    if (skits.length === 0) {
        console.error('No skits available to display.');
        return;
    }

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
        shuffleSkits: languageSettings.shuffleSkits[currentLanguage] || "Shuffle Skits"
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
        <input type="checkbox" id="answeredCheckbox" ${isReviewingIncorrect && answerLogs[`${skit.id}`] ? 'checked' : ''} disabled>
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

    // Prepare presenter content based on current skit state
    let presenterContent = '';
    let presenterEmoji = '';

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

    // Function to wrap words in spans and underline keywords
    const wrapWordsInSpans = (text, isAsianLanguage, keywords = []) => {
        const underlineKeyword = (word) => {
            for (let keyword of keywords) {
                const keywordEscaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${keywordEscaped})(?![^<]*>|[^<>]*</)`, 'gi');
                word = word.replace(regex, '<span class="underline">$1</span>');
            }
            return word;
        };

        if (isAsianLanguage) {
            const parts = text.split(/(<span class='emoji'>[^<]+<\/span>)/);
            return parts.map(part => {
                if (part.match(/<span class='emoji'>[^<]+<\/span>/)) {
                    return part;
                }
                return part.split(/\s+/).map(word => {
                    if (word.trim()) {
                        return `<span class='word'>${underlineKeyword(word)}</span>`;
                    } else {
                        return word;
                    }
                }).join('');
            }).join('');
        } else {
            return text.replace(/(<span class='emoji'>[^<]+<\/span>)|(\S+)/g, (match, p1, p2) => {
                if (p1) {
                    return p1;
                }
                if (p2) {
                    return `<span class='word'>${underlineKeyword(p2)}</span>`;
                }
            });
        }
    };

    const isAsianLanguage = ['zh', 'zh-TW', 'ja', 'ko', 'th'].includes(currentLanguage);
    let wrappedPresenterContent = wrapWordsInSpans(presenterContent, isAsianLanguage, skit.keywords);

    if (isAsianLanguage) {
        wrappedPresenterContent = wrappedPresenterContent.replace(/(?<=<\/span>)\s+(?=<span class='word'>)/g, '');
    }

    console.log('Wrapped Presenter Content:', wrappedPresenterContent);

    const presenterElement = document.querySelector('.presenter');
    const presenterTextElement = document.querySelector('.presenter-text');

    presenterElement.innerHTML = presenterEmoji;
    presenterTextElement.innerHTML = wrappedPresenterContent;

    presenterTextElement.querySelectorAll('.word').forEach(wordElement => {
        console.log('Adding click listener to:', wordElement.innerText);
        wordElement.addEventListener('click', () => {
            console.log('Clicked word:', wordElement.innerText);
            speakText(wordElement.innerText, wordElement);
        });
    });

    resetButtonColors();

    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons[shuffledOrder[0]].innerHTML = skit.options[0];
    optionButtons[shuffledOrder[0]].onclick = () => checkAnswer(false);
    optionButtons[shuffledOrder[1]].innerHTML = skit.options[1];
    optionButtons[shuffledOrder[1]].onclick = () => checkAnswer(true);

    // Set button colors based on the current skit state
    if (currentSkitState === 'incorrect') {
        optionButtons[shuffledOrder[0]].style.backgroundColor = '#F44336';
        optionButtons[shuffledOrder[0]].onclick = () => navigateSkitState(false); // Allow navigating state
    } else if (currentSkitState === 'correct') {
        optionButtons[shuffledOrder[1]].style.backgroundColor = '#00ff00';
        optionButtons[shuffledOrder[1]].onclick = () => navigateSkitState(true); // Allow navigating state
    }

    // Update settings labels with translations
    document.getElementById('showCluesLabel').textContent = settingsLabels.showClues;
    document.getElementById('showTextLabel').textContent = settingsLabels.showText;
    document.getElementById('showSvgLabel').textContent = settingsLabels.showSvg;
    document.getElementById('fontSizeLabel').textContent = settingsLabels.fontSize;

    // Update "Shuffle Skits" setting text dynamically
    const shuffleSkitsLabel = document.getElementById('shuffleSkits');
    if (shuffleSkitsLabel) {
        shuffleSkitsLabel.textContent = settingsLabels.shuffleSkits;
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
    if (!translationsData) {
        console.error('Translations data not found in local storage.');
        return;
    }

    const skitIds = Object.keys(translationsData[currentLanguage].skits).map(key => translationsData[currentLanguage].skits[key].id);
    const shuffledSkitIds = shuffleArray([...skitIds]);

    // Apply the shuffled order to all languages
    for (const language in translationsData) {
        const skits = translationsData[language].skits;
        const reorderedSkits = shuffledSkitIds.map(id => skits.find(skit => skit.id === id));
        translationsData[language].skits = reorderedSkits;
    }

    // Save the shuffled order in local storage
    localStorage.setItem('shuffledSkitIds', JSON.stringify(shuffledSkitIds));
    localStorage.setItem('translationsData', JSON.stringify(translationsData));

    // Reset current skit state to "initial"
    currentSkitState = 'initial';

    // Update the current skit index to the first skit in the shuffled order
    currentSkitIndex = 0;

    // Update content to reflect the new skit order
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

// Function to remove spaces for Asian languages
function removeSpaces(text) {
    return text.replace(/\s+/g, '');
}

// Add event listener to the restart button
document.getElementById('restartBtn').addEventListener('click', restartSkits);

// Event listener for "⟳(✗)" button
document.getElementById('restartIncorrectBtn').addEventListener('click', restartIncorrect);

// Add event listener to the back button
document.getElementById('backBtn').addEventListener('click', () => {
    if (isReviewPageActive) {
        // Clear answer logs if on review page
        localStorage.removeItem('answerLogs');
    }

    // Navigate directly to index.html
    window.location.href = 'index.html';
});

// Function to speak text
function speakText(text, wordElement = null) {
    console.log('Speaking text:', text); // Add a console log for debugging

    // Disable TTS if the review page is active
    if (isReviewPageActive) {
        console.log('TTS is disabled on the review page.');
        return;
    }

    if (ttsEnabled && currentVoice) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
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

// Function to initialize TTS and set language
function initializeTTS() {
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            if (!voicesInitialized) {
                voicesInitialized = true;
                logAvailableVoices(); // Log all available voices
                setTTSLanguage(currentLanguage);
            }
        };
        if (speechSynthesis.getVoices().length) {
            logAvailableVoices(); // Log all available voices
            setTTSLanguage(currentLanguage); // Set language initially if voices are already available
        }
    } else {
        console.warn('TTS not supported in this browser.');
    }
}

// Function to log all available voices
function logAvailableVoices() {
    const voices = speechSynthesis.getVoices();
    voices.forEach(voice => {
        console.log(`Voice: ${voice.name}, Lang: ${voice.lang}`);
    });
}

// Function to set TTS language
function setTTSLanguage(lang) {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        currentVoice = voices.find(voice => voice.lang.startsWith(lang));

        if (currentVoice) {
            ttsEnabled = true;
            console.log(`Selected voice: ${currentVoice.name}, Language: ${currentVoice.lang}`);
        } else {
            ttsEnabled = false;
            console.warn(`No TTS voices found for language: ${lang}`);
        }
    }
}

// Function to process text by removing emojis
function processText(text) {
    // Regular expression to remove emoji characters
    return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '')   // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')   // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')   // Transport and Map
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '')   // Alchemical Symbols
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')   // Geometric Shapes Extended
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')   // Supplemental Arrows-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')   // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')   // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')   // Symbols and Pictographs Extended-A
        .replace(/[\u{2600}-\u{26FF}]/gu, '')     // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '');    // Dingbats
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
        text = processText(text);

        // Log the processed text
        console.log('Processed text:', text);

        // Speak the processed text
        speakText(text);
    } else {
        console.error('.presenter-text element not found in handleTTS.');
    }
}

// Event listener for keyboard shortcuts and "Back" button
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        event.preventDefault(); // Prevent default escape key behavior
        window.location.href = 'index.html'; // Navigate directly to index.html on Escape key press
    } else if (event.key === 'ArrowLeft') {
        navigatePrev(); // Navigate to previous skit on ArrowLeft key press
    } else if (event.key === 'ArrowRight') {
        navigateNext(); // Navigate to next skit on ArrowRight key press
    } else if (event.key === 'ArrowUp') {
        toggleClues(); // Toggle clues on ArrowUp key press
    } else if (event.key === 'ArrowDown') {
        switchToPreviousLanguage(); // Switch to previous language on ArrowDown key press
    } else if (event.key === '/') {
        event.preventDefault(); // Prevent default slash key behavior
        shuffleSkits(); // Shuffle Skits on forward slash press
    } else if (event.key === 'Shift') {
        toggleShowText(); // Toggle show text setting on Shift key press
    } else if (event.key === '1') {
        clickAnswerButton(0); // Simulate click on the left button on key '1'
    } else if (event.key === '2') {
        clickAnswerButton(1); // Simulate click on the right button on key '2'
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault(); // Prevent default space bar behavior (scrolling)
        console.log('Spacebar pressed, calling handleTTS'); // Log when spacebar is pressed
        handleTTS(); // Call the same TTS handler function
    }
});

// Define the addPresenterClickListener function
function addPresenterClickListener() {
    const presenterElement = document.querySelector('.presenter');
    if (presenterElement) {
        console.log('Presenter element found, adding click event listener');
        presenterElement.addEventListener('click', () => {
            console.log('Presenter element clicked, calling handleTTS');
            handleTTS();
        });
    } else {
        console.error('Presenter element not found.');
    }
}

// Initialize content and event listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired'); // Log when DOM content is loaded

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

    // Set the UI elements to reflect the stored settings
    document.getElementById('emojiSwitch').checked = storedShowClues;
    document.getElementById('textSwitch').checked = storedShowText;
    document.getElementById('svgSwitch').checked = storedShowSvg;
    document.getElementById('fontSizeSlider').value = storedFontSize;
    document.querySelector('.presenter-text').style.fontSize = `${storedFontSize}px`;

    // Apply stored settings to global variables
    showClues = storedShowClues;
    showSvg = storedShowSvg;

    // Apply the showText setting to the UI
    const skitContainer = document.querySelector('.skit-container');
    if (storedShowText) {
        skitContainer.classList.remove('hide-text');
    } else {
        skitContainer.classList.add('hide-text');
    }

    // Fetch both common data and category-specific data
    Promise.all([
        fetch(commonFilePath).then(response => response.json()),
        fetch(jsonFilePath).then(response => response.json())
    ])
    .then(([commonData, categoryData]) => {
        console.log(`Common data and ${category} data loaded`); // Log when both data are loaded

        // Store data in local storage
        localStorage.setItem('commonData', JSON.stringify(commonData));
        localStorage.setItem('translationsData', JSON.stringify(categoryData));

        // Update content and TTS settings based on current language
        updateContent(); // Ensure initial content update after loading translations
        initializeTTS(); // Initialize TTS with the selected language

        // Populate UI elements
        populateLanguagesDropdown(categoryData);
        shuffleButtons();

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

    const emojiSwitch = document.getElementById('emojiSwitch');
    if (emojiSwitch) {
        emojiSwitch.addEventListener('change', () => {
            toggleClues();
        });
    }

    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
        textSwitch.addEventListener('change', () => {
            toggleShowText();
        });
    }

    const svgSwitch = document.getElementById('svgSwitch');
    if (svgSwitch) {
        svgSwitch.addEventListener('change', () => {
            toggleSvg();
        });
    }

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (event) => {
            adjustFontSize(event.target.value);
        });
    }

    const switchLanguageBtn = document.getElementById('switchLanguageBtn');
    if (switchLanguageBtn) {
        switchLanguageBtn.addEventListener('click', () => {
            switchToPreviousLanguage();
        });
    }
});

function populateLanguagesDropdown(translationsData) {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) return;

    Object.keys(translationsData).forEach(langCode => {
        const languageName = translationsData[langCode].languageName;

        // Create a button element
        const button = document.createElement('button');
        button.textContent = languageName;

        // Add classes to the button
        button.classList.add('language-btn'); // Add the class 'language-btn'

        // Assign onclick handler to change language
        button.onclick = () => changeLanguage(langCode);

        // Append the button to the dropdown
        dropdown.appendChild(button);
    });
}

// Function to toggle Show Text setting
function toggleShowText() {
    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
        const skitContainer = document.querySelector('.skit-container');
        const isTextVisible = skitContainer.classList.toggle('hide-text');

        textSwitch.checked = !isTextVisible; // Update switch state
        localStorage.setItem('showText', JSON.stringify(!isTextVisible)); // Save to localStorage
    }
}

// Function to navigate to the previous skit
function navigatePrev() {
    if (currentSkitIndex > 0) {
        currentSkitIndex--;
        currentSkitState = 'initial';
        shuffleButtons();
        resetButtonColors(); // Reset button colors when navigating between skits
        updateContent();
    }
}

// Function to navigate to the next skit
function navigateNext() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));

    if (!translationsData) return;

    let skits;

    if (isReviewingIncorrect) {
        // Load only incorrect skits
        const incorrectSkits = Object.keys(JSON.parse(localStorage.getItem('answerLogs')) || {}).filter(key => {
            return (JSON.parse(localStorage.getItem('answerLogs'))[key] === 'incorrect');
        });

        skits = translationsData[currentLanguage].skits.filter(skit => incorrectSkits.includes(skit.id.toString()));
    } else {
        // Load all skits normally
        skits = translationsData[currentLanguage].skits;
    }

    const totalSkits = skits.length;

    if (currentSkitIndex < totalSkits - 1) {
        currentSkitIndex++;
        currentSkitState = 'initial';
        shuffleButtons();
        resetButtonColors(); // Reset button colors when navigating between skits
        updateContent();
    } else if (currentSkitIndex === totalSkits - 1 && allSkitsAnswered()) {
        showReviewPage();
    }
}

// Function to check if all skits have been answered
function allSkitsAnswered() {
    const answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));
    const totalSkits = translationsData[currentLanguage].skits.length;

    // Check if all skits have been answered
    return Object.keys(answerLogs).length === totalSkits;
}

function toggleClues() {
    showClues = !showClues;
    document.getElementById('emojiSwitch').checked = showClues; // Ensure the switch reflects the state
    localStorage.setItem('showClues', JSON.stringify(showClues)); // Store the state in localStorage
    updateContent(); // Update UI to reflect new state
}

function toggleText() {
    const skitContainer = document.querySelector('.skit-container');
    const isTextVisible = skitContainer.classList.toggle('hide-text');
    localStorage.setItem('showText', JSON.stringify(!isTextVisible)); // Save to localStorage
}

function toggleSvg() {
    showSvg = !showSvg;
    localStorage.setItem('showSvg', JSON.stringify(showSvg)); // Store the state in localStorage
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
}

function adjustFontSize(size) {
    document.querySelector('.presenter-text').style.fontSize = `${size}px`;
    localStorage.setItem('fontSize', size); // Store the font size in localStorage
}

// Function to check the answer and update button colors
function checkAnswer(isCorrect) {
    const optionButtons = document.querySelectorAll('.option-btn');
    const skit = JSON.parse(localStorage.getItem('translationsData'))[currentLanguage].skits[currentSkitIndex];

    // Determine the appropriate local storage keys based on session type
    let answerLogsKey = isReviewingIncorrect ? 'reviewAnswerLogs' : 'answerLogs';
    let incorrectSkitsKey = isReviewingIncorrect ? 'reviewIncorrectSkits' : 'incorrectSkits';

    // Retrieve answer logs from local storage or initialize it
    let answerLogs = JSON.parse(localStorage.getItem(answerLogsKey)) || {};

    // Create a unique key for the current skit
    const skitKey = `${skit.id}`;

    // Check if the answer has already been logged for this skit
    if (skitKey in answerLogs) {
        console.log('Answer already logged for this skit:', answerLogs[skitKey]);
        return navigateSkitState(isCorrect); // Navigate to different state of the skit
    }

    // Log the answer for the current skit
    answerLogs[skitKey] = isCorrect ? 'correct' : 'incorrect';

    // Store updated answer logs in local storage
    localStorage.setItem(answerLogsKey, JSON.stringify(answerLogs));

    // If the answer is incorrect, add it to the list of incorrect skits
    if (!isCorrect) {
        let incorrectSkits = JSON.parse(localStorage.getItem(incorrectSkitsKey)) || [];
        if (!incorrectSkits.includes(skitKey)) {
            incorrectSkits.push(skitKey);
            localStorage.setItem(incorrectSkitsKey, JSON.stringify(incorrectSkits));
        }
    }

    // Update the current skit state
    currentSkitState = isCorrect ? 'correct' : 'incorrect';

    updatePresenter(); // Update the presenter's response
    updateContent();   // Update the content to reflect the new state

    // Update the checkbox to reflect that the skit has been answered
    const answeredCheckbox = document.getElementById('answeredCheckbox');
    if (answeredCheckbox) {
        answeredCheckbox.checked = true;
    }
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