let currentLanguage = 'en'; // Default language
let previousLanguage = 'en'; // To store the previous language
let showClues = false; // Default is to hide clues
let showSvg = false; // Default is system emojis
let currentSkitIndex = 0; // Global variable to store the current skit index
let currentSkitState = 'initial'; // Current state of the skit
let shuffledOrder = [0, 1]; // To store the shuffled order of buttons

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

function changeLanguage(lang) {
    previousLanguage = currentLanguage;
    currentLanguage = lang;
    updateContent();
    setTTSLanguage(lang); // Set TTS language
    toggleDropdown('languageDropdown'); // Close the dropdown menu after language change
}

// Function to switch to previous language
function switchToPreviousLanguage() {
    const temp = currentLanguage;
    currentLanguage = previousLanguage;
    previousLanguage = temp;
    updateContent();
    setTTSLanguage(currentLanguage); // Set TTS language
}

// Function to shuffle the buttons
function shuffleButtons() {
    shuffledOrder = [0, 1].sort(() => Math.random() - 0.5);
}

// Function to update content based on language and settings
function updateContent() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));

    if (!translationsData) {
        console.error('Translations data not found in local storage.');
        return;
    }

    const skit = translationsData[currentLanguage].skits[currentSkitIndex];
    const category = translationsData[currentLanguage].category;
    const settings = translationsData[currentLanguage].settings;

    // Retrieve answer logs from local storage or initialize it
    let answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};

    // Create a unique key for the current skit
    const skitKey = `${skit.id}`;

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

    // Check if the current skit has been answered
    const skitAnswered = skitKey in answerLogs;

    // Construct skit indicator text with symbols and checkbox
    const skitIndicatorText = `
        ${category} ${currentSkitIndex + 1}/${translationsData[currentLanguage].skits.length} - 
        <label>
            <input type="checkbox" id="answeredCheckbox" ${skitAnswered ? 'checked' : ''} disabled>
            <span class="custom-checkbox"></span>
        </label>
        <br>
        ${checkmark} ${correctCount}, ${cross} ${incorrectCount}
    `;
    
    document.getElementById('skitIndicator').innerHTML = skitIndicatorText;

    const showCluesCheckbox = document.getElementById('emojiSwitch');
    if (showCluesCheckbox) {
        showClues = showCluesCheckbox.checked;
    }

    if (showClues) {
        document.querySelector('.presenter-text').classList.remove('hide-clues');
    } else {
        document.querySelector('.presenter-text').classList.add('hide-clues');
    }

    const showSvgCheckbox = document.getElementById('svgSwitch');
    if (showSvgCheckbox) {
        showSvg = showSvgCheckbox.checked;
    }

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

    const wrapWordsInSpans = (text, isAsianLanguage, keywords = []) => {
        // Function to underline keywords in a word
        const underlineKeyword = (word) => {
            for (let keyword of keywords) {
                const keywordEscaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
                const regex = new RegExp(`(${keywordEscaped})(?![^<]*>|[^<>]*</)`, 'gi'); // Regex to match keyword outside HTML tags
                word = word.replace(regex, '<span class="underline">$1</span>');
            }
            return word;
        };

        if (isAsianLanguage) {
            const parts = text.split(/(<span class='emoji'>[^<]+<\/span>)/);
            return parts.map(part => {
                if (part.match(/<span class='emoji'>[^<]+<\/span>/)) {
                    return part; // Preserve existing emoji spans
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

    document.getElementById('showCluesLabel').textContent = settings.showClues;
    document.getElementById('showTextLabel').textContent = settings.showText;
    document.getElementById('showSvgLabel').textContent = settings.showSvg;
    document.getElementById('fontSizeLabel').textContent = settings.fontSize;

    // Update "Shuffle Skits" setting text dynamically
    const shuffleSkitsLabel = document.getElementById('shuffleSkits');
    if (shuffleSkitsLabel) {
        shuffleSkitsLabel.textContent = settings.shuffleSkits;
    }

    if (showSvg) {
        convertToSvg();
    } else {
        revertToEmojis();
    }
}

// Function to remove spaces for Asian languages
function removeSpaces(text) {
    return text.replace(/\s+/g, '');
}

// Ensure the function to speak text is in place
function speakText(text, wordElement = null) {
    console.log('Speaking text:', text); // Add a console log for debugging
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
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        history.back(); // Navigate back on Escape key press
    } else if (event.key === 'ArrowLeft') {
        navigatePrev(); // Navigate to previous skit on ArrowLeft key press
    } else if (event.key === 'ArrowRight') {
        navigateNext(); // Navigate to next skit on ArrowRight key press
    } else if (event.key === 'ArrowUp') {
        toggleClues(); // Toggle clues on ArrowUp key press
    } else if (event.key === 'ArrowDown') {
        switchToPreviousLanguage(); // Switch to previous language on ArrowDown key press
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

// Initialize content and event listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired'); // Log when DOM content is loaded
    fetch('data/translations.json')
        .then(response => response.json())
        .then(data => {
            console.log('Translations data loaded'); // Log when translations data is loaded
            localStorage.setItem('translationsData', JSON.stringify(data));
            populateLanguagesDropdown(data);
            shuffleButtons();
            updateContent(); // Ensure initial content update after loading translations
            
            // Event listener for presenter click to speak text
            const presenterElement = document.querySelector('.presenter');
            const textElement = document.querySelector('.presenter-text');
            if (presenterElement) {
                if (textElement) {
                    console.log('Presenter element found, adding click event listener'); // Log when presenter element is found
                    presenterElement.addEventListener('click', () => {
                        console.log('Presenter element clicked, calling handleTTS'); // Log when presenter element is clicked
                        handleTTS();
                    });
                } else {
                    console.error('.presenter-text element not found during initialization.');
                }
            } else {
                console.error('Presenter element not found.');
            }
        })
        .catch(error => console.error('Error loading translations:', error));

        // Ensure dropdowns close when clicking outside of them
        window.onclick = function(event) {
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
            toggleText();
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

    initializeTTS();

    const presenterElement = document.querySelector('.presenter');
    if (presenterElement) {
        presenterElement.addEventListener('click', (event) => {
            const textElement = event.currentTarget.querySelector('.presenter-text');
            if (textElement) {
                const text = textElement.textContent.replace(/[^\w\s]/gi, '');
                speakText(text);
            } else {
                console.error('Error: .presenter-text element not found.');
            }
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
        textSwitch.checked = !textSwitch.checked;
        toggleText(); // Toggle text display immediately
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

    if (translationsData && currentSkitIndex < translationsData[currentLanguage].skits.length - 1) {
        currentSkitIndex++;
        currentSkitState = 'initial';
        shuffleButtons();
        resetButtonColors(); // Reset button colors when navigating between skits
        updateContent();
    }
}

function toggleClues() {
    showClues = !showClues;
    document.getElementById('emojiSwitch').checked = showClues; // Ensure the switch reflects the state
    updateContent(); // Update UI to reflect new state
}

function toggleText() {
    const skitContainer = document.querySelector('.skit-container');
    skitContainer.classList.toggle('hide-text');
}

function toggleSvg() {
    showSvg = !showSvg;
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
    // Only target the presenter's speech bubble text for font size adjustment
    document.querySelector('.presenter-text').style.fontSize = `${size}px`;
}

// Function to check the answer and update button colors
function checkAnswer(isCorrect) {
    const optionButtons = document.querySelectorAll('.option-btn');
    const skit = JSON.parse(localStorage.getItem('translationsData'))[currentLanguage].skits[currentSkitIndex];

    // Retrieve answer logs from local storage or initialize it
    let answerLogs = JSON.parse(localStorage.getItem('answerLogs')) || {};

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
    localStorage.setItem('answerLogs', JSON.stringify(answerLogs));

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