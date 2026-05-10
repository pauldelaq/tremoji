let loadedEmojis = {};
let ttsEnabled = false;
let currentVoice = null;
let voicesInitialized = false;
let currentLanguage = localStorage.getItem('currentLanguage') || 'en';
let activeMatchOutsideClickHandler = null;
let jsConfetti = null;

function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');

    buttons.forEach(button => {
        button.classList.remove('selected');
    });

    const selectedButton = [...buttons].find(button => button.getAttribute('data-lang') === lang);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

function getEmojiCode(emoji) {
    return [...emoji].map(e => e.codePointAt(0).toString(16).padStart(4, '0')).join('-').toUpperCase();
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    if (typeof JSConfetti !== 'undefined') {
        jsConfetti = new JSConfetti();
    }
    const categoryList = document.getElementById('category-list');
    const gameModeHeader = document.getElementById('game-mode-header');
    const headerTitle = document.getElementById('header-title');
    const selectCategoryText = document.getElementById('select-category');
    const langButton = document.getElementById('langToggleBtn');
    const dropdownContent = document.getElementById('language-dropdown');
    const settingsButton = document.getElementById('settingsToggleBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const svgSwitch = document.getElementById('svgSwitch');
    const showSvgLabel = document.getElementById('showSvgLabel');
    const specialEmojiSpan = document.getElementById('special-emoji');

    const soundButton = document.getElementById('soundToggleBtn');
    const soundDropdown = document.getElementById('soundDropdown');
    const volumeSlider = document.getElementById('volumeLevelSlider');
    const speedSlider = document.getElementById('TTSSpeedSlider');
    const volumeMinIcon = document.getElementById('volumeMinIcon');
    const volumeMaxIcon = document.getElementById('volumeMaxIcon');

    const params = new URLSearchParams(window.location.search);
    const currentGameId = params.get('game') || 'match';
    let currentCategoryFileName = params.get('category');
    let currentReviewTranslation = null;
    let currentMatchCategoryPairs = [];

    setActiveReviewGame(currentGameId);

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

    const currentLang = localStorage.getItem('currentLanguage') || 'en';
    const showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
    const specialEmoji = "😌";
    const specialEmojiSVGUrl = 'assets/svg/1F60C.svg';

    if (headerTitle) {
        headerTitle.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (svgSwitch) {
        svgSwitch.checked = showSvg;

        if (specialEmojiSpan) {
            if (showSvg) {
                specialEmojiSpan.innerHTML = `<img src="${specialEmojiSVGUrl}" style="height: 1.2em;" alt="Special Emoji">`;
            } else {
                specialEmojiSpan.textContent = specialEmoji;
            }
        }
    }

    function wrapEmoji(emoji) {
        return `<span class="emoji" data-emoji="${emoji}">${emoji}</span>`;
    }

    function wrapEmojiArray(emojiArray) {
        return emojiArray.map(wrapEmoji).join('');
    }

    function loadCommonTranslations(lang) {
        return fetch('data/common.json')
            .then(response => response.json())
            .then(commonTranslations => {
                const defaultLang = 'en';
                const validLang = commonTranslations.settings?.showSvg?.[lang] ? lang : defaultLang;
                const settings = commonTranslations.settings;

                if (showSvgLabel) showSvgLabel.textContent = settings.showSvg[validLang];

                const volumeLevelLabel = document.getElementById('volumeLevelLabel');
                const ttsSpeedLabel = document.getElementById('TTSSpeedLabel');
                const settingCategoryHeaders = document.querySelectorAll('.setting-category p');

                if (volumeLevelLabel) volumeLevelLabel.textContent = settings.volume?.[validLang] || 'Volume';
                if (ttsSpeedLabel) ttsSpeedLabel.textContent = settings.ttsSpeed?.[validLang] || 'TTS Speed';
                if (settingCategoryHeaders[0]) settingCategoryHeaders[0].textContent = settings.ttsSettings?.[validLang] || 'TTS Settings';
                if (settingCategoryHeaders[1]) settingCategoryHeaders[1].textContent = settings.ttsVoices?.[validLang] || 'TTS Voices';

                localStorage.setItem('commonData', JSON.stringify(commonTranslations));
            });
    }

    function displayCategories(translation, lang) {
        if (!categoryList) return;

        categoryList.innerHTML = '';

        translation.categories.forEach(category => {
            const emojiArray = loadedEmojis[category.id] || [];
            const categoryFileName = categoryFileNames[category.id];

            const li = document.createElement('li');
            li.className = 'category-item';

            li.innerHTML = `
                <div class="category-line">
                    <div class="emoji-block">${wrapEmojiArray(emojiArray)}</div>
                    <div class="text-container">
                        <div class="top-row">
                            <div class="category-text">${category.text}</div>
                        </div>
                    </div>
                </div>
            `;

            li.addEventListener('click', () => {
                startReviewCategory(categoryFileName, lang);
            });

            categoryList.appendChild(li);
        });

        if (JSON.parse(localStorage.getItem('showSvg'))) {
            convertToSvg();
        }
    }

    // --- BEGIN: Inserted review helpers for extracting and reviewing category data ---
    function extractWordEmojiPairsFromText(text) {
        if (!text || typeof text !== 'string') return [];

        const connectorPattern = currentLanguage === 'ko'
            ? String.raw`(?:[^\[<]{0,24})?`
            : String.raw`\s*[.,!?;:，。！？、；：]?\s*`;

        const pairRegex = new RegExp(
            String.raw`((?:\[UL\][^\[\]]*?\[ENDUL\]\s*)+)` +
            connectorPattern +
            String.raw`<span\s+class=['"]emoji['"]>([\s\S]*?)<\/span>`,
            'g'
        );
        const pairs = [];
        let match;

        while ((match = pairRegex.exec(text)) !== null) {
            const rawWordGroup = match[1];
            const emoji = match[2];
            const cleanWord = extractCleanWordsFromTaggedGroup(rawWordGroup).join(' ');

            if (!cleanWord || !emoji) continue;

            pairs.push({
                word: cleanWord,
                emoji: emoji.trim(),
                sourceText: text
            });
        }

        return pairs;
    }

    function extractCleanWordsFromTaggedGroup(rawWordGroup) {
        const words = [];
        const taggedWordRegex = /\[UL\]([^\[\]]*?)\[ENDUL\]/g;
        let taggedWordMatch;

        while ((taggedWordMatch = taggedWordRegex.exec(rawWordGroup)) !== null) {
            const cleanWord = cleanTaggedWord(taggedWordMatch[1]);
            if (cleanWord) words.push(cleanWord);
        }

        return words;
    }

    function cleanTaggedWord(rawWord) {
        return rawWord
            .replace(/\d+(?:_\d+)*/g, '')
            .replace(/\s+/g, ' ')
            .replace(/^[\s.,!?;:，。！？、；：]+|[\s.,!?;:，。！？、；：]+$/g, '')
            .trim();
    }

    function formatReviewWordForDisplay(word) {
        if (['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)) {
            return word.replace(/\s+/g, '');
        }
        return word;
    }

    function extractWordEmojiPairsFromSkits(skits) {
        if (!Array.isArray(skits)) return [];

        const pairs = [];
        const seen = new Set();

        skits.forEach(skit => {
            const responsePairs = extractWordEmojiPairsFromText(skit.responseCorrect);

            responsePairs.forEach(pair => {
                const wordKey = pair.word.trim().toLocaleLowerCase();
                const emojiKey = normalizeExactEmojiKey(pair.emoji);
                const key = `${wordKey}|||${emojiKey}`;

                if (seen.has(key)) return;

                seen.add(key);
                pairs.push({
                    ...pair,
                    skitId: skit.id
                });
            });
        });

        return pairs;
    }

    function loadReviewCategoryData(categoryFileName, lang) {
        return fetch(`data/skits/${categoryFileName}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not load category data: ${categoryFileName}`);
                }
                return response.json();
            })
            .then(categoryData => {
                const validLang = categoryData[lang] ? lang : 'en';
                const skits = categoryData[validLang]?.skits || [];
                const pairs = extractWordEmojiPairsFromSkits(skits);

                return {
                    categoryData,
                    validLang,
                    skits,
                    pairs
                };
            });
    }

    function startReviewCategory(categoryFileName, lang) {
        currentCategoryFileName = categoryFileName;
        window.history.pushState({}, '', `review.html?game=${encodeURIComponent(currentGameId)}&category=${encodeURIComponent(categoryFileName)}`);
        showGameplayView(currentGameId);

        loadReviewCategoryData(categoryFileName, lang)
            .then(({ pairs }) => {
                console.log('Extracted review pairs:', pairs);

                if (currentGameId === 'match') {
                    renderMatchGameIntro(pairs);
                }
            })
            .catch(error => {
                console.error('Error starting review category:', error);
                showCategorySelectionView();
            });
    }

    function setReviewState(state) {
        const reviewApp = document.getElementById('review-app');
        if (!reviewApp) return;

        reviewApp.classList.remove(
            'review-state-category',
            'review-state-intro',
            'review-state-playing',
            'review-state-complete'
        );

        reviewApp.classList.add(`review-state-${state}`);
    }

    function setActiveReviewGame(gameId) {
        const reviewApp = document.getElementById('review-app');
        if (!reviewApp) return;

        reviewApp.classList.remove('review-game-match', 'review-game-guess-word');
        reviewApp.classList.add(`review-game-${gameId === 'guess-word' ? 'guess-word' : 'match'}`);
    }

    function showGameplayView(gameId) {
        setActiveReviewGame(gameId);
        setReviewState('intro');
    }

    function showCategorySelectionView() {
        if (currentReviewTranslation) {
            displayCategories(currentReviewTranslation, currentLanguage);
        }

        setReviewState('category');
    }

    function renderMatchGameIntro(pairs) {
        const matchGameView = document.getElementById('match-game-view');
        if (!matchGameView) return;

        currentMatchCategoryPairs = pairs;

        matchGameView.classList.remove('match-play-view');
        matchGameView.classList.add('match-intro-view');
        matchGameView.innerHTML = '';
        setReviewState('intro');

        const gameHeaderDiv = document.createElement('div');
        gameHeaderDiv.className = 'boxed';
        const matchGameHeader = document.createElement('h2');
        matchGameHeader.className = 'mode-header';
        const currentGame = currentReviewTranslation?.games?.find(
            game => game.id === currentGameId
        );

        matchGameHeader.textContent = currentGame?.text || 'Matching';
        const vocabHeader = document.createElement('h2');
        vocabHeader.textContent = currentReviewTranslation?.vocabularyList || 'Vocabulary List';
        gameHeaderDiv.appendChild(matchGameHeader);
        gameHeaderDiv.appendChild(vocabHeader);

        const introHomeButton = document.createElement('button');
        introHomeButton.type = 'button';
        introHomeButton.className = 'match-intro-home-button';
        introHomeButton.innerHTML = `
            <img src="assets/svg/1F3E0.svg" alt="Home" width="40" height="40">
        `;

        introHomeButton.addEventListener('click', () => {
            currentMatchCategoryPairs = [];
            showCategorySelectionView();
            window.history.pushState({}, '', `review.html?game=${encodeURIComponent(currentGameId)}`);
            currentCategoryFileName = null;
        });

        const vocabList = document.createElement('div');
        vocabList.className = 'match-vocab-list';

        const currentCategory = currentReviewTranslation?.categories?.find(category => {
            return categoryFileNames[category.id] === currentCategoryFileName;
        });

        const categoryRow = document.createElement('div');
        categoryRow.className = 'match-vocab-category-row';
        categoryRow.innerHTML = `
            <div class="match-category-title">
                ${currentCategory?.text || currentCategoryFileName || ''}
            </div>
        `;
        vocabList.appendChild(categoryRow);

        pairs.forEach(pair => {
            const row = document.createElement('div');
            row.className = 'match-vocab-row';

            row.innerHTML = `
                <div class="match-vocab-emoji">${wrapEmoji(pair.emoji)}</div>
                <div class="match-vocab-word">${formatReviewWordForDisplay(pair.word)}</div>
            `;

            row.addEventListener('click', () => {
                speakReviewText(pair.word);
            });

            vocabList.appendChild(row);
        });

        const readyRow = document.createElement('div');
        readyRow.className = 'match-vocab-category-row';
        readyRow.innerHTML = `
            <div class="match-category-title">
                ${currentReviewTranslation?.readyToPlay || 'Ready to play? Press the button to start.'}
            </div>
        `;
        vocabList.appendChild(readyRow);

        const startButton = document.createElement('button');
        startButton.type = 'button';
        startButton.className = 'match-start-button';
        startButton.innerHTML = `
            <img src="assets/svg/23E9.svg" alt="" class="match-start-icon">
        `;

        startButton.addEventListener('click', () => {
            const roundPairs = getMatchRoundPairs(pairs, 8);
            startMatchGame(roundPairs);
        });

        matchGameView.appendChild(gameHeaderDiv);
        matchGameView.appendChild(introHomeButton);
        matchGameView.appendChild(vocabList);
        matchGameView.appendChild(startButton);

        if (JSON.parse(localStorage.getItem('showSvg'))) {
            convertToSvg();
        }
    }

    // --- END: Inserted review helpers ---

    function shuffleArray(array) {
        const shuffled = [...array];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    function normalizeExactEmojiKey(emoji) {
        return [...emoji.trim()]
            .map(char => char.codePointAt(0).toString(16).toUpperCase())
            .filter(code => code !== 'FE0F')
            .join('-');
    }

    function getMatchRoundPairs(pairs, roundSize = 8) {
        const selectedPairs = [];
        const usedWords = new Set();
        const usedEmojis = new Set();
        const shuffledPairs = shuffleArray(pairs);

        for (const pair of shuffledPairs) {
            const wordKey = pair.word.trim().toLowerCase();
            const emojiKey = normalizeExactEmojiKey(pair.emoji);

            if (usedWords.has(wordKey) || usedEmojis.has(emojiKey)) {
                continue;
            }

            selectedPairs.push(pair);
            usedWords.add(wordKey);
            usedEmojis.add(emojiKey);

            if (selectedPairs.length >= roundSize) {
                break;
            }
        }

        return selectedPairs;
    }

    function startMatchGame(roundPairs) {
        console.log('Starting Emoji Match round:', roundPairs);

        const matchGameView = document.getElementById('match-game-view');
        if (!matchGameView) return;

        matchGameView.classList.remove('match-intro-view');
        matchGameView.classList.add('match-play-view');
        matchGameView.innerHTML = '';
        setReviewState('playing');

        const wordList = document.createElement('div');
        wordList.className = 'match-word-list';

        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'match-emoji-grid';

        let selectedWordButton = null;
        let selectedEmojiButton = null;
        let isCheckingMatch = false;
        let matchedPairCount = 0;

        function clearCurrentSelections() {
            if (selectedWordButton) selectedWordButton.classList.remove('match-selected');
            if (selectedEmojiButton) selectedEmojiButton.classList.remove('match-selected');

            selectedWordButton = null;
            selectedEmojiButton = null;
        }

        function buttonsMatch() {
            if (!selectedWordButton || !selectedEmojiButton) return false;

            return selectedWordButton.dataset.word === selectedEmojiButton.dataset.word &&
                selectedWordButton.dataset.emoji === selectedEmojiButton.dataset.emoji;
        }

        function getEmojiAnimationTarget(emojiButton) {
            if (!emojiButton) return null;
            return emojiButton.querySelector('.emoji img') || emojiButton.querySelector('.emoji');
        }

        function applyMatchAnimation(element, animationClass) {
            if (!element) return;

            element.classList.remove(animationClass);
            void element.offsetWidth;
            element.classList.add(animationClass);

            element.addEventListener('animationend', () => {
                element.classList.remove(animationClass);
            }, { once: true });
        }

        function checkCurrentSelection() {
            if (!selectedWordButton || !selectedEmojiButton || isCheckingMatch) return;

            isCheckingMatch = true;

            if (buttonsMatch()) {
                selectedWordButton.classList.remove('match-selected');
                selectedEmojiButton.classList.remove('match-selected');

                selectedWordButton.classList.add('match-correct');
                selectedEmojiButton.classList.add('match-correct');

                applyMatchAnimation(getEmojiAnimationTarget(selectedEmojiButton), 'rotate-shake');

                selectedWordButton.disabled = true;
                selectedEmojiButton.disabled = true;

                selectedWordButton = null;
                selectedEmojiButton = null;
                matchedPairCount += 1;
                isCheckingMatch = false;

                if (matchedPairCount >= roundPairs.length) {
                    setTimeout(() => {
                        showMatchReviewPage(roundPairs);
                    }, 400);
                }

                return;
            }

            selectedWordButton.classList.add('match-incorrect');
            selectedEmojiButton.classList.add('match-incorrect');

            applyMatchAnimation(getEmojiAnimationTarget(selectedEmojiButton), 'shake');

            setTimeout(() => {
                if (selectedWordButton) selectedWordButton.classList.remove('match-incorrect');
                if (selectedEmojiButton) selectedEmojiButton.classList.remove('match-incorrect');

                clearCurrentSelections();
                isCheckingMatch = false;
            }, 350);
        }

        // ---- INSERT OUTSIDE CLICK HANDLER FOR MATCH GAME ----

        if (activeMatchOutsideClickHandler) {
            document.removeEventListener('click', activeMatchOutsideClickHandler);
        }

        activeMatchOutsideClickHandler = event => {
            const clickedMatchButton = event.target.closest('.match-word-button, .match-emoji-button');

            if (clickedMatchButton || isCheckingMatch) return;

            clearCurrentSelections();
        };

        document.addEventListener('click', activeMatchOutsideClickHandler);

        // ---- END INSERT ----

        shuffleArray(roundPairs).forEach(pair => {
            const wordButton = document.createElement('button');
            wordButton.type = 'button';
            wordButton.className = 'match-word-button';
            wordButton.textContent = formatReviewWordForDisplay(pair.word);
            wordButton.dataset.word = pair.word;
            wordButton.dataset.emoji = pair.emoji;

            wordButton.addEventListener('click', () => {
                if (isCheckingMatch || wordButton.disabled) return;

                speakReviewText(pair.word);

                if (selectedWordButton === wordButton) {
                    selectedWordButton.classList.remove('match-selected');
                    selectedWordButton = null;
                    return;
                }

                if (selectedWordButton) {
                    selectedWordButton.classList.remove('match-selected');
                }

                selectedWordButton = wordButton;
                selectedWordButton.classList.add('match-selected');

                checkCurrentSelection();
            });

            wordList.appendChild(wordButton);
        });

        shuffleArray(roundPairs).forEach(pair => {
            const emojiButton = document.createElement('button');
            emojiButton.type = 'button';
            emojiButton.className = 'match-emoji-button';
            emojiButton.dataset.word = pair.word;
            emojiButton.dataset.emoji = pair.emoji;
            emojiButton.innerHTML = wrapEmoji(pair.emoji);

            emojiButton.addEventListener('click', () => {
                if (isCheckingMatch || emojiButton.disabled) return;

                if (selectedEmojiButton === emojiButton) {
                    selectedEmojiButton.classList.remove('match-selected');
                    selectedEmojiButton = null;
                    return;
                }

                if (selectedEmojiButton) {
                    selectedEmojiButton.classList.remove('match-selected');
                }

                selectedEmojiButton = emojiButton;
                selectedEmojiButton.classList.add('match-selected');

                checkCurrentSelection();
            });

            emojiGrid.appendChild(emojiButton);
        });

        matchGameView.appendChild(wordList);
        matchGameView.appendChild(emojiGrid);

        if (JSON.parse(localStorage.getItem('showSvg'))) {
            convertToSvg();
        }
    }

    function showMatchReviewPage(roundPairs) {
        const matchGameView = document.getElementById('match-game-view');
        const reviewPage = document.getElementById('reviewPage');
        const completionMessage = document.getElementById('completionMessage');
        const restartBtn = document.getElementById('restartBtn');
        const homeBtn = document.getElementById('homeBtn');
        const reviewEmoji = document.querySelector('.reviewemoji');

        if (activeMatchOutsideClickHandler) {
            document.removeEventListener('click', activeMatchOutsideClickHandler);
            activeMatchOutsideClickHandler = null;
        }

        setReviewState('complete');

        const commonData = JSON.parse(localStorage.getItem('commonData')) || {};
        if (completionMessage) {
            completionMessage.textContent = commonData.completionMessage?.[currentLanguage] || 'Great job!';
        }

        if (reviewEmoji) {
            reviewEmoji.textContent = '👍';
            if (JSON.parse(localStorage.getItem('showSvg'))) {
                reviewEmoji.innerHTML = '<img src="assets/svg/1F44D.svg" style="height: 1.5em;" alt="👍">';
            }
        }

        if (restartBtn) {
            restartBtn.onclick = () => {
                renderMatchGameIntro(currentMatchCategoryPairs.length ? currentMatchCategoryPairs : roundPairs);
            };
        }

        if (homeBtn) {
            homeBtn.onclick = () => {
                currentMatchCategoryPairs = [];
                showCategorySelectionView();
                window.history.pushState({}, '', `review.html?game=${encodeURIComponent(currentGameId)}`);
                currentCategoryFileName = null;
            };
        }

        if (jsConfetti) {
            jsConfetti.addConfetti({
                emojis: ['🎉', '😎', '🌟', '🥳', '🎈'],
                confettiRadius: 4,
                confettiNumber: 50,
            });
        }
    }

    function updatePageText(translation) {
        const selectedGame = translation.games?.find(game => game.id === currentGameId);

        if (gameModeHeader) {
            gameModeHeader.textContent = selectedGame?.text || translation.reviewGames || 'Review Games';
        }

        if (selectCategoryText) {
            selectCategoryText.textContent = translation.selectCategory;
        }
    }

    function updateLanguage(lang, translations) {
        const translation = translations[lang] || translations.en;
        currentReviewTranslation = translation;

        updatePageText(translation);

        if (currentCategoryFileName) {
            startReviewCategory(currentCategoryFileName, lang);
        } else {
            displayCategories(translation, lang);
        }

        currentLanguage = lang;
        localStorage.setItem('currentLanguage', lang);
        updateSelectedLanguageButton(lang);
        loadCommonTranslations(lang).then(() => {
            refreshAvailableVoices();
            setTTSLanguage(lang);
        });
    }

    function loadIndexTranslations() {
        return fetch('data/index.json')
            .then(response => response.json())
            .then(data => {
                loadedEmojis = data.emojis;

                const translations = data.translations;
                const defaultLang = data.defaultLang || 'en';
                const validLang = translations[currentLang] ? currentLang : defaultLang;

                const betaLanguages = ['de', 'is', 'th', 'ja', 'ko'];
                const normalLangs = [];
                const betaLangs = [];

                if (dropdownContent) {
                    dropdownContent.innerHTML = '';

                    for (const lang in translations) {
                        const button = document.createElement('button');
                        button.className = 'language-btn';
                        button.type = 'button';
                        button.textContent = translations[lang].name;
                        button.setAttribute('data-lang', lang);

                        button.addEventListener('click', event => {
                            event.preventDefault();
                            updateLanguage(lang, translations);

                            dropdownContent.classList.remove('show');
                            if (langButton) langButton.classList.remove('active');
                        });

                        if (betaLanguages.includes(lang)) {
                            betaLangs.push(button);
                        } else {
                            normalLangs.push(button);
                        }
                    }

                    normalLangs.forEach(btn => dropdownContent.appendChild(btn));

                    if (normalLangs.length && betaLangs.length) {
                        normalLangs[normalLangs.length - 1].style.borderBottom = 'none';
                    }

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
                }

                updateLanguage(validLang, translations);
                return translations;
            });
    }

    const addDropdownToggle = (button, dropdown, otherButton, otherDropdown, thirdButton, thirdDropdown) => {
        if (!button || !dropdown) return;

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = dropdown.classList.contains('show');

            if (otherDropdown?.classList.contains('show')) {
                otherDropdown.classList.remove('show');
                otherButton?.classList.remove('active');
            }

            if (thirdDropdown?.classList.contains('show')) {
                thirdDropdown.classList.remove('show');
                thirdButton?.classList.remove('active');
            }

            dropdown.classList.toggle('show', !isOpen);
            button.classList.toggle('active', !isOpen);
        });
    };

    addDropdownToggle(langButton, dropdownContent, settingsButton, settingsDropdown, soundButton, soundDropdown);
    addDropdownToggle(settingsButton, settingsDropdown, langButton, dropdownContent, soundButton, soundDropdown);
    addDropdownToggle(soundButton, soundDropdown, langButton, dropdownContent, settingsButton, settingsDropdown);

    window.addEventListener('click', event => {
        const clickedInsideLang = dropdownContent?.contains(event.target) || langButton?.contains(event.target);
        const clickedInsideSettings = settingsDropdown?.contains(event.target) || settingsButton?.contains(event.target);
        const clickedInsideSound = soundDropdown?.contains(event.target) || soundButton?.contains(event.target);

        if (!clickedInsideLang) {
            dropdownContent?.classList.remove('show');
            langButton?.classList.remove('active');
        }

        if (!clickedInsideSettings) {
            settingsDropdown?.classList.remove('show');
            settingsButton?.classList.remove('active');
        }

        if (!clickedInsideSound) {
            soundDropdown?.classList.remove('show');
            soundButton?.classList.remove('active');
        }
    });

    window.addEventListener('touchstart', event => {
        const clickedInsideLang = dropdownContent?.contains(event.target) || langButton?.contains(event.target);
        const clickedInsideSettings = settingsDropdown?.contains(event.target) || settingsButton?.contains(event.target);
        const clickedInsideSound = soundDropdown?.contains(event.target) || soundButton?.contains(event.target);

        if (!clickedInsideLang) {
            dropdownContent?.classList.remove('show');
            langButton?.classList.remove('active');
        }

        if (!clickedInsideSettings) {
            settingsDropdown?.classList.remove('show');
            settingsButton?.classList.remove('active');
        }

        if (!clickedInsideSound) {
            soundDropdown?.classList.remove('show');
            soundButton?.classList.remove('active');
        }
    });

    if (svgSwitch) {
        svgSwitch.addEventListener('change', () => {
            toggleSvg();
        });
    }

    if (volumeMinIcon && volumeSlider) {
        volumeMinIcon.addEventListener('click', () => {
            volumeSlider.value = 0;
            localStorage.setItem('ttsVolume', '0');
            updateSpeakerIcon(0);
        });
    }

    if (volumeMaxIcon && volumeSlider) {
        volumeMaxIcon.addEventListener('click', () => {
            volumeSlider.value = 1;
            localStorage.setItem('ttsVolume', '1');
            updateSpeakerIcon(1);
        });
    }

    if (volumeSlider) {
        const savedVolume = localStorage.getItem('ttsVolume');
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
        }

        volumeSlider.addEventListener('input', () => {
            localStorage.setItem('ttsVolume', volumeSlider.value);
            updateSpeakerIcon(parseFloat(volumeSlider.value));
        });

        updateSpeakerIcon(parseFloat(volumeSlider.value));
    }

    if (speedSlider) {
        const savedSpeed = localStorage.getItem('ttsSpeed') || '1.0';
        speedSlider.value = savedSpeed;

        speedSlider.addEventListener('input', () => {
            localStorage.setItem('ttsSpeed', speedSlider.value);
        });
    }

    function toggleSvg() {
        const showSvg = svgSwitch.checked;
        localStorage.setItem('showSvg', JSON.stringify(showSvg));

        if (specialEmojiSpan) {
            if (showSvg) {
                specialEmojiSpan.innerHTML = `<img src="${specialEmojiSVGUrl}" style="height: 1.2em;" alt="Special Emoji">`;
            } else {
                specialEmojiSpan.textContent = specialEmoji;
            }
        }

        if (showSvg) {
            convertToSvg();
        } else {
            revertToEmojis();
        }
    }

    const knownExceptions = new Set([
        '270D',
        '23F2',
        '2600',
        '26C8',
        '2744',
        '270F',
        '271D',
        '1F5FA',
        '1F3DE',
        '1F3DC',
        '1F3D4',
        '1F6CB',
        '1F6CF',
        '1F570',
        '1F58C',
        '1F58A',
        '1F327',
        '1F32A',
    ]);

    function convertToSvg() {
        document.querySelectorAll('.emoji').forEach(emojiSpan => {
            const emoji = emojiSpan.getAttribute('data-emoji') || emojiSpan.textContent;
            const emojiCode = [...emoji].map(e => {
                if (e.codePointAt) {
                    return e.codePointAt(0).toString(16).padStart(4, '0');
                } else {
                    return '';
                }
            }).join('-').toUpperCase();

            if (emojiCode) {
                let finalEmojiCode = emojiCode;

                if (emojiCode.includes('-FE0F')) {
                    const baseEmojiCode = emojiCode.replace('-FE0F', '');

                    if (emojiCode.length === 10 || knownExceptions.has(baseEmojiCode)) {
                        finalEmojiCode = baseEmojiCode;
                    }
                }

                const newUrl = `assets/svg/${finalEmojiCode}.svg`;
                emojiSpan.innerHTML = `<img src="${newUrl}" style="height: 1.2em;" alt="${emoji}">`;
            }
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

    function getTTSSpeed() {
        return speedSlider ? parseFloat(speedSlider.value) : parseFloat(localStorage.getItem('ttsSpeed') || '1.0');
    }

    function getTTSVolume() {
        return volumeSlider ? parseFloat(volumeSlider.value) : parseFloat(localStorage.getItem('ttsVolume') || '1');
    }

    function speakReviewText(text) {
        if (!text || !('speechSynthesis' in window)) return;

        if (!ttsEnabled || !currentVoice) {
            console.warn('TTS is disabled or no voice is selected for this language.');
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        utterance.rate = getTTSSpeed();
        utterance.volume = getTTSVolume();

        speechSynthesis.speak(utterance);
    }

    function initializeDefaultVoices() {
        if (!('speechSynthesis' in window)) return;

        const voices = speechSynthesis.getVoices();
        const defaultVoices = {};
        const languages = ['en', 'es', 'fr', 'de', 'is', 'zh-CN', 'zh-TW', 'th', 'ja', 'ko'];

        languages.forEach(language => {
            const availableVoice = voices.find(voice => voice.lang.startsWith(language));
            if (availableVoice) {
                defaultVoices[language] = availableVoice.name;
            }
        });

        localStorage.setItem('selectedVoices', JSON.stringify(defaultVoices));
    }

    function checkAndInitializeVoices() {
        if (!localStorage.getItem('selectedVoices')) {
            initializeDefaultVoices();
        }

        logAvailableVoices();
    }

    function initializeTTS() {
        if (!('speechSynthesis' in window)) {
            console.warn('TTS not supported in this browser.');
            return;
        }

        speechSynthesis.onvoiceschanged = () => {
            if (!voicesInitialized) {
                voicesInitialized = true;
                checkAndInitializeVoices();
                setTTSLanguage(currentLanguage);
            }
        };

        const voices = speechSynthesis.getVoices();
        if (voices.length) {
            voicesInitialized = true;
            checkAndInitializeVoices();
            setTTSLanguage(currentLanguage);
        }
    }

    function refreshAvailableVoices() {
        if (!('speechSynthesis' in window)) return;

        speechSynthesis.onvoiceschanged = () => {
            logAvailableVoices();
        };

        if (speechSynthesis.getVoices().length) {
            logAvailableVoices();
        }
    }

    function logAvailableVoices() {
        if (!('speechSynthesis' in window)) return;

        const voices = speechSynthesis.getVoices();
        const voiceOptionsContainer = document.getElementById('voiceOptions');
        if (!voiceOptionsContainer) return;

        voiceOptionsContainer.innerHTML = '';

        const storedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};
        const commonData = JSON.parse(localStorage.getItem('commonData')) || {};
        const languageSettings = commonData.settings || {};
        const storedVoiceName = storedVoices[currentLanguage];
        const languageVoices = voices.filter(voice => voice.lang.startsWith(currentLanguage));

        if (languageVoices.length > 0) {
            ttsEnabled = true;

            languageVoices.forEach(voice => {
                const button = document.createElement('button');
                button.className = 'voice-btn';
                button.type = 'button';
                button.textContent = voice.name;

                button.addEventListener('click', () => {
                    currentVoice = voice;

                    document.querySelectorAll('.voice-btn').forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');

                    storedVoices[currentLanguage] = voice.name;
                    localStorage.setItem('selectedVoices', JSON.stringify(storedVoices));

                    if (volumeSlider) {
                        volumeSlider.disabled = false;
                        volumeSlider.classList.remove('disabled-slider');
                    }

                    if (speedSlider) {
                        speedSlider.disabled = false;
                        speedSlider.classList.remove('disabled-slider');
                    }

                    ttsEnabled = true;
                    soundDropdown?.classList.remove('show');
                    soundButton?.classList.remove('active');
                });

                if (storedVoiceName === voice.name || (!storedVoiceName && !currentVoice)) {
                    button.classList.add('selected');
                    currentVoice = voice;
                }

                voiceOptionsContainer.appendChild(button);
            });

            if (volumeSlider) {
                volumeSlider.disabled = false;
                volumeSlider.classList.remove('disabled-slider');
            }

            if (speedSlider) {
                speedSlider.disabled = false;
                speedSlider.classList.remove('disabled-slider');
            }
        } else {
            ttsEnabled = false;

            const message = document.createElement('p');
            message.textContent = languageSettings.noVoicesAvailable?.[currentLanguage] || 'No voices available for this language';
            message.classList.add('unavailable-message');
            voiceOptionsContainer.appendChild(message);

            if (volumeSlider) {
                volumeSlider.disabled = true;
                volumeSlider.classList.add('disabled-slider');
            }

            if (speedSlider) {
                speedSlider.disabled = true;
                speedSlider.classList.add('disabled-slider');
            }
        }

        updateTTSUI();
        removeDuplicateButtons(voiceOptionsContainer);
    }

    function removeDuplicateButtons(container) {
        const buttons = container.querySelectorAll('.voice-btn');
        const seen = new Set();

        buttons.forEach(button => {
            const text = button.textContent;
            if (seen.has(text)) {
                button.remove();
            } else {
                seen.add(text);
            }
        });
    }

    function updateTTSUI() {
        const ttsControls = document.querySelectorAll('.tts-control');
        ttsControls.forEach(control => {
            control.classList.toggle('disabled', !ttsEnabled);
        });
    }

    function setTTSLanguage(lang) {
        if (!('speechSynthesis' in window)) {
            ttsEnabled = false;
            updateTTSUI();
            return;
        }

        const storedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};
        const storedVoiceName = storedVoices[lang];
        const voices = speechSynthesis.getVoices();

        currentVoice = voices.find(voice => voice.lang.startsWith(lang) && voice.name === storedVoiceName) ||
            voices.find(voice => voice.lang.startsWith(lang)) ||
            null;

        ttsEnabled = !!currentVoice;
        logAvailableVoices();
        updateTTSUI();
    }

    function updateSpeakerIcon(volume) {
        if (!volumeMinIcon) return;

        const numericVolume = parseFloat(volume);
        volumeMinIcon.classList.toggle('muted', numericVolume <= 0.01);
    }

    Promise.all([loadCommonTranslations(currentLang), loadIndexTranslations()])
        .then(() => {
            initializeTTS();
            body.classList.add('content-ready');
        })
        .catch(error => {
            console.error('Error loading review page:', error);
        });
});