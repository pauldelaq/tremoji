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

// Function to toggle dropdown menu
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle("show");
}

// Function to change language
function changeLanguage(lang) {
    previousLanguage = currentLanguage;
    currentLanguage = lang;
    updateContent();
    setTTSLanguage(lang); // Set TTS language
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
    const category = translationsData[currentLanguage].category; // Get shared category name
    const settings = translationsData[currentLanguage].settings;

    // Update skit indicator
    document.getElementById('skitIndicator').textContent = `${category} ${currentSkitIndex + 1}/${translationsData[currentLanguage].skits.length}`;

    // Update showClues setting based on checkbox state
    const showCluesCheckbox = document.getElementById('emojiSwitch');
    if (showCluesCheckbox) {
        showClues = showCluesCheckbox.checked;
    }

    if (showClues) {
        document.querySelector('.presenter-text').classList.remove('hide-clues');
    } else {
        document.querySelector('.presenter-text').classList.add('hide-clues');
    }

    // Update showSvg setting based on checkbox state
    const showSvgCheckbox = document.getElementById('svgSwitch');
    if (showSvgCheckbox) {
        showSvg = showSvgCheckbox.checked;
    }

    // Determine which presenter content to display based on skit state
    let presenterContent = '';
    let presenterEmoji = '';

    if (currentSkitState === 'initial') {
        presenterContent = skit.presenter;
        presenterEmoji = skit.emojiPresenter; // Use initial presenter emoji from translations.json
    } else if (currentSkitState === 'correct') {
        presenterContent = skit.responseCorrect;
        presenterEmoji = skit.emojiCorrect;
    } else if (currentSkitState === 'incorrect') {
        presenterContent = skit.responseIncorrect;
        presenterEmoji = skit.emojiIncorrect;
    }

    // Update presenter element with emoji and text
    const presenterElement = document.querySelector('.presenter');
    const presenterTextElement = document.querySelector('.presenter-text');

    presenterElement.innerHTML = presenterEmoji;
    presenterTextElement.innerHTML = presenterContent;

    // Apply shuffled order to buttons
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons[shuffledOrder[0]].innerHTML = skit.options[0];
    optionButtons[shuffledOrder[1]].innerHTML = skit.options[1];
    optionButtons[shuffledOrder[0]].onclick = () => checkAnswer(false);
    optionButtons[shuffledOrder[1]].onclick = () => checkAnswer(true);

    // Update settings labels
    document.getElementById('showCluesLabel').textContent = settings.showClues;
    document.getElementById('showTextLabel').textContent = settings.showText;
    document.getElementById('showSvgLabel').textContent = settings.showSvg;

    // Update SVG or emoji display based on settings
    if (showSvg) {
        convertToSvg();
    } else {
        revertToEmojis();
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
                setTTSLanguage(currentLanguage);
            }
        };
        if (speechSynthesis.getVoices().length) {
            setTTSLanguage(currentLanguage); // Set language initially if voices are already available
        }
    } else {
        console.warn('TTS not supported in this browser.');
    }
}

// Function to set TTS language
function setTTSLanguage(lang) {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        currentVoice = voices.find(voice => voice.lang.startsWith(lang));

        if (currentVoice) {
            ttsEnabled = true;
        } else {
            ttsEnabled = false;
            console.warn(`No TTS voices found for language: ${lang}`);
        }
    }
}

// Function to speak text
function speakText(text) {
    console.log('Speaking text:', text); // Add a console log for debugging
    if (ttsEnabled && currentVoice) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        speechSynthesis.speak(utterance);
    }
}

// Event listener for presenter click to speak text
const presenterElement = document.querySelector('.presenter');
if (presenterElement) {
    presenterElement.addEventListener('click', handlePresenterClick);
}

function handlePresenterClick(event) {
    const text = event.currentTarget.querySelector('.presenter-text').textContent.replace(/[^\w\s]/gi, ''); // Exclude emojis
    speakText(text);
}

// Event listeners for navigation buttons
document.getElementById('prevBtn').addEventListener('click', navigatePrev);
document.getElementById('nextBtn').addEventListener('click', navigateNext);

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
        const text = document.querySelector('.presenter-text').textContent.replace(/[^\w\s]/gi, ''); // Exclude emojis
        speakText(text); // Speak the text using TTS
    }
});

document.addEventListener('DOMContentLoaded', () => {
    fetch('data/translations.json')
        .then(response => response.json())
        .then(data => {
            localStorage.setItem('translationsData', JSON.stringify(data)); // Cache translations data
            shuffleButtons(); // Initial shuffle on page load
            updateContent(); // Initialize content on page load
        })
        .catch(error => console.error('Error loading translations:', error));

    // Close the dropdown if the user clicks outside of it
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

    // Prevent click events inside the dropdown from closing the menu
    document.querySelector('.dropdown-content').addEventListener('click', (event) => {
        event.stopPropagation();
    });

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

    // Initialize TTS and bind event listener for presenter click
    initializeTTS();

    const presenterElement = document.querySelector('.presenter');
    if (presenterElement) {
        presenterElement.addEventListener('click', () => {
            const text = document.querySelector('.presenter-text').textContent.replace(/[^\w\s]/gi, ''); // Exclude emojis
            speakText(text);
        });
    }
});

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
        shuffleButtons(); // Shuffle buttons when navigating between skits
        updateContent();
    }
}

// Function to navigate to the next skit
function navigateNext() {
    const translationsData = JSON.parse(localStorage.getItem('translationsData'));

    if (translationsData && currentSkitIndex < translationsData[currentLanguage].skits.length - 1) {
        currentSkitIndex++;
        currentSkitState = 'initial';
        shuffleButtons(); // Shuffle buttons when navigating between skits
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

// Function to check the selected answer
function checkAnswer(isCorrect) {
    currentSkitState = isCorrect ? 'correct' : 'incorrect';
    updateContent();
}

// Function to simulate clicking the answer buttons
function clickAnswerButton(index) {
    const optionButtons = document.querySelectorAll('.option-btn');
    if (optionButtons[index]) {
        optionButtons[index].click();
    }
}