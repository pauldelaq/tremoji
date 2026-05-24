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

    let sayWordRecognition = null;
    let sayWordIsRecording = false;
    let sayWordMicStream = null;
    let sayWordAudioContext = null;
    let sayWordAnalyser = null;
    let sayWordDataArray = null;
    let sayWordVolumeInterval = null;


    function ensureReviewLanguageStyles() {
        if (document.getElementById('review-language-styles')) return;

        const style = document.createElement('style');
        style.id = 'review-language-styles';
        style.textContent = `
            body.lang-th .category-text {
                font-size: 1.12em;
                line-height: 1.45;
            }
        `;
        document.head.appendChild(style);
    }

    function updateReviewLanguageClass(lang) {
        document.body.classList.remove(
            'lang-en',
            'lang-es',
            'lang-fr',
            'lang-de',
            'lang-is',
            'lang-zh-TW',
            'lang-zh-CN',
            'lang-th',
            'lang-ja',
            'lang-ko'
        );

        document.body.classList.add(`lang-${lang}`);
    }

    ensureReviewLanguageStyles();
    updateReviewLanguageClass(currentLanguage);

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

    function ensureCategoryHomeButton() {
        const existingButton = document.getElementById('category-home-button');
        if (existingButton) return;

        const anchorElement = categoryList?.parentElement || document.getElementById('review-app');
        if (!anchorElement) return;

        const categoryHomeButton = document.createElement('button');
        categoryHomeButton.id = 'category-home-button';
        categoryHomeButton.type = 'button';
        categoryHomeButton.className = 'match-intro-home-button category-home-button';
        categoryHomeButton.innerHTML = `
            <img src="assets/svg/1F3E0.svg" alt="Home" width="40" height="40">
        `;

        categoryHomeButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        anchorElement.insertBefore(categoryHomeButton, categoryList);
    }

    function displayCategories(translation, lang) {
        if (!categoryList) return;

        ensureCategoryHomeButton();
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
        const textSegments = text.split(/\s*\{\s*\}\s*/g);

        textSegments.forEach(segment => {
            pairRegex.lastIndex = 0;
            let match;

            while ((match = pairRegex.exec(segment)) !== null) {
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
        });

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
        const cleanWord = rawWord
            .replace(/\d+(?:_\d+)*/g, '')
            .replace(/\s+/g, ' ')
            .replace(/^[\s.,!?;:，。！？、；：]+|[\s.,!?;:，。！？、；：]+$/g, '')
            .trim();

        if (currentLanguage === 'ko') {
            return stripKoreanParticleForVocab(cleanWord);
        }

        return cleanWord;
    }

    function stripKoreanParticleForVocab(word) {
        if (!word || typeof word !== 'string') return word;

        const particles = [
            '에서는', '에게서', '으로는',
            '에서', '에게', '으로',
            '은', '는', '이', '가',
            '을', '를', '에', '로',
            '도', '만', '의', '와', '과'
        ];

        for (const particle of particles) {
            if (word.endsWith(particle) && word.length > particle.length + 1) {
                return word.slice(0, -particle.length);
            }
        }

        return word;
    }

    function formatReviewWordForDisplay(word) {
        if (['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)) {
            return word.replace(/\s+/g, '');
        }
        return word;
    }

    function normalizeSayWordMatchText(text) {
        const normalizedText = String(text || '').trim();

        if (['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)) {
            return normalizedText.replace(/\s+/g, '');
        }

        return normalizedText.toLocaleLowerCase();
    }

    function transcriptMatchesSayWordPair(transcript, pair) {
        if (!transcript || !pair?.word) return false;

        const normalizedTranscript = normalizeSayWordMatchText(transcript);
        const normalizedWord = normalizeSayWordMatchText(formatReviewWordForDisplay(pair.word));

        if (!normalizedTranscript || !normalizedWord) return false;

        return normalizedTranscript.includes(normalizedWord);
    }

    function getSpeechRecognitionLang(lang) {
        const speechRecognitionLangs = {
            en: 'en-US',
            es: 'es-ES',
            fr: 'fr-FR',
            de: 'de-DE',
            is: 'is-IS',
            'zh-TW': 'zh-TW',
            'zh-CN': 'zh-CN',
            ja: 'ja-JP',
            th: 'th-TH',
            ko: 'ko-KR'
        };

        return speechRecognitionLangs[lang] || 'en-US';
    }

    function getCommonTranslation(key, fallback = '') {
        const commonData = JSON.parse(localStorage.getItem('commonData')) || {};
        return commonData.settings?.[key]?.[currentLanguage]
            || commonData.settings?.[key]?.en
            || fallback;
    }

    function wrapReviewSentencePlainTextWords(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const skipSelector = '.emoji, .guess-word-blank, .guess-word-answer, .word';
        const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT);

        const textNodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim()) continue;
            if (node.parentElement?.closest(skipSelector)) continue;
            textNodes.push(node);
        }

        textNodes.forEach(node => {
            const frag = document.createDocumentFragment();

            node.textContent.split(/(\s+)/g).forEach(part => {
                if (!part) return;

                if (/^\s+$/.test(part)) {
                    frag.appendChild(document.createTextNode(part));
                    return;
                }

                const span = document.createElement('span');
                span.className = 'word say-word-clickable-word';
                span.textContent = part;
                frag.appendChild(span);
            });

            node.replaceWith(frag);
        });

        return temp.innerHTML;
    }

    function attachSayWordSentenceWordTTS(sentenceBubble, transcriptBubble) {
    sentenceBubble.querySelectorAll('.word').forEach(wordElement => {
        wordElement.classList.add('say-word-clickable-word');

        wordElement.addEventListener('click', event => {
            event.stopPropagation();

            if (sayWordIsRecording) return;

            if (!ttsEnabled || !currentVoice) {
                transcriptBubble.textContent = getCommonTranslation(
                    'noVoicesAvailable',
                    'No voices available for this language'
                );
                return;
            }

            const wordText = wordElement.textContent.trim();
            if (!wordText) return;

            sentenceBubble.querySelectorAll('.word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });

            wordElement.classList.add('highlight');

            speakReviewText(wordText);
        });
    });
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
                } else if (currentGameId === 'guess-word') {
                    renderGuessWordGameIntro(pairs);
                } else if (currentGameId === 'say-word') {
                    renderSayWordGameIntro(pairs);
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

        window.scrollTo({
            top: 0,
            behavior: 'instant'
        });
    }

    function setActiveReviewGame(gameId) {
        const reviewApp = document.getElementById('review-app');
        if (!reviewApp) return;

        reviewApp.classList.remove(
            'review-game-match',
            'review-game-guess-word',
            'review-game-say-word'
        );

        if (gameId === 'guess-word') {
            reviewApp.classList.add('review-game-guess-word');
        } else if (gameId === 'say-word') {
            reviewApp.classList.add('review-game-say-word');
        } else {
            reviewApp.classList.add('review-game-match');
        }
    }

    function showGameplayView(gameId) {
        const categoryHomeButton = document.getElementById('category-home-button');
        if (categoryHomeButton) categoryHomeButton.remove();

        setActiveReviewGame(gameId);
        setReviewState('intro');
    }

    function showCategorySelectionView() {
        if (currentReviewTranslation) {
            displayCategories(currentReviewTranslation, currentLanguage);
        } else {
            ensureCategoryHomeButton();
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
            <img src="assets/svg/E24D.svg" alt="Home" width="40" height="40">
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
                speakReviewText(formatReviewWordForDisplay(pair.word));
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

    function renderGuessWordGameIntro(pairs) {
        const guessWordGameView = document.getElementById('guess-word-game-view');
        if (!guessWordGameView) return;

        currentMatchCategoryPairs = pairs;

        guessWordGameView.classList.remove('match-play-view');
        guessWordGameView.classList.add('match-intro-view');
        guessWordGameView.innerHTML = '';
        setReviewState('intro');

        const gameHeaderDiv = document.createElement('div');
        gameHeaderDiv.className = 'boxed';

        const guessWordHeader = document.createElement('h2');
        guessWordHeader.className = 'mode-header';
        const currentGame = currentReviewTranslation?.games?.find(
            game => game.id === currentGameId
        );
        guessWordHeader.textContent = currentGame?.text || 'Guess the Word';

        const lessonWordsHeader = document.createElement('h2');
        lessonWordsHeader.textContent = currentReviewTranslation?.vocabularyList || 'Lesson Words';

        gameHeaderDiv.appendChild(guessWordHeader);
        gameHeaderDiv.appendChild(lessonWordsHeader);

        const introHomeButton = document.createElement('button');
        introHomeButton.type = 'button';
        introHomeButton.className = 'match-intro-home-button';
        introHomeButton.innerHTML = `
            <img src="assets/svg/E24D.svg" alt="Home" width="40" height="40">
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
                speakReviewText(formatReviewWordForDisplay(pair.word));
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
            startGuessWordGame(roundPairs);
        });

        guessWordGameView.appendChild(gameHeaderDiv);
        guessWordGameView.appendChild(introHomeButton);
        guessWordGameView.appendChild(vocabList);
        guessWordGameView.appendChild(startButton);

        if (JSON.parse(localStorage.getItem('showSvg'))) {
            convertToSvg();
        }
    }

    function renderSayWordGameIntro(pairs) {
        const sayWordGameView = document.getElementById('say-word-game-view');
        if (!sayWordGameView) return;

        currentMatchCategoryPairs = pairs;

        sayWordGameView.classList.remove('match-play-view');
        sayWordGameView.classList.add('match-intro-view');
        sayWordGameView.innerHTML = '';
        setReviewState('intro');

        const gameHeaderDiv = document.createElement('div');
        gameHeaderDiv.className = 'boxed';

        const sayWordHeader = document.createElement('h2');
        sayWordHeader.className = 'mode-header';
        const currentGame = currentReviewTranslation?.games?.find(
            game => game.id === currentGameId
        );
        sayWordHeader.textContent = currentGame?.text || 'Say the Word';

        const lessonWordsHeader = document.createElement('h2');
        lessonWordsHeader.textContent = currentReviewTranslation?.vocabularyList || 'Lesson Words';

        gameHeaderDiv.appendChild(sayWordHeader);
        gameHeaderDiv.appendChild(lessonWordsHeader);

        const introHomeButton = document.createElement('button');
        introHomeButton.type = 'button';
        introHomeButton.className = 'match-intro-home-button';
        introHomeButton.innerHTML = `
            <img src="assets/svg/E24D.svg" alt="Home" width="40" height="40">
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
                speakReviewText(formatReviewWordForDisplay(pair.word));
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
            startSayWordGame(roundPairs);
        });

        sayWordGameView.appendChild(gameHeaderDiv);
        sayWordGameView.appendChild(introHomeButton);
        sayWordGameView.appendChild(vocabList);
        sayWordGameView.appendChild(startButton);

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

    function ensureMatchPairColorStyles() {
        if (document.getElementById('match-pair-color-styles')) return;

        const style = document.createElement('style');
        style.id = 'match-pair-color-styles';
        style.textContent = `
            .match-word-button,
            .match-emoji-button {
                position: relative;
            }

            .match-pair-badge {
                position: absolute;
                bottom: 5%;
                left: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.95);
                color: #4CAF50;
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                z-index: 2;
                }
        `;
        document.head.appendChild(style);
    }

    function getMatchPairKey(pair) {
        return `${pair.word}|||${normalizeExactEmojiKey(pair.emoji)}`;
    }

    function startMatchGame(roundPairs) {
        console.log('Starting Emoji Match round:', roundPairs);

        ensureMatchPairColorStyles();


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
        let nextMatchBadgeNumber = 1;

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

                const matchPairNumber = nextMatchBadgeNumber;
                nextMatchBadgeNumber += 1;

                selectedWordButton.classList.add('match-correct');
                selectedEmojiButton.classList.add('match-correct');

                if (matchPairNumber) {
                    const wordBadge = document.createElement('div');
                    wordBadge.className = 'match-pair-badge';
                    wordBadge.textContent = matchPairNumber;

                    const emojiBadge = document.createElement('div');
                    emojiBadge.className = 'match-pair-badge';
                    emojiBadge.textContent = matchPairNumber;

                    selectedWordButton.appendChild(wordBadge);
                    selectedEmojiButton.appendChild(emojiBadge);
                }

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
            // wordButton.dataset.matchPairNumber = pairNumberMap.get(getMatchPairKey(pair)) || '';

            wordButton.addEventListener('click', () => {
                if (isCheckingMatch || wordButton.disabled) return;

                speakReviewText(formatReviewWordForDisplay(pair.word));

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
            // emojiButton.dataset.matchPairNumber = pairNumberMap.get(getMatchPairKey(pair)) || '';
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

    // --- BEGIN: Guess the Word helpers ---
    function escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function createProtectedBracePlaceholder(index) {
        let n = index;
        let letters = '';

        do {
            letters = String.fromCharCode(65 + (n % 26)) + letters;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);

        return `__BRACE_CONTENT_${letters}__`;
    }

    function cleanReviewMarkupText(text) {
        if (!text || typeof text !== 'string') return '';

        const protectedBraceContent = [];

        let cleanedText = text
            .replace(/\s*\{\s*\}\s*/g, ' ')
            .replace(/\{([^{}]+)\}/g, (match, braceContent) => {
                const placeholder = createProtectedBracePlaceholder(protectedBraceContent.length);
                protectedBraceContent.push({ placeholder, braceContent: braceContent.trim() });
                return placeholder;
            })
            .replace(/\d+(?:_\d+)*/g, '');

        protectedBraceContent.forEach(({ placeholder, braceContent }) => {
            cleanedText = cleanedText.replace(
                new RegExp(escapeRegExp(placeholder), 'g'),
                braceContent
            );
        });

        return cleanedText
            .replace(/\s+/g, ' ')
            .trim();
    }

    function removeRenderedSpacesForAsianLanguages(html) {
        if (!['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)) {
            return html;
        }

        return html
            .split(/(<[^>]+>|&nbsp;)/g)
            .map(part => {
                if (!part || part.startsWith('<') || part === '&nbsp;') {
                    return part;
                }

                return part.replace(/\s+/g, '');
            })
            .join('');
    }

    function createGuessBlankHtml() {
        return `<span class="guess-word-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
    }

    function getSentenceSplitAbbreviations() {
        const abbreviationsByLanguage = {
            en: ['Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Dr.', 'Prof.', 'St.', 'Sr.', 'Jr.'],
            es: ['Sr.', 'Sra.', 'Srta.', 'Dr.', 'Dra.', 'Prof.', 'Profa.'],
            fr: ['M.', 'Mme.', 'Mlle.', 'Dr.', 'Dre.', 'Pr.', 'Prof.'],
            de: ['Hr.', 'Fr.', 'Dr.', 'Prof.', 'bzw.', 'z.B.'],
            is: ['Dr.', 'Próf.', 'Hr.', 'Frú.']
        };

        return abbreviationsByLanguage[currentLanguage] || [];
    }

    function protectSentenceSplitAbbreviations(text) {
        const protectedAbbreviations = [];
        let protectedText = text;

        getSentenceSplitAbbreviations().forEach((abbreviation, index) => {
            const placeholder = `__ABBR_${index}__`;
            const abbreviationRegex = new RegExp(escapeRegExp(abbreviation), 'g');

            if (abbreviationRegex.test(protectedText)) {
                protectedText = protectedText.replace(abbreviationRegex, placeholder);
                protectedAbbreviations.push({ placeholder, abbreviation });
            }
        });

        return { protectedText, protectedAbbreviations };
    }

    function restoreSentenceSplitAbbreviations(text, protectedAbbreviations) {
        return protectedAbbreviations.reduce((restoredText, item) => {
            return restoredText.replace(new RegExp(escapeRegExp(item.placeholder), 'g'), item.abbreviation);
        }, text);
    }

    function splitReviewTextIntoSentenceSegments(text) {
        if (!text || typeof text !== 'string') return [];

        if (currentLanguage === 'th') {
            return text
                .split(/\s{2,}/g)
                .map(segment => segment.trim())
                .filter(Boolean);
        }

        const { protectedText, protectedAbbreviations } = protectSentenceSplitAbbreviations(text);
        const segments = [];
        const sentenceRegex = /[\s\S]*?[.!?。！？](?:\s*<span\s+class=['"]emoji['"]>[\s\S]*?<\/span>)*/g;
        let match;
        let lastIndex = 0;

        while ((match = sentenceRegex.exec(protectedText)) !== null) {
            const segment = restoreSentenceSplitAbbreviations(match[0].trim(), protectedAbbreviations);
            if (segment) segments.push(segment);
            lastIndex = sentenceRegex.lastIndex;
        }

        const remainder = restoreSentenceSplitAbbreviations(protectedText.slice(lastIndex).trim(), protectedAbbreviations);
        if (remainder) segments.push(remainder);

        return segments.length ? segments : [text];
    }

    function segmentContainsGuessWord(segment, pair) {
        const displayTargetWord = formatReviewWordForDisplay(pair.word || '');
        if (!displayTargetWord) return false;

        // Find all consecutive [UL]...[ENDUL] groups (possibly multi-word targets)
        const taggedGroups = segment.match(/((?:\[UL\][^\[\]]*?\[ENDUL\]\s*)+)/g) || [];

        const segmentTaggedTargets = taggedGroups.map(rawTaggedGroup => {
            return formatReviewWordForDisplay(
                extractCleanWordsFromTaggedGroup(rawTaggedGroup).join(' ')
            );
        });

        if (segmentTaggedTargets.includes(displayTargetWord)) return true;

        // Fallback to single tagged words (legacy)
        const taggedWords = extractCleanWordsFromTaggedGroup(segment).map(word => {
            return formatReviewWordForDisplay(word);
        });

        if (taggedWords.includes(displayTargetWord)) return true;

        // Remove tags, compare as plain text
        const cleanSegmentText = cleanReviewMarkupText(segment)
            .replace(/\[UL\]|\[ENDUL\]/g, '');

        const comparableSegmentText = ['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)
            ? cleanSegmentText.replace(/\s+/g, '')
            : cleanSegmentText;

        return comparableSegmentText.includes(displayTargetWord);
    }

    function getGuessWordSourceSegment(pair) {
        if (!pair?.sourceText) return '';

        const segments = splitReviewTextIntoSentenceSegments(pair.sourceText);
        const targetSegment = segments.find(segment => segmentContainsGuessWord(segment, pair));

        return targetSegment || pair.sourceText;
    }

    function renderGuessWordSentence(pair, showAnswer = false, wrapClickableWords = false) {
        if (!pair?.sourceText) return '';

        const targetWord = pair.word || '';
        const displayTargetWord = formatReviewWordForDisplay(targetWord);
        let targetWasBlanked = false;

        let html = cleanReviewMarkupText(getGuessWordSourceSegment(pair));

        html = html.replace(/((?:\[UL\][^\[\]]*?\[ENDUL\]\s*)+)/g, (match, rawTaggedGroup) => {
            const cleanGroupWords = extractCleanWordsFromTaggedGroup(rawTaggedGroup);
            const displayGroup = formatReviewWordForDisplay(cleanGroupWords.join(' '));

            if (!targetWasBlanked && displayGroup === displayTargetWord) {
                targetWasBlanked = true;
                return showAnswer
                    ? `<span class="word guess-word-answer" style="color: springgreen;">${displayGroup}</span>`
                    : createGuessBlankHtml();
            }

            return rawTaggedGroup.replace(/\[UL\]([\s\S]*?)\[ENDUL\]/g, (singleMatch, rawTaggedWord) => {
                const cleanWord = cleanTaggedWord(rawTaggedWord);
                const displayWord = formatReviewWordForDisplay(cleanWord);
                return `<span class="word" style="color: springgreen;">${displayWord}</span>`;
            });
        });

        if (!targetWasBlanked && displayTargetWord) {
            const targetRegex = new RegExp(escapeRegExp(displayTargetWord), 'u');
            html = html.replace(targetRegex, showAnswer
                ? `<span class="word guess-word-answer" style="color: springgreen;">${displayTargetWord}</span>`
                : createGuessBlankHtml()
            );
        }

        if (wrapClickableWords) {
            html = wrapReviewSentencePlainTextWords(html);
        }

        return removeRenderedSpacesForAsianLanguages(html);
    }

    // --- DEV PREVIEW: Guess the Word render preview helper ---
    function previewGuessWordRenderedMessages(pairs = currentMatchCategoryPairs) {
        const existingPreview = document.getElementById('guess-word-render-preview');
        if (existingPreview) existingPreview.remove();

        if (!Array.isArray(pairs) || pairs.length === 0) {
            console.warn('No Guess the Word pairs available to preview. Open a category first.');
            return;
        }

        const previewPanel = document.createElement('div');
        previewPanel.id = 'guess-word-render-preview';
        previewPanel.style.cssText = `
            position: relative;
            width: min(900px, 94vw);
            margin: 24px auto;
            padding: 16px;
            border: 3px solid #4CAF50;
            border-radius: 12px;
            background: #111;
            color: white;
            z-index: 9999;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
        `;

        const title = document.createElement('h2');
        title.textContent = `Guess Word Render Preview (${pairs.length})`;
        title.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
            padding: 8px 12px;
            border: none;
            border-radius: 8px;
            background: #F44336;
            color: white;
            font-weight: bold;
            cursor: pointer;
        `;
        closeButton.addEventListener('click', () => previewPanel.remove());

        header.appendChild(title);
        header.appendChild(closeButton);
        previewPanel.appendChild(header);

        pairs.forEach((pair, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                margin: 14px 0;
                padding: 12px;
                border: 1px solid rgba(255,255,255,0.35);
                border-radius: 10px;
                background: rgba(255,255,255,0.08);
            `;

            item.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">
                    ${index + 1}. ${formatReviewWordForDisplay(pair.word)} ${wrapEmoji(pair.emoji)}
                </div>
                <div class="guess-word-sentence-bubble" style="margin-bottom: 10px;">
                    ${renderGuessWordSentence(pair, false)}
                </div>
                <div class="guess-word-sentence-bubble">
                    ${renderGuessWordSentence(pair, true)}
                </div>
            `;

            previewPanel.appendChild(item);
        });

        document.body.appendChild(previewPanel);

        if (JSON.parse(localStorage.getItem('showSvg'))) {
            convertToSvg();
        }

        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.previewGuessWordRenderedMessages = previewGuessWordRenderedMessages;

    function getGuessWordTTSText(pair) {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = renderGuessWordSentence(pair, true);

        tempElement.querySelectorAll('.emoji').forEach(emojiElement => {
            emojiElement.remove();
        });

        let text = tempElement.textContent || '';

        if (currentLanguage === 'th') {
            text = text
                .replace(/ {2,}/g, '␣')
                .replace(/ +/g, '')
                .replace(/␣/g, ' ')
                .replace(/ๆ /g, 'ๆ. ');
        }

        return text.replace(/\s+/g, ' ').trim();
    }
    // --- END: Guess the Word helpers ---

    function applySayWordRecordingVisual(active) {
    const button = document.querySelector('.say-word-microphone-button');
    if (!button) return;

    const img = button.querySelector('img');

    button.classList.toggle('recording', active);

    if (img) {
        img.src = active
            ? 'assets/svg/23FA.svg'
            : 'assets/svg/1F3A4.svg';
    }

    if (!active) {
        button.style.boxShadow = 'none';
    }
}

function animateSayWordMicGlow(volume) {
    const button = document.querySelector('.say-word-microphone-button');
    if (!button) return;

    const clamped = Math.min(volume, 50);
    const glowSize = 5 + clamped * 0.3;
    button.style.boxShadow = `0 0 ${glowSize}px red`;
}

function startSayWordVolumeMonitoring(stream) {
    if (!stream) return;

    if (!sayWordAudioContext) {
        sayWordAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (sayWordVolumeInterval) {
        clearInterval(sayWordVolumeInterval);
    }

    const micSource = sayWordAudioContext.createMediaStreamSource(stream);
    sayWordAnalyser = sayWordAudioContext.createAnalyser();
    sayWordAnalyser.fftSize = 256;
    micSource.connect(sayWordAnalyser);

    sayWordDataArray = new Uint8Array(sayWordAnalyser.fftSize);

    sayWordVolumeInterval = setInterval(() => {
        if (!sayWordIsRecording || !sayWordAnalyser || !sayWordDataArray) return;

        sayWordAnalyser.getByteTimeDomainData(sayWordDataArray);

        const volume = sayWordDataArray.reduce((max, value) => {
            return Math.max(max, Math.abs(value - 128));
        }, 0);

        animateSayWordMicGlow(volume);
    }, 100);
}

function stopSayWordRecording(resetVisual = true) {
    sayWordIsRecording = false;

    if (sayWordRecognition) {
        try {
            sayWordRecognition.stop();
        } catch (_) {}
        sayWordRecognition = null;
    }

    if (sayWordVolumeInterval) {
        clearInterval(sayWordVolumeInterval);
        sayWordVolumeInterval = null;
    }

    if (sayWordMicStream) {
        sayWordMicStream.getTracks().forEach(track => track.stop());
        sayWordMicStream = null;
    }

    if (resetVisual) {

        applySayWordRecordingVisual(false);

    }
}

    function startSayWordGame(roundPairs) {
        const sayWordGameView = document.getElementById('say-word-game-view');
        if (!sayWordGameView) return;

        sayWordGameView.classList.remove('match-intro-view');
        sayWordGameView.classList.add('match-play-view');
        sayWordGameView.innerHTML = '';
        setReviewState('playing');

        let currentQuestionIndex = 0;

        const gameContainer = document.createElement('div');
        gameContainer.className = 'guess-word-game-container say-word-game-container';

        const sentenceBubble = document.createElement('div');
        sentenceBubble.className = 'guess-word-sentence-bubble say-word-message-bubble';

        const microphoneContainer = document.createElement('div');
        microphoneContainer.className = 'say-word-microphone-container';

        const microphoneButton = document.createElement('button');
        microphoneButton.type = 'button';
        microphoneButton.className = 'say-word-microphone-button';
        microphoneButton.innerHTML = `
            <img src="assets/svg/1F3A4.svg" alt="Microphone" class="say-word-microphone-icon">
        `;

        microphoneContainer.appendChild(microphoneButton);

        const hintBubble = document.createElement('div');
        hintBubble.className = 'say-word-hint-bubble guess-word-sentence-bubble';
        hintBubble.setAttribute('role', 'button');
        hintBubble.setAttribute('tabindex', '0');
        hintBubble.setAttribute('aria-pressed', 'false');

        const transcriptBubble = document.createElement('div');
        transcriptBubble.className = 'say-word-transcript-bubble guess-word-sentence-bubble';
        transcriptBubble.textContent = '';

        gameContainer.appendChild(sentenceBubble);
        gameContainer.appendChild(microphoneContainer);
        gameContainer.appendChild(hintBubble);
        gameContainer.appendChild(transcriptBubble);

        sayWordGameView.appendChild(gameContainer);

        function clearSayWordSentenceHighlights() {
            sentenceBubble.querySelectorAll('.word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });

            hintBubble.querySelectorAll('.word.highlight, .say-word-hint-word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });
        }

        const clearSayWordHighlightOnOutsideClick = event => {
            if (sentenceBubble.contains(event.target) || hintBubble.contains(event.target)) return;
            clearSayWordSentenceHighlights();
        };

        document.addEventListener('click', clearSayWordHighlightOnOutsideClick);

        function revealSayWordHint() {
            hintBubble.classList.add('revealed');
            hintBubble.setAttribute('aria-pressed', 'true');
            hintBubble.style.filter = 'none';
            hintBubble.style.opacity = '1';

            const hintWord = hintBubble.querySelector('.say-word-hint-word');
            if (hintWord) {
                hintWord.style.filter = 'none';
                hintWord.style.opacity = '1';
            }
        }

        function renderCurrentQuestion() {
            const currentPair = roundPairs[currentQuestionIndex];

            if (!currentPair) {
                document.removeEventListener('click', clearSayWordHighlightOnOutsideClick);
                showMatchReviewPage(roundPairs);
                return;
            }

            stopSayWordRecording();
            transcriptBubble.textContent = '';
            clearSayWordSentenceHighlights();

            sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, false, true);
            attachSayWordSentenceWordTTS(sentenceBubble, transcriptBubble);

            hintBubble.classList.remove('revealed');
            hintBubble.setAttribute('aria-pressed', 'false');
            hintBubble.style.filter = '';
            hintBubble.style.opacity = '';
            hintBubble.innerHTML = `
                <span class="word say-word-hint-word">
                    ${formatReviewWordForDisplay(currentPair.word)}
                </span>
            `;

            const hintWord = hintBubble.querySelector('.say-word-hint-word');
            if (hintWord) {
                hintWord.style.filter = '';
                hintWord.style.opacity = '';
            }

            function handleSayWordHintClick() {
                if (!hintBubble.classList.contains('revealed')) {
                    revealSayWordHint();
                    return;
                }

                if (sayWordIsRecording) return;

                if (!ttsEnabled || !currentVoice) {
                    transcriptBubble.textContent = getCommonTranslation(
                        'noVoicesAvailable',
                        'No voices available for this language'
                    );
                    return;
                }

                clearSayWordSentenceHighlights();

                const hintWord = hintBubble.querySelector('.say-word-hint-word');
                if (hintWord) {
                    hintWord.classList.add('highlight');
                }

                speakReviewText(formatReviewWordForDisplay(currentPair.word));
            }

            hintBubble.onclick = handleSayWordHintClick;

            hintBubble.onkeydown = event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                handleSayWordHintClick();
            };

            microphoneButton.onclick = () => {
                toggleSayWordRecording(
                    transcriptBubble,
                    currentPair,
                    microphoneButton,
                    revealSayWordHint,
                    () => {
                        currentQuestionIndex += 1;
                        renderCurrentQuestion();
                    }
                );
            };

            if (JSON.parse(localStorage.getItem('showSvg'))) {
                convertToSvg();
            }
        }

        renderCurrentQuestion();
    }

    async function startSayWordRecording(transcriptBubble, currentPair, microphoneButton, revealHint, onSuccess) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            transcriptBubble.textContent = getCommonTranslation(
                'speechRecognitionUnavailable',
                'Speech recognition is not available'
            );
            return;
        }

        try {
            sayWordMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            console.error('Mic error:', error);
            transcriptBubble.textContent = getCommonTranslation(
                'turnOnMicrophone',
                'Please turn on or plug in your microphone'
            );
            return;
        }

        sayWordIsRecording = true;
        applySayWordRecordingVisual(true);
        startSayWordVolumeMonitoring(sayWordMicStream);

        sayWordRecognition = new SpeechRecognition();
        sayWordRecognition.lang = getSpeechRecognitionLang(currentLanguage);
        sayWordRecognition.interimResults = true;
        sayWordRecognition.continuous = true;

        let finalTranscript = '';
        let sayWordMatched = false;
        let sayWordMatchDelayTimer = null;
        const sayWordMatchDelayMs = 900;

        function scheduleSayWordMatchCheck(transcript) {
            if (sayWordMatched) return;

            if (sayWordMatchDelayTimer) {
                clearTimeout(sayWordMatchDelayTimer);
            }

            sayWordMatchDelayTimer = setTimeout(() => {
                if (sayWordMatched) return;

                if (transcriptMatchesSayWordPair(transcriptBubble.textContent || transcript, currentPair)) {
                    completeSayWordMatch();
                }
            }, sayWordMatchDelayMs);
        }

        function completeSayWordMatch() {
            if (sayWordMatched) return;
            sayWordMatched = true;

            if (sayWordMatchDelayTimer) {
                clearTimeout(sayWordMatchDelayTimer);
                sayWordMatchDelayTimer = null;
            }
            stopSayWordRecording(false);

            if (microphoneButton) {
                microphoneButton.classList.remove('recording');
                microphoneButton.style.boxShadow = 'none';
            }

            if (typeof revealHint === 'function') {
                revealHint();
            }

            if (microphoneButton) {
                const microphoneImg = microphoneButton.querySelector('img');
                if (microphoneImg) {
                    microphoneImg.classList.add('icon-switching');

                    setTimeout(() => {
                        microphoneImg.src = 'assets/svg/1F44D.svg';

                        microphoneImg.classList.remove('icon-switching');
                        microphoneImg.classList.add('icon-switched-in');

                        void microphoneImg.offsetWidth;

                        microphoneImg.classList.add('rotate-shake');

                        microphoneImg.addEventListener('animationend', () => {
                            microphoneImg.classList.remove('rotate-shake');
                            microphoneImg.classList.remove('icon-switched-in');
                        }, { once: true });

                    }, 180);
                }
            }

            function finishSayWordSuccess() {
                if (microphoneButton) {
                    const microphoneImg = microphoneButton.querySelector('img');
                    if (microphoneImg) {
                        microphoneImg.src = 'assets/svg/1F3A4.svg';
                    }
                }

                if (typeof onSuccess === 'function') {
                    onSuccess();
                }
            }

            if (!ttsEnabled || !currentVoice) {

                setTimeout(() => {
                    finishSayWordSuccess();
                }, 2000);

                return;
            }

            speakReviewText(getGuessWordTTSText(currentPair), finishSayWordSuccess);
        }

        sayWordRecognition.onstart = () => {
            transcriptBubble.textContent = getCommonTranslation('listening', 'Listening...');
        };

        sayWordRecognition.onresult = event => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += ` ${text}`;
                    finalTranscript = finalTranscript.trim();
                } else {
                    interimTranscript += text;
                }
            }

            const combinedTranscript = `${finalTranscript} ${interimTranscript}`.trim();
            transcriptBubble.textContent = combinedTranscript;

            if (transcriptMatchesSayWordPair(combinedTranscript, currentPair)) {
                scheduleSayWordMatchCheck(combinedTranscript);
            }
        };

        sayWordRecognition.onend = () => {
            if (sayWordIsRecording && sayWordRecognition) {
                try {
                    sayWordRecognition.start();
                } catch (_) {
                    stopSayWordRecording();
                }
            }
        };

        sayWordRecognition.onerror = event => {
            console.warn('Say Word recognition error:', event.error);
        };

        sayWordRecognition.onnomatch = () => {
            if (sayWordMatchDelayTimer) {
                clearTimeout(sayWordMatchDelayTimer);
                sayWordMatchDelayTimer = null;
            }
        };

        sayWordRecognition.start();
    }

    function toggleSayWordRecording(transcriptBubble, currentPair, microphoneButton, revealHint, onSuccess) {
        if (sayWordIsRecording) {
            stopSayWordRecording();
            transcriptBubble.textContent = '';
            return;
        }

        transcriptBubble.textContent = '';
        startSayWordRecording(transcriptBubble, currentPair, microphoneButton, revealHint, onSuccess);
    }

    function startGuessWordGame(roundPairs) {
        const guessWordGameView = document.getElementById('guess-word-game-view');
        if (!guessWordGameView) return;

        guessWordGameView.classList.remove('match-intro-view');
        guessWordGameView.classList.add('match-play-view');
        guessWordGameView.innerHTML = '';
        setReviewState('playing');

        let currentQuestionIndex = 0;
        let isCheckingAnswer = false;
        const shuffledAnswerPairs = shuffleArray(roundPairs);

        const gameContainer = document.createElement('div');
        gameContainer.className = 'guess-word-game-container';

        const sentenceBubble = document.createElement('div');
        sentenceBubble.className = 'guess-word-sentence-bubble';

        const feedback = document.createElement('div');
        feedback.className = 'guess-word-feedback';

        const answerButtonGrid = document.createElement('div');
        answerButtonGrid.className = 'guess-word-answer-grid match-word-list';

        gameContainer.appendChild(sentenceBubble);
        gameContainer.appendChild(feedback);
        gameContainer.appendChild(answerButtonGrid);
        guessWordGameView.appendChild(gameContainer);

        function renderQuestion() {
            const currentPair = roundPairs[currentQuestionIndex];
            if (!currentPair) {
                showMatchReviewPage(roundPairs);
                return;
            }

            isCheckingAnswer = false;
            feedback.textContent = '';
            feedback.className = 'guess-word-feedback';
            sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, false);
            answerButtonGrid.innerHTML = '';

            shuffledAnswerPairs.forEach(pair => {
                const answerButton = document.createElement('button');
                answerButton.type = 'button';
                answerButton.className = 'match-word-button guess-word-answer-button';
                answerButton.textContent = formatReviewWordForDisplay(pair.word);
                answerButton.dataset.word = pair.word;

                answerButton.addEventListener('click', () => {
                    if (isCheckingAnswer || answerButton.disabled) return;

                    const isCorrect = pair.word === currentPair.word && pair.emoji === currentPair.emoji;

                    if (!isCorrect) {
                        feedback.innerHTML = wrapEmoji('👎');
                        feedback.className = 'guess-word-feedback';

                        if (JSON.parse(localStorage.getItem('showSvg'))) {
                            convertToSvg();
                        }

                        answerButton.classList.add('match-incorrect');

                        setTimeout(() => {
                            const feedbackEmoji = feedback.querySelector('.emoji, .emoji img');

                            if (feedbackEmoji) {
                                feedbackEmoji.style.animation =
                                    'guess-feedback-pop-out 0.28s ease forwards';
                            }

                            setTimeout(() => {
                                answerButton.classList.remove('match-incorrect');
                                feedback.textContent = '';
                            }, 260);

                        }, 850);
                        return;
                    }

                    isCheckingAnswer = true;
                    answerButton.classList.add('match-correct');
                    sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, true);

                    if (JSON.parse(localStorage.getItem('showSvg'))) {
                        convertToSvg();
                    }

                    feedback.innerHTML = wrapEmoji('👍');
                    feedback.classList.add('guess-word-feedback-correct');

                    if (JSON.parse(localStorage.getItem('showSvg'))) {
                        convertToSvg();
                    }

                    speakReviewText(getGuessWordTTSText(currentPair), () => {
                        setTimeout(() => {
                            const feedbackEmoji = feedback.querySelector('.emoji, .emoji img');

                            if (feedbackEmoji) {
                                feedbackEmoji.style.animation =
                                    'guess-feedback-pop-out 0.28s ease forwards';
                            }

                            setTimeout(() => {
                                currentQuestionIndex += 1;
                                renderQuestion();
                            }, 260);
                        }, 450);
                    });
                });

                answerButtonGrid.appendChild(answerButton);
            });

            if (JSON.parse(localStorage.getItem('showSvg'))) {
                convertToSvg();
            }
        }

        renderQuestion();
    }

    function clearMatchCompletionView() {
        const matchGameView = document.getElementById('match-game-view');
        const guessWordGameView = document.getElementById('guess-word-game-view');
        const sayWordGameView = document.getElementById('say-word-game-view');
        const reviewPage = document.getElementById('reviewPage');
        const existingSummary = document.getElementById('match-completion-summary');

        if (existingSummary) existingSummary.remove();
        if (matchGameView) matchGameView.innerHTML = '';
        if (guessWordGameView) guessWordGameView.innerHTML = '';
        if (sayWordGameView) sayWordGameView.innerHTML = '';
        if (reviewPage) reviewPage.style.display = 'none';
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

        const existingSummary = document.getElementById('match-completion-summary');
        if (existingSummary) existingSummary.remove();

        const reviewContainer = reviewPage?.querySelector('.review-container');
        if (reviewPage && reviewContainer) {
            const summaryList = document.createElement('div');
            summaryList.id = 'match-completion-summary';
            summaryList.className = 'match-vocab-list match-completion-summary';

            const summaryHeader = document.createElement('div');
            summaryHeader.className = 'match-vocab-category-row';
            summaryHeader.innerHTML = `
                <div class="match-category-title">
                    ${currentReviewTranslation?.vocabularyList || 'Lesson Words'}
                </div>
            `;
            summaryList.appendChild(summaryHeader);

            roundPairs.forEach(pair => {
                const row = document.createElement('div');
                row.className = 'match-vocab-row';

                row.innerHTML = `
                    <div class="match-vocab-emoji">${wrapEmoji(pair.emoji)}</div>
                    <div class="match-vocab-word">${formatReviewWordForDisplay(pair.word)}</div>
                `;

                row.addEventListener('click', () => {
                    speakReviewText(formatReviewWordForDisplay(pair.word));
                });

                summaryList.appendChild(row);
            });

            reviewContainer.insertAdjacentElement('afterend', summaryList);

            if (JSON.parse(localStorage.getItem('showSvg'))) {
                convertToSvg();
            }
        }

        if (restartBtn) {
            restartBtn.onclick = () => {
                clearMatchCompletionView();

                const introPairs = currentMatchCategoryPairs.length
                    ? currentMatchCategoryPairs
                    : roundPairs;

                if (currentGameId === 'guess-word') {
                    renderGuessWordGameIntro(introPairs);
                } else if (currentGameId === 'say-word') {
                    renderSayWordGameIntro(introPairs);
                } else {
                    renderMatchGameIntro(introPairs);
                }
            };
        }

        if (homeBtn) {
            homeBtn.onclick = () => {
                clearMatchCompletionView();
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
        updateReviewLanguageClass(lang);
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

    function speakReviewText(text, onEnd = null) {
        const finish = () => {
            if (typeof onEnd === 'function') onEnd();
        };

        if (!text || !('speechSynthesis' in window)) {
            finish();
            return;
        }

        if (!ttsEnabled || !currentVoice) {
            console.warn('TTS is disabled or no voice is selected for this language.');
            finish();
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        utterance.rate = getTTSSpeed();
        utterance.volume = getTTSVolume();

        utterance.onend = finish;
        utterance.onerror = finish;

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