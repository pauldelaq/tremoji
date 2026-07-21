let loadedEmojis = {};
let ttsEnabled = false;
let currentVoice = null;
let voicesInitialized = false;
let currentLanguage;
let activeMatchOutsideClickHandler = null;
let jsConfetti = null;
let commonData = null;
let lockedContentMessage = '';
let lockedContentButtonText = '';
const FREE_WEB_CATEGORY_LIMIT = 10;

const FREE_WEB_SKIT_CATEGORIES = new Set([
    'Emotions',
    'Jobs',
    'Sports',
    'Actions',
    'People',
    'Animals',
    'Plants',
    'Food',
    'Geography',
    'Countries'
]);

function isNativeApp() {
    return Boolean(
        window.Capacitor &&
        typeof window.Capacitor.isNativePlatform === 'function' &&
        window.Capacitor.isNativePlatform()
    );
}

function canAccessSkitCategory(category) {
    return isNativeApp() || FREE_WEB_SKIT_CATEGORIES.has(category);
}

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

function showLockedCategoryMessage() {
    const sourceModal = document.getElementById('confirmationModal');
    if (!sourceModal) return;

    let lockedModal = document.getElementById('lockedContentModal');

    if (!lockedModal) {
        lockedModal = sourceModal.cloneNode(true);
        lockedModal.id = 'lockedContentModal';

        const modalText = lockedModal.querySelector('#modalText');
        const confirmButton = lockedModal.querySelector('#confirmReset');
        const cancelButton = lockedModal.querySelector('#cancelReset');

        if (modalText) {
            modalText.id = 'lockedContentModalText';
        }

        if (confirmButton) {
            confirmButton.remove();
        }

        if (cancelButton) {
            cancelButton.id = 'closeLockedContentModal';

            cancelButton.addEventListener('click', () => {
                lockedModal.style.display = 'none';
            });
        }

        lockedModal.addEventListener('click', event => {
            if (event.target === lockedModal) {
                lockedModal.style.display = 'none';
            }
        });

        document.body.appendChild(lockedModal);
    }

    const modalText =
        lockedModal.querySelector('#lockedContentModalText');

    const closeButton =
        lockedModal.querySelector('#closeLockedContentModal');

    if (modalText) {
        modalText.textContent = lockedContentMessage;
    }

    if (closeButton) {
        closeButton.textContent = lockedContentButtonText;
    }

    lockedModal.style.display = 'flex';
}

function getReviewResultHtml(status, labels = {}) {
    const normalizedStatus = status === 'known' ? 'correct'
        : status === 'unknown' ? 'incorrect'
        : status;

    if (normalizedStatus === 'correct') {
        return `<div class="flashcards-review-result" aria-label="${labels.correct || 'Correct'}"><span style="color: #4CAF50; background-color: white; height: 26px; width: 26px;">✓</span></div>`;
    }

    if (normalizedStatus === 'incorrect') {
        return `<div class="flashcards-review-result" aria-label="${labels.incorrect || 'Incorrect'}"><span style="color: rgb(244, 67, 54); background-color: white; height: 26px; width: 26px;">✗</span></div>`;
    }

    return `<div class="flashcards-review-result" aria-hidden="true"></div>`;
}

    window.testNativeSpeech = async function () {
        const NativeSpeechRecognition =
        window.Capacitor?.Plugins?.SpeechRecognition;

        if (!NativeSpeechRecognition) {
            console.error('Native SpeechRecognition plugin is unavailable.');
            return;
        }

        try {
            const permissions =
                await NativeSpeechRecognition.requestPermissions();

            console.log('Speech permissions:', permissions);

            await NativeSpeechRecognition.addListener(
                'partialResults',
                event => {
                    console.log('Native transcript:', event.matches);
                }
            );

            await NativeSpeechRecognition.start({
                language: 'en-US',
                partialResults: true,
                maxResults: 3
            });

            console.log('Native speech recognition started.');
        } catch (error) {
            console.error('Native speech test failed:', error);
        }
    };

document.addEventListener('DOMContentLoaded', async () => {
    await initializeStorage();

    currentLanguage = settings.currentLanguage;

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
    const showSentenceSwitch = document.getElementById('showSentenceSwitch');

    const autoSwitch = document.getElementById('autoSwitch');
    const autoLabel = document.getElementById('autoLabel');

    const cardsForReviewSetting = document.getElementById('cardsForReviewLabel')?.closest('.setting-item')
        || document.querySelector('.setting-item.difficulty-setting');

    const showSentenceSetting = document.getElementById('showSentenceLabel')?.closest('.setting-item')
        || document.getElementById('showSentenceSwitch')?.closest('.setting-item');

    const cardsForReviewInputs = cardsForReviewSetting
        ? [...cardsForReviewSetting.querySelectorAll('input[type="radio"]')]
        : [];

    const soundButton = document.getElementById('soundToggleBtn');
    const soundDropdown = document.getElementById('soundDropdown');
    const volumeSlider = document.getElementById('volumeLevelSlider');
    const speedSlider = document.getElementById('TTSSpeedSlider');
    const volumeMinIcon = document.getElementById('volumeMinIcon');
    const volumeMaxIcon = document.getElementById('volumeMaxIcon');

    const params = new URLSearchParams(window.location.search);
    const currentGameId = params.get('game') || 'match';
    let currentCategoryFileName = params.get('category');

    if (
        currentCategoryFileName &&
        !canAccessSkitCategory(currentCategoryFileName)
    ) {
        window.location.replace('index.html');
        return;
    }

    let currentReviewTranslation = null;
    let currentMatchCategoryPairs = [];

    let sayWordRecognition = null;
    let sayWordIsRecording = false;
    let sayWordMicStream = null;
    let sayWordAudioContext = null;
    let sayWordAnalyser = null;
    let sayWordDataArray = null;
    let sayWordVolumeInterval = null;
    let setSayWordSideButtonsDisabled = () => {};

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

    function isSettingsDivider(element) {
        if (!element) return false;

        return element.tagName === 'HR'
            || element.classList.contains('setting-divider')
            || element.classList.contains('settings-divider')
            || element.classList.contains('divider');
    }

    function setSettingItemVisibility(settingItem, shouldShow) {
        if (!settingItem) return;

        settingItem.hidden = !shouldShow;
        settingItem.style.display = shouldShow ? '' : 'none';

        const nearbyDividers = [
            settingItem.previousElementSibling,
            settingItem.nextElementSibling
        ];

        nearbyDividers.forEach(divider => {
            if (isSettingsDivider(divider)) {
                divider.style.display = shouldShow ? '' : 'none';
            }
        });
    }

    const autoSettingItem = autoSwitch?.closest('.setting-item');
    setSettingItemVisibility(autoSettingItem, currentGameId === 'say-word');
    setSettingItemVisibility(cardsForReviewSetting, currentGameId === 'flashcards');
    setSettingItemVisibility(showSentenceSetting, currentGameId === 'flashcards');

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

    const currentLang = settings.currentLanguage;
    const showSvg = settings.showSvg;
    const showFlashcardSentenceEnabled = settings.flashcardsShowSentence;
    const autoAdvanceEnabled = settings.sayWordAutoAdvance;
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

    if (autoSwitch) {
        autoSwitch.checked = autoAdvanceEnabled;

        autoSwitch.addEventListener('change', async () => {
            settings.sayWordAutoAdvance = autoSwitch.checked;
            await saveSettings();
        });
    }

    if (showSentenceSwitch) {
        showSentenceSwitch.checked = showFlashcardSentenceEnabled;

        showSentenceSwitch.addEventListener('change', async () => {
            settings.flashcardsShowSentence = showSentenceSwitch.checked;
            await saveSettings();
        });
    }

    function getFlashcardsShowSentenceEnabled() {
        return showSentenceSwitch?.checked ?? settings.flashcardsShowSentence;
    }

    function getCardsForReviewMode() {
        const checkedCardsForReviewInput = cardsForReviewInputs.find(input => input.checked);
        return checkedCardsForReviewInput?.value || settings.flashcardsCardsForReview;
    }

    function setCardsForReviewInputsDisabled(isDisabled) {
        cardsForReviewInputs.forEach(input => {
            input.disabled = isDisabled;
        });
    }

    if (cardsForReviewInputs.length) {
        const savedCardsForReviewMode = settings.flashcardsCardsForReview;
        const savedCardsForReviewInput = cardsForReviewInputs.find(input => input.value === savedCardsForReviewMode);

        if (savedCardsForReviewInput) {
            savedCardsForReviewInput.checked = true;
        }

        cardsForReviewInputs.forEach(input => {
            input.addEventListener('change', async () => {
                if (input.checked) {
                    settings.flashcardsCardsForReview = input.value;
                    await saveSettings();
                }
            });
        });
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
                lockedContentMessage =
                    commonTranslations.modal?.lockedContentMessage?.[validLang]
                    || commonTranslations.modal?.lockedContentMessage?.en
                    || 'You can explore this content in the full iOS version of Tr.emoji.';

                lockedContentButtonText =
                    commonTranslations.modal?.lockedContentButton?.[validLang]
                    || commonTranslations.modal?.lockedContentButton?.en
                    || 'Got it';
                const settingsLabels = commonTranslations.settings;

                if (showSvgLabel) showSvgLabel.textContent = settingsLabels.showSvg[validLang];
                if (autoLabel) autoLabel.textContent = settingsLabels.autoAdvance?.[validLang] || settingsLabels.autoAdvance?.en || 'Auto-advance';

                const showSentenceLabel = document.getElementById('showSentenceLabel');
                const cardsForReviewLabel = document.getElementById('cardsForReviewLabel');
                const someOption = document.getElementById('someOption');
                const allOption = document.getElementById('allOption');

                if (showSentenceLabel) {
                    showSentenceLabel.textContent = settingsLabels.showSentence?.[validLang]
                        || settingsLabels.showSentence?.en
                        || 'Show Sentence';
                }

                if (cardsForReviewLabel) {
                    cardsForReviewLabel.textContent = settingsLabels.cardsForReview?.[validLang]
                        || settingsLabels.cardsForReview?.en
                        || 'Cards for Review';
                }

                if (someOption) {
                    someOption.textContent = settingsLabels.cardsForReviewOptions?.some?.[validLang]
                        || settingsLabels.cardsForReviewOptions?.some?.en
                        || 'Some Cards';
                }

                if (allOption) {
                    allOption.textContent = settingsLabels.cardsForReviewOptions?.all?.[validLang]
                        || settingsLabels.cardsForReviewOptions?.all?.en
                        || 'All Cards';
                }

                const volumeLevelLabel = document.getElementById('volumeLevelLabel');
                const ttsSpeedLabel = document.getElementById('TTSSpeedLabel');
                const settingCategoryHeaders = document.querySelectorAll('.setting-category p');

                if (volumeLevelLabel) volumeLevelLabel.textContent = settingsLabels.volume?.[validLang] || 'Volume';
                if (ttsSpeedLabel) ttsSpeedLabel.textContent = settingsLabels.ttsSpeed?.[validLang] || 'TTS Speed';
                if (settingCategoryHeaders[0]) settingCategoryHeaders[0].textContent = settingsLabels.ttsSettings?.[validLang] || 'TTS Settings';
                if (settingCategoryHeaders[1]) settingCategoryHeaders[1].textContent = settingsLabels.ttsVoices?.[validLang] || 'TTS Voices';

                commonData = commonTranslations;
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

        translation.categories.forEach((category, index) => {
            const isLocked =
                !isNativeApp() &&
                index >= FREE_WEB_CATEGORY_LIMIT;
            const emojiArray = loadedEmojis[category.id] || [];
            const categoryFileName = categoryFileNames[category.id];

            const li = document.createElement('li');

            li.className =
                `category-item${isLocked ? ' locked-category' : ''}`;

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
                if (isLocked) {
                    showLockedCategoryMessage();
                    return;
                }

                startReviewCategory(categoryFileName, lang);
            });

            categoryList.appendChild(li);
        });

        if (settings.showSvg) {
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
        let normalizedText = String(text || '').trim();

        normalizedText = normalizedText
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase();

        if (['zh-TW', 'zh-CN', 'ja', 'th'].includes(currentLanguage)) {
            return normalizedText.replace(/\s+/g, '');
        }

        return normalizedText
            .replace(/[’']/g, '')
            .replace(/[^\p{L}\p{N}]+/gu, '');
    }

    function transcriptMatchesSayWordPair(transcript, pair) {
        if (!transcript || !pair?.word) return false;

        const normalizedTranscript = normalizeSayWordMatchText(transcript);
        const normalizedWord = normalizeSayWordMatchText(formatReviewWordForDisplay(pair.word));

        if (!normalizedTranscript || !normalizedWord) return false;

        return normalizedTranscript.includes(normalizedWord);
    }

    function updateSayWordVisibleTranscript(transcriptBubble, transcript) {
        if (!transcriptBubble) return;

        const cleanedTranscript = String(transcript || '').replace(/\s+/g, ' ').trim();
        transcriptBubble.textContent = cleanedTranscript;
    }

    function isSayWordTranscriptTooFull(transcriptBubble) {
        if (!transcriptBubble) return false;
        return transcriptBubble.scrollHeight > transcriptBubble.clientHeight + 1;
    }

    function shouldUseNativeSpeechRecognition() {
        return Boolean(
            window.Capacitor?.isNativePlatform?.()
            && window.Capacitor?.Plugins?.SpeechRecognition
        );
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

    async function startNativeSayWordRecognition() {
        const NativeSpeechRecognition =
            window.Capacitor?.Plugins?.SpeechRecognition;

        if (!NativeSpeechRecognition) {
            throw new Error('Native SpeechRecognition plugin is unavailable.');
        }

        await NativeSpeechRecognition.start({
            language: getSpeechRecognitionLang(currentLanguage),
            partialResults: true,
            maxResults: 3
        });
    }

    async function stopNativeSayWordRecognition() {
        const NativeSpeechRecognition =
            window.Capacitor?.Plugins?.SpeechRecognition;

        if (!NativeSpeechRecognition) return;

        try {
            await NativeSpeechRecognition.stop();
        } catch (error) {
            console.error('Could not stop native speech recognition:', error);
        }
    }

    let sayWordNativePartialResultsListener = null;
    let sayWordNativeReadyListener = null;

    async function setNativeSayWordTranscriptHandler(onTranscript) {
        const NativeSpeechRecognition =
            window.Capacitor?.Plugins?.SpeechRecognition;

        if (!NativeSpeechRecognition) {
            throw new Error('Native SpeechRecognition plugin is unavailable.');
        }

        if (sayWordNativePartialResultsListener) {
            await sayWordNativePartialResultsListener.remove();
            sayWordNativePartialResultsListener = null;
        }

        sayWordNativePartialResultsListener =
            await NativeSpeechRecognition.addListener(
                'partialResults',
                event => {
                    const transcript = event.matches?.[0] || '';

                    if (transcript) {
                        onTranscript(transcript);
                    }
                }
            );
    }

    async function setNativeSayWordReadyHandler(onReady) {
        const NativeSpeechRecognition =
            window.Capacitor?.Plugins?.SpeechRecognition;

        if (!NativeSpeechRecognition) {
            throw new Error(
                'Native SpeechRecognition plugin is unavailable.'
            );
        }

        if (sayWordNativeReadyListener) {
            await sayWordNativeReadyListener.remove();
            sayWordNativeReadyListener = null;
        }

        sayWordNativeReadyListener =
            await NativeSpeechRecognition.addListener(
                'readyForNextSession',
                onReady
            );
    }

    async function clearNativeSayWordTranscriptHandler() {
        if (sayWordNativePartialResultsListener) {
            try {
                await sayWordNativePartialResultsListener.remove();
            } catch (error) {
                console.error(
                    'Could not remove native speech listener:',
                    error
                );
            } finally {
                sayWordNativePartialResultsListener = null;
            }
        }

        if (sayWordNativeReadyListener) {
            try {
                await sayWordNativeReadyListener.remove();
            } catch (error) {
                console.error(
                    'Could not remove native ready listener:',
                    error
                );
            } finally {
                sayWordNativeReadyListener = null;
            }
        }
    }

    function getCommonTranslation(key, fallback = '') {
        return commonData?.settings?.[key]?.[currentLanguage]
            || commonData?.settings?.[key]?.en
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

                const trimmedPart = part.trim();

                if (!/[\p{L}\p{N}]/u.test(trimmedPart)) {
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
                } else if (currentGameId === 'flashcards') {
                    renderFlashcardsGameIntro(pairs);
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
            'review-game-say-word',
            'review-game-flashcards'
        );

        if (gameId === 'guess-word') {
            reviewApp.classList.add('review-game-guess-word');
        } else if (gameId === 'say-word') {
            reviewApp.classList.add('review-game-say-word');
        } else if (gameId === 'flashcards') {
            reviewApp.classList.add('review-game-flashcards');
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

        if (settings.showSvg) {
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

        if (settings.showSvg) {
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

        if (settings.showSvg) {
            convertToSvg();
        }
    }

    function renderFlashcardsGameIntro(pairs) {
        const flashcardsGameView = document.getElementById('flashcards-game-view');
        if (!flashcardsGameView) return;

        currentMatchCategoryPairs = pairs;

        flashcardsGameView.classList.remove('match-play-view');
        flashcardsGameView.classList.add('match-intro-view');
        flashcardsGameView.innerHTML = '';
        setReviewState('intro');
        setCardsForReviewInputsDisabled(false);

        const gameHeaderDiv = document.createElement('div');
        gameHeaderDiv.className = 'boxed';

        const flashcardsHeader = document.createElement('h2');
        flashcardsHeader.className = 'mode-header';
        const currentGame = currentReviewTranslation?.games?.find(
            game => game.id === currentGameId
        );
        flashcardsHeader.textContent = currentGame?.text || 'Flashcards';

        const lessonWordsHeader = document.createElement('h2');
        lessonWordsHeader.textContent = currentReviewTranslation?.vocabularyList || 'Lesson Words';

        gameHeaderDiv.appendChild(flashcardsHeader);
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
            const cardsForReviewMode = getCardsForReviewMode();
            const roundPairs = cardsForReviewMode === 'all'
                ? shuffleArray(pairs)
                : getMatchRoundPairs(pairs, 8);

            startFlashcardsGame(roundPairs);
        });

        flashcardsGameView.appendChild(gameHeaderDiv);
        flashcardsGameView.appendChild(introHomeButton);
        flashcardsGameView.appendChild(vocabList);
        flashcardsGameView.appendChild(startButton);

        if (settings.showSvg) {
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

    function removeCurrentFlashcardEmojiFromSentence(html, pair) {
        if (!pair?.emoji) return html;

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const targetEmojiKey = normalizeExactEmojiKey(pair.emoji);

        temp.querySelectorAll('.emoji').forEach(emojiElement => {
            if (normalizeExactEmojiKey(emojiElement.textContent) === targetEmojiKey) {
                emojiElement.remove();
            }
        });

        return temp.innerHTML;
    }

    function startFlashcardsGame(roundPairs) {
        const flashcardsGameView = document.getElementById('flashcards-game-view');
        if (!flashcardsGameView) return;

        flashcardsGameView.classList.remove('match-intro-view');
        flashcardsGameView.classList.add('match-play-view');
        flashcardsGameView.innerHTML = '';
        setReviewState('playing');
        setCardsForReviewInputsDisabled(true);

        let currentCardIndex = 0;
        let cardIsRevealed = false;
        let knownCount = 0;
        let unknownCount = 0;
        let cardIsFlipping = false;
        const assessedCards = new Map();

        const currentCategory = currentReviewTranslation?.categories?.find(category => {
            return categoryFileNames[category.id] === currentCategoryFileName;
        });
        const flashcardCategoryName = currentCategory?.text || currentCategoryFileName || '';

        const gameContainer = document.createElement('div');
        gameContainer.className = 'flashcards-game-container';

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'flashcards-card';

        function clearFlashcardHighlights() {
            card.querySelectorAll('.word.highlight, .say-word-hint-word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });
        }

        const clearFlashcardHighlightOnOutsideClick = event => {
            const clickedHighlightableWord = event.target.closest(
                '.say-word-clickable-word, .say-word-hint-word, .word'
            );

            if (clickedHighlightableWord && card.contains(clickedHighlightableWord)) {
                return;
            }

            clearFlashcardHighlights();
        };

        document.addEventListener('click', clearFlashcardHighlightOnOutsideClick);

        const flashcardsFooter = document.createElement('footer');
        flashcardsFooter.className = 'flashcards-footer';

        const previousButton = document.createElement('button');
        previousButton.type = 'button';
        previousButton.className = 'nav-btn flashcards-nav-button flashcards-nav-button-left';
        previousButton.setAttribute('aria-label', 'Previous card');
        previousButton.textContent = '←';

        const flashcardsIndicator = document.createElement('span');
        flashcardsIndicator.id = 'flashcardsIndicator';

        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'nav-btn flashcards-nav-button flashcards-nav-button-right';
        nextButton.setAttribute('aria-label', 'Next card');
        nextButton.textContent = '→';

        flashcardsFooter.appendChild(previousButton);
        flashcardsFooter.appendChild(flashcardsIndicator);
        flashcardsFooter.appendChild(nextButton);

        function getCurrentCardPair() {
            return roundPairs[currentCardIndex];
        }

        function revealFlashcardWithFlip() {
            if (cardIsRevealed || cardIsFlipping) return;

            cardIsFlipping = true;
            card.classList.add('flipping-out');

            setTimeout(() => {
                cardIsRevealed = true;
                renderFlashcard();

                card.classList.remove('flipping-out');
                card.classList.add('flipping-in');

                setTimeout(() => {
                    card.classList.remove('flipping-in');
                    cardIsFlipping = false;
                }, 180);
            }, 180);
        }

        function updateFlashcardsIndicator() {
            const checkmark = '<span style="color: #4CAF50;">✓</span>';
            const cross = '<span style="color: rgb(244, 67, 54);">✗</span>';
            const isCurrentCardAssessed = assessedCards.has(currentCardIndex);

            flashcardsIndicator.innerHTML = `
                ${flashcardCategoryName} ${currentCardIndex + 1}/${roundPairs.length}
                <label>
                    <input type="checkbox" id="answeredCheckbox" ${isCurrentCardAssessed ? 'checked' : ''} disabled>
                    <span class="custom-checkbox"></span>
                </label>
                <br>
                ${checkmark} ${knownCount}, ${cross} ${unknownCount}
            `;
        }

        function recordFlashcardAssessment(status) {
            const previousStatus = assessedCards.get(currentCardIndex);

            if (previousStatus === 'known') knownCount -= 1;
            if (previousStatus === 'unknown') unknownCount -= 1;

            assessedCards.set(currentCardIndex, status);

            if (status === 'known') knownCount += 1;
            if (status === 'unknown') unknownCount += 1;

            updateFlashcardsIndicator();
        }

        function allFlashcardsAssessed() {
            return assessedCards.size >= roundPairs.length;
        }

        function getIncorrectFlashcardPairs() {
            return roundPairs.filter((pair, index) => {
                return assessedCards.get(index) === 'unknown';
            });
        }

        function ensureFlashcardsResultsDisplay() {
            const reviewPage = document.getElementById('reviewPage');
            if (!reviewPage) return null;

            return reviewPage.querySelector('.results');
        }

        function updateFlashcardsCompletionScore() {
            const resultsDisplay = ensureFlashcardsResultsDisplay();
            if (!resultsDisplay) return;

            const correctCountElement = resultsDisplay.querySelector('#correctCount');
            const incorrectCountElement = resultsDisplay.querySelector('#incorrectCount');
            const totalCountElements = resultsDisplay.querySelectorAll('#totalCount, .totalCount');

            if (correctCountElement) correctCountElement.textContent = knownCount;
            if (incorrectCountElement) incorrectCountElement.textContent = unknownCount;
            totalCountElements.forEach(totalCountElement => {
                totalCountElement.textContent = roundPairs.length;
            });
        }

        function setupFlashcardsIncorrectReplayButton() {
            const restartIncorrectButton = document.getElementById('restartIncorrectBtn');
            if (!restartIncorrectButton) return;

            const incorrectPairs = getIncorrectFlashcardPairs();

            restartIncorrectButton.style.display = incorrectPairs.length ? 'block' : 'none';

            const freshRestartIncorrectButton = restartIncorrectButton.cloneNode(true);
            restartIncorrectButton.replaceWith(freshRestartIncorrectButton);

            freshRestartIncorrectButton.style.display = incorrectPairs.length ? 'block' : 'none';

            freshRestartIncorrectButton.addEventListener('click', () => {
                if (!incorrectPairs.length) return;

                const reviewPage = document.getElementById('reviewPage');
                if (reviewPage) {
                    reviewPage.style.display = 'none';
                }

                startFlashcardsGame(incorrectPairs);
            });
        }

        function showFlashcardsCompletionPage() {
            document.removeEventListener('click', clearFlashcardHighlightOnOutsideClick);
            window.flashcardsAssessmentResults = new Map(assessedCards);
            showMatchReviewPage(roundPairs);
            updateFlashcardsCompletionScore();
            setupFlashcardsIncorrectReplayButton();
        }

        function navigateFlashcard(direction) {
            const nextIndex = currentCardIndex + direction;

            if (nextIndex < 0) return;

            if (nextIndex >= roundPairs.length) {
                if (allFlashcardsAssessed()) {
                    showFlashcardsCompletionPage();
                }
                return;
            }

            currentCardIndex = nextIndex;
            cardIsRevealed = false;
            cardIsFlipping = false;
            card.classList.remove('flipping-out', 'flipping-in');
            card.style.transition = '';
            card.style.transform = '';
            renderFlashcard();
        }

        function canNavigateFlashcard(direction) {
            const nextIndex = currentCardIndex + direction;

            if (nextIndex < 0) return false;
            if (nextIndex >= roundPairs.length) return allFlashcardsAssessed();

            return true;
        }

        function animateFlashcardNavigation(direction) {
            if (!canNavigateFlashcard(direction)) {
                const revealedRotation = cardIsRevealed ? ' rotateY(180deg)' : '';
                card.style.transition = 'transform 0.3s ease';
                card.style.transform = `translateX(0)${revealedRotation}`;
                return;
            }

            const exitTranslate = direction > 0
                ? 'translateX(-100vw)'
                : 'translateX(100vw)';
            const revealedRotation = cardIsRevealed ? ' rotateY(180deg)' : '';
            const exitTransform = `${exitTranslate}${revealedRotation}`;

            card.style.transition = 'transform 0.3s ease';
            card.style.transform = exitTransform;

            setTimeout(() => {
                navigateFlashcard(direction);
            }, 300);
        }

        function renderFlashcard() {
            const currentPair = getCurrentCardPair();

            if (!currentPair) {
                document.removeEventListener('click', clearFlashcardHighlightOnOutsideClick);
                showMatchReviewPage(roundPairs);
                return;
            }

            card.classList.toggle('revealed', cardIsRevealed);

            if (!cardIsRevealed) {
                const showSentence = getFlashcardsShowSentenceEnabled();
                const frontSentence = removeCurrentFlashcardEmojiFromSentence(
                    renderGuessWordSentence(currentPair, false, false),
                    currentPair
                );
                const frontSentenceHtml = showSentence
                    ? `<div class="flashcards-card-front-sentence">${frontSentence}</div>`
                    : '';

                card.innerHTML = `
                    <div class="flashcards-card-front-emoji">
                        ${wrapEmoji(currentPair.emoji)}
                    </div>
                    ${frontSentenceHtml}
                `;
            } else {
                card.innerHTML = `
                    <div class="flashcards-card-top">
                        <div class="flashcards-card-back-emoji">
                            ${wrapEmoji(currentPair.emoji)}
                        </div>

                        <div class="flashcards-card-word">
                            ${formatReviewWordForDisplay(currentPair.word)}
                        </div>
                    </div>

                    <div class="flashcards-card-sentence">
                        ${removeCurrentFlashcardEmojiFromSentence(
                            renderGuessWordSentence(currentPair, true, true),
                            currentPair
                        )}
                    </div>

                    <div class="flashcards-action-row">
                        <button type="button" class="flashcards-assessment-button flashcards-known-button" aria-label="I knew this card">
                            ✓
                        </button>

                        <button type="button" class="flashcards-tts-button" aria-label="Play sentence">
                            <img src="assets/svg/1F4E2.svg" alt="" class="flashcards-tts-icon">
                        </button>

                        <button type="button" class="flashcards-assessment-button flashcards-unknown-button" aria-label="I did not know this card">
                            ✗
                        </button>
                    </div>
                `;

                const ttsButton = card.querySelector('.flashcards-tts-button');
                if (ttsButton) {
                    ttsButton.addEventListener('click', event => {
                        event.stopPropagation();
                        speakReviewText(getGuessWordTTSText(currentPair));
                    });
                }

                const knownButton = card.querySelector('.flashcards-known-button');
                const unknownButton = card.querySelector('.flashcards-unknown-button');

                const currentAssessment = assessedCards.get(currentCardIndex);

                if (currentAssessment === 'known' && knownButton) {
                    knownButton.classList.add('flashcards-assessment-pressed');
                }

                if (currentAssessment === 'unknown' && unknownButton) {
                    unknownButton.classList.add('flashcards-assessment-pressed');
                }

                function advanceFlashcardAfterAssessment(button, status) {
                    if (!button) return;

                    recordFlashcardAssessment(status);
                    button.classList.add('flashcards-assessment-pressed');

                    setTimeout(() => {
                        if (currentCardIndex < roundPairs.length - 1) {
                            animateFlashcardNavigation(1);
                            return;
                        }

                        if (allFlashcardsAssessed()) {
                            showFlashcardsCompletionPage();
                            return;
                        }

                        renderFlashcard();
                    }, 180);
                }

                if (knownButton) {
                    knownButton.addEventListener('click', event => {
                        event.stopPropagation();
                        advanceFlashcardAfterAssessment(knownButton, 'known');
                    });
                }

                if (unknownButton) {
                    unknownButton.addEventListener('click', event => {
                        event.stopPropagation();
                        advanceFlashcardAfterAssessment(unknownButton, 'unknown');
                    });
                }

                attachSayWordSentenceWordTTS(card, card);
            }

            previousButton.disabled = currentCardIndex <= 0;
            nextButton.disabled = currentCardIndex >= roundPairs.length - 1 && !allFlashcardsAssessed();
            updateFlashcardsIndicator();

            if (settings.showSvg) {
                convertToSvg();
            }
        }

        card.addEventListener('click', () => {
            revealFlashcardWithFlip();
        });

        previousButton.addEventListener('click', () => {
            animateFlashcardNavigation(-1);
        });

        nextButton.addEventListener('click', () => {
            animateFlashcardNavigation(1);
        });

        const flashcardsKeyboardHandler = event => {
            const activeElement = document.activeElement;
            const isTypingIntoField = activeElement && (
                activeElement.tagName === 'INPUT'
                || activeElement.tagName === 'TEXTAREA'
                || activeElement.isContentEditable
            );

            if (isTypingIntoField) return;

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                animateFlashcardNavigation(-1);
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                animateFlashcardNavigation(1);
                return;
            }

            if ((event.key === 'Enter' || event.key === 'Return') && !cardIsRevealed) {
                event.preventDefault();
                revealFlashcardWithFlip();
                return;
            }

            if (!cardIsRevealed) return;

            const knownButton = card.querySelector('.flashcards-known-button');
            const unknownButton = card.querySelector('.flashcards-unknown-button');
            const ttsButton = card.querySelector('.flashcards-tts-button');

            if (event.key === '1' && knownButton) {
                event.preventDefault();
                knownButton.click();
                return;
            }

            if (event.key === '2' && unknownButton) {
                event.preventDefault();
                unknownButton.click();
                return;
            }

            if (event.key === ' ' && ttsButton) {
                event.preventDefault();

                ttsButton.classList.add('keyboard-active');
                ttsButton.click();

                setTimeout(() => {
                    ttsButton.classList.remove('keyboard-active');
                }, 140);
            }
        };

        document.addEventListener('keydown', flashcardsKeyboardHandler);

        let flashcardTouchStartX = 0;
        let flashcardIsDragging = false;
        let flashcardIsSliderActive = false;
        const flashcardSwipeThreshold = 50;

        const flashcardTouchStartHandler = event => {
            if (event.target.closest('input[type="range"]')) {
                flashcardIsSliderActive = true;
                return;
            }

            flashcardTouchStartX = event.changedTouches[0].screenX;
            flashcardIsDragging = true;
            card.style.transition = 'none';
        };

        const flashcardTouchMoveHandler = event => {
            if (flashcardIsSliderActive) return;

            event.preventDefault();
            if (!flashcardIsDragging) return;

            const touchMoveX = event.changedTouches[0].screenX;
            const moveDistance = touchMoveX - flashcardTouchStartX;

            const revealedRotation = cardIsRevealed ? ' rotateY(180deg)' : '';
            card.style.transform = `translateX(${moveDistance}px)${revealedRotation}`;
        };

        const flashcardTouchEndHandler = event => {
            if (flashcardIsSliderActive) {
                flashcardIsSliderActive = false;
                return;
            }

            if (!flashcardIsDragging) return;
            flashcardIsDragging = false;

            const touchEndX = event.changedTouches[0].screenX;
            const moveDistance = touchEndX - flashcardTouchStartX;

            card.style.transition = 'transform 0.3s ease';

            if (moveDistance < -flashcardSwipeThreshold) {
                animateFlashcardNavigation(1);
            } else if (moveDistance > flashcardSwipeThreshold) {
                animateFlashcardNavigation(-1);
            } else {
                card.style.transform = '';
            }
        };

        document.addEventListener('touchstart', flashcardTouchStartHandler, { passive: true });
        document.addEventListener('touchmove', flashcardTouchMoveHandler, { passive: false });
        document.addEventListener('touchend', flashcardTouchEndHandler);
        document.addEventListener('touchcancel', flashcardTouchEndHandler);

        const originalShowFlashcardsCompletionPage = showFlashcardsCompletionPage;
        showFlashcardsCompletionPage = function () {
            document.removeEventListener('keydown', flashcardsKeyboardHandler);
            document.removeEventListener('touchstart', flashcardTouchStartHandler);
            document.removeEventListener('touchmove', flashcardTouchMoveHandler);
            document.removeEventListener('touchend', flashcardTouchEndHandler);
            document.removeEventListener('touchcancel', flashcardTouchEndHandler);
            originalShowFlashcardsCompletionPage();
        };

        gameContainer.appendChild(card);
        flashcardsGameView.appendChild(gameContainer);
        flashcardsGameView.appendChild(flashcardsFooter);

        renderFlashcard();
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
        const matchAssessmentResults = new Map();

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

        function getMatchButtonPairKey(button) {
            return button?.dataset?.pairKey || '';
        }

        function recordMatchAssessment(button, status) {
            const pairKey = getMatchButtonPairKey(button);
            if (!pairKey || matchAssessmentResults.has(pairKey)) return;

            matchAssessmentResults.set(pairKey, status);
        }

        function updateMatchCompletionScore() {
            const reviewPage = document.getElementById('reviewPage');
            if (!reviewPage) return;

            const correctCount = [...matchAssessmentResults.values()]
                .filter(result => result === 'correct').length;
            const incorrectCount = [...matchAssessmentResults.values()]
                .filter(result => result === 'incorrect').length;

            const correctCountElement = reviewPage.querySelector('#correctCount');
            const incorrectCountElement = reviewPage.querySelector('#incorrectCount');
            const totalCountElements = reviewPage.querySelectorAll('#totalCount, .totalCount');

            if (correctCountElement) correctCountElement.textContent = correctCount;
            if (incorrectCountElement) incorrectCountElement.textContent = incorrectCount;
            totalCountElements.forEach(totalCountElement => {
                totalCountElement.textContent = roundPairs.length;
            });
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
                recordMatchAssessment(selectedWordButton, 'correct');

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
                        window.matchAssessmentResults = new Map(matchAssessmentResults);
                        showMatchReviewPage(roundPairs);
                        updateMatchCompletionScore();
                    }, 400);
                }

                return;
            }

            recordMatchAssessment(selectedWordButton, 'incorrect');

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
            wordButton.dataset.pairKey = getMatchPairKey(pair);
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
            emojiButton.dataset.pairKey = getMatchPairKey(pair);
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

        if (settings.showSvg) {
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
                    ? `<span class="word guess-word-answer" style="color: springgreen; text-decoration: underline; text-underline-offset: 0.25em">${displayGroup}</span>`
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
                ? `<span class="word guess-word-answer" style="color: springgreen; text-decoration: underline; text-underline-offset: 0.25em">${displayTargetWord}</span>`
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

        if (settings.showSvg) {
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
    setSayWordSideButtonsDisabled(false);

    if (sayWordRecognition) {
        try {
            if (shouldUseNativeSpeechRecognition()) {
                stopNativeSayWordRecognition();
            } else {
                sayWordRecognition.stop();
            }
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
        let sayWordCorrectCount = 0;
        let sayWordIncorrectCount = 0;
        let sayWordQuestionIsResolving = false;
        const sayWordAssessmentResults = new Map();

        const gameContainer = document.createElement('div');
        gameContainer.className = 'guess-word-game-container say-word-game-container';

        const sentenceBubble = document.createElement('div');
        sentenceBubble.className = 'guess-word-sentence-bubble say-word-message-bubble';

        const microphoneContainer = document.createElement('div');
        microphoneContainer.className = 'say-word-microphone-container';

        const sayWordPlayButton = document.createElement('button');
        sayWordPlayButton.type = 'button';
        sayWordPlayButton.className = 'say-word-side-button say-word-play-button';
        sayWordPlayButton.innerHTML = `
            <img src="assets/svg/25B6.svg" alt="" class="say-word-side-icon">
        `;

        const microphoneButton = document.createElement('button');
        microphoneButton.type = 'button';
        microphoneButton.className = 'say-word-microphone-button';
        microphoneButton.innerHTML = `
            <img src="assets/svg/1F3A4.svg" alt="Microphone" class="say-word-microphone-icon">
        `;

        const sayWordSkipButton = document.createElement('button');
        sayWordSkipButton.type = 'button';
        sayWordSkipButton.className = 'say-word-side-button say-word-skip-button';
        sayWordSkipButton.innerHTML = `
            <img src="assets/svg/23ED.svg" alt="" class="say-word-side-icon">
        `;

        microphoneContainer.appendChild(sayWordPlayButton);
        microphoneContainer.appendChild(microphoneButton);
        microphoneContainer.appendChild(sayWordSkipButton);

        setSayWordSideButtonsDisabled = disabled => {
            sayWordPlayButton.disabled = disabled;
            sayWordSkipButton.disabled = disabled;
        };

        const hintBubble = document.createElement('div');
        hintBubble.className = 'say-word-hint-bubble guess-word-sentence-bubble';
        hintBubble.setAttribute('role', 'button');
        hintBubble.setAttribute('tabindex', '0');
        hintBubble.setAttribute('aria-pressed', 'false');

        const transcriptBubble = document.createElement('div');
        transcriptBubble.className = 'say-word-transcript-bubble guess-word-sentence-bubble';
        transcriptBubble.textContent = '';

        const controlZone = document.createElement('div');
        controlZone.className = 'say-word-control-zone';
        controlZone.appendChild(microphoneContainer);
        controlZone.appendChild(hintBubble);
        controlZone.appendChild(transcriptBubble);

        gameContainer.appendChild(sentenceBubble);
        gameContainer.appendChild(controlZone);

        sayWordGameView.appendChild(gameContainer);

        function updateSayWordCompletionScore() {
            const reviewPage = document.getElementById('reviewPage');
            if (!reviewPage) return;

            reviewPage.querySelector('#correctCount').textContent = sayWordCorrectCount;
            reviewPage.querySelector('#incorrectCount').textContent = sayWordIncorrectCount;

            reviewPage.querySelectorAll('#totalCount').forEach(element => {
                element.textContent = roundPairs.length;
            });
        }

        function clearSayWordSentenceHighlights() {
            sentenceBubble.querySelectorAll('.word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });

            hintBubble.querySelectorAll('.word.highlight, .say-word-hint-word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });
        }

        const clearSayWordHighlightOnOutsideClick = event => {
            const clickedHighlightableWord = event.target.closest(
                '.say-word-clickable-word, .say-word-hint-word, .word'
            );

            if (clickedHighlightableWord && (
                sentenceBubble.contains(clickedHighlightableWord) ||
                hintBubble.contains(clickedHighlightableWord)
            )) {
                return;
            }

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
            sayWordQuestionIsResolving = false;

            if (!currentPair) {
                document.removeEventListener('click', clearSayWordHighlightOnOutsideClick);
                window.sayWordAssessmentResults = new Map(sayWordAssessmentResults);
                showMatchReviewPage(roundPairs);
                updateSayWordCompletionScore();
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

            function advanceToNextSayWordQuestion() {
                currentQuestionIndex += 1;
                sayWordQuestionIsResolving = false;
                setSayWordSideButtonsDisabled(false);
                microphoneButton.disabled = false;
                renderCurrentQuestion();
            }

            sayWordPlayButton.onclick = event => {
                event.stopPropagation();

                if (sayWordIsRecording || sayWordQuestionIsResolving) return;

                sayWordQuestionIsResolving = true;
                setSayWordSideButtonsDisabled(true);
                microphoneButton.disabled = true;

                speakReviewText(getGuessWordTTSText(currentPair), () => {
                    sayWordQuestionIsResolving = false;
                    setSayWordSideButtonsDisabled(false);
                    microphoneButton.disabled = false;
                });
            };

            sayWordSkipButton.onclick = event => {
                event.stopPropagation();

                if (sayWordIsRecording || sayWordQuestionIsResolving) return;

                sayWordQuestionIsResolving = true;
                setSayWordSideButtonsDisabled(true);
                microphoneButton.disabled = true;

                sayWordIncorrectCount += 1;
                sayWordAssessmentResults.set(currentQuestionIndex, 'incorrect');
                revealSayWordHint();

                sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, true, true);
                attachSayWordSentenceWordTTS(sentenceBubble, transcriptBubble);

                if (settings.showSvg) {
                    convertToSvg();
                }

                if (!ttsEnabled || !currentVoice) {
                    setTimeout(advanceToNextSayWordQuestion, 2000);
                    return;
                }

                speakReviewText(getGuessWordTTSText(currentPair), () => {
                    setTimeout(advanceToNextSayWordQuestion, 450);
                });
            };

            microphoneButton.onclick = () => {
                toggleSayWordRecording(
                    transcriptBubble,
                    currentPair,
                    microphoneButton,
                    revealSayWordHint,
                    () => {
                        sayWordCorrectCount += 1;
                        sayWordAssessmentResults.set(currentQuestionIndex, 'correct');
                        currentQuestionIndex += 1;
                        renderCurrentQuestion();
                    }
                );
            };

            if (settings.showSvg) {
                convertToSvg();
            }

            if (settings.sayWordAutoAdvance) {
                setTimeout(() => {
                    if (!sayWordIsRecording && currentPair === roundPairs[currentQuestionIndex]) {
                        microphoneButton.click();
                    }
                }, 250);
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
        setSayWordSideButtonsDisabled(true);
        applySayWordRecordingVisual(true);
        startSayWordVolumeMonitoring(sayWordMicStream);

        sayWordRecognition = new SpeechRecognition();
        sayWordRecognition.lang = getSpeechRecognitionLang(currentLanguage);
        sayWordRecognition.interimResults = true;
        sayWordRecognition.continuous = true;

        let finalTranscript = '';
        let visibleFinalTranscript = '';
        let sayWordMatched = false;
        let sayWordMatchDelayTimer = null;
        let pendingSayWordAfterRecording = null;
        const sayWordMatchDelayMs = 900;

        function scheduleSayWordMatchCheck(transcript) {
            if (sayWordMatched) return;

            if (sayWordMatchDelayTimer) {
                clearTimeout(sayWordMatchDelayTimer);
            }

            sayWordMatchDelayTimer = setTimeout(() => {
                if (sayWordMatched) return;

                if (transcriptMatchesSayWordPair(transcript, currentPair)) {
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

            if (microphoneButton) {
                microphoneButton.classList.remove('recording');
                microphoneButton.style.boxShadow = 'none';
            }

            if (typeof revealHint === 'function') {
                revealHint();
            }

            const sentenceBubble = document.querySelector('.say-word-message-bubble');

            if (sentenceBubble) {
                sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, true, true);

                attachSayWordSentenceWordTTS(
                    sentenceBubble,
                    document.querySelector('.say-word-transcript-bubble')
                );

                if (settings.showSvg) {
                    convertToSvg();
                }
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

            pendingSayWordAfterRecording = () => {
                if (!ttsEnabled || !currentVoice) {
                    setTimeout(() => {
                        finishSayWordSuccess();
                    }, 2000);

                    return;
                }

                setTimeout(() => {
                    speakReviewText(getGuessWordTTSText(currentPair), finishSayWordSuccess);
                }, 100);
            };

            stopSayWordRecording(false);
        }

        sayWordRecognition.onstart = () => {
            transcriptBubble.textContent = getCommonTranslation('listening', 'Listening...');
        };

        function handleSayWordTranscript(
            combinedTranscript,
            visibleTranscript,
            interimTranscript = ''
        ) {
            updateSayWordVisibleTranscript(transcriptBubble, visibleTranscript);

            if (isSayWordTranscriptTooFull(transcriptBubble)) {
                visibleFinalTranscript = '';

                updateSayWordVisibleTranscript(
                    transcriptBubble,
                    interimTranscript || visibleTranscript
                );
            }

            if (transcriptMatchesSayWordPair(combinedTranscript, currentPair)) {
                scheduleSayWordMatchCheck(combinedTranscript);
            }
        }

        sayWordRecognition.onresult = event => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += ` ${text}`;
                    finalTranscript = finalTranscript.trim();

                    visibleFinalTranscript += ` ${text}`;
                    visibleFinalTranscript = visibleFinalTranscript.trim();
                } else {
                    interimTranscript += text;
                }
            }

            const combinedTranscript = `${finalTranscript} ${interimTranscript}`.trim();
            const visibleTranscript = `${visibleFinalTranscript} ${interimTranscript}`.trim();

            handleSayWordTranscript(
                combinedTranscript,
                visibleTranscript,
                interimTranscript
            );
        };

        function handleSayWordRecognitionEnd() {
            if (pendingSayWordAfterRecording) {
                const callback = pendingSayWordAfterRecording;
                pendingSayWordAfterRecording = null;

                setTimeout(callback, 150);
                return;
            }

            if (sayWordIsRecording && sayWordRecognition) {
                try {
                    if (shouldUseNativeSpeechRecognition()) {
                        setNativeSayWordTranscriptHandler(transcript => {
                            handleSayWordTranscript(
                                transcript,
                                transcript,
                                transcript
                            );
                        })
                            .then(() => setNativeSayWordReadyHandler(handleSayWordRecognitionEnd))
                            .then(() => startNativeSayWordRecognition())
                            .catch(error => {
                                console.error(
                                    'Could not restart native speech recognition:',
                                    error
                                );

                                stopSayWordRecording();
                            });
                    } else {
                        sayWordRecognition.start();
                    }
                } catch (_) {
                    stopSayWordRecording();
                }
            }
        }

        sayWordRecognition.onend = handleSayWordRecognitionEnd;

        sayWordRecognition.onerror = event => {
            console.warn('Say Word recognition error:', event.error);
        };

        sayWordRecognition.onnomatch = () => {
            if (sayWordMatchDelayTimer) {
                clearTimeout(sayWordMatchDelayTimer);
                sayWordMatchDelayTimer = null;
            }
        };

        if (shouldUseNativeSpeechRecognition()) {
            await setNativeSayWordTranscriptHandler(transcript => {
                handleSayWordTranscript(
                    transcript,
                    transcript,
                    transcript
                );
            });

            await setNativeSayWordReadyHandler(
                handleSayWordRecognitionEnd
            );

            await startNativeSayWordRecognition();
        } else {
            sayWordRecognition.start();
        }
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
        const guessWordAssessmentResults = new Map();
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

        function clearGuessWordSentenceHighlights() {
            sentenceBubble.querySelectorAll('.word.highlight').forEach(word => {
                word.classList.remove('highlight');
            });
        }

        const clearGuessWordHighlightOnOutsideClick = event => {
            const clickedHighlightableWord = event.target.closest(
                '.say-word-clickable-word, .word'
            );

            if (clickedHighlightableWord && sentenceBubble.contains(clickedHighlightableWord)) {
                return;
            }

            clearGuessWordSentenceHighlights();
        };

        document.addEventListener('click', clearGuessWordHighlightOnOutsideClick);

        function updateGuessWordCompletionScore() {
            const reviewPage = document.getElementById('reviewPage');
            if (!reviewPage) return;

            const correctCount = [...guessWordAssessmentResults.values()]
                .filter(result => result === 'correct').length;
            const incorrectCount = [...guessWordAssessmentResults.values()]
                .filter(result => result === 'incorrect').length;

            const correctCountElement = reviewPage.querySelector('#correctCount');
            const incorrectCountElement = reviewPage.querySelector('#incorrectCount');
            const totalCountElements = reviewPage.querySelectorAll('#totalCount, .totalCount');

            if (correctCountElement) correctCountElement.textContent = correctCount;
            if (incorrectCountElement) incorrectCountElement.textContent = incorrectCount;
            totalCountElements.forEach(totalCountElement => {
                totalCountElement.textContent = roundPairs.length;
            });
        }

        function renderQuestion() {
            const currentPair = roundPairs[currentQuestionIndex];
            let firstGuessMade = false;
            if (!currentPair) {
                document.removeEventListener('click', clearGuessWordHighlightOnOutsideClick);
                window.guessWordAssessmentResults = new Map(guessWordAssessmentResults);
                showMatchReviewPage(roundPairs);
                updateGuessWordCompletionScore();
                return;
            }

            clearGuessWordSentenceHighlights();
            isCheckingAnswer = false;
            feedback.textContent = '';
            feedback.className = 'guess-word-feedback';
            sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, false, true);
            attachSayWordSentenceWordTTS(sentenceBubble, sentenceBubble);
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
                        if (!firstGuessMade) {
                            guessWordAssessmentResults.set(currentQuestionIndex, 'incorrect');
                            firstGuessMade = true;
                        }
                        feedback.innerHTML = wrapEmoji('👎');
                        feedback.className = 'guess-word-feedback';

                        if (settings.showSvg) {
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

                    if (!firstGuessMade) {
                        guessWordAssessmentResults.set(currentQuestionIndex, 'correct');
                        firstGuessMade = true;
                    }

                    isCheckingAnswer = true;
                    answerButton.classList.add('match-correct');

                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });

                    setTimeout(() => {
                        sentenceBubble.innerHTML = renderGuessWordSentence(currentPair, true, true);
                        attachSayWordSentenceWordTTS(sentenceBubble, sentenceBubble);

                        if (settings.showSvg) {
                            convertToSvg();
                        }

                        feedback.innerHTML = wrapEmoji('👍');
                        feedback.classList.add('guess-word-feedback-correct');

                        if (settings.showSvg) {
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
                    }, 350);
                });

                answerButtonGrid.appendChild(answerButton);
            });

            if (settings.showSvg) {
                convertToSvg();
            }
        }

        renderQuestion();
    }

    function clearMatchCompletionView() {
        const matchGameView = document.getElementById('match-game-view');
        const guessWordGameView = document.getElementById('guess-word-game-view');
        const sayWordGameView = document.getElementById('say-word-game-view');
        const flashcardsGameView = document.getElementById('flashcards-game-view');
        const reviewPage = document.getElementById('reviewPage');
        const existingSummary = document.getElementById('match-completion-summary');

        if (existingSummary) existingSummary.remove();
        if (matchGameView) matchGameView.innerHTML = '';
        if (guessWordGameView) guessWordGameView.innerHTML = '';
        if (sayWordGameView) sayWordGameView.innerHTML = '';
        if (flashcardsGameView) flashcardsGameView.innerHTML = '';
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

        if (completionMessage) {
            completionMessage.textContent = commonData?.completionMessage?.[currentLanguage] || 'Great job!';
        }

        if (reviewEmoji) {
            reviewEmoji.textContent = '👍';
            if (settings.showSvg) {
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

            roundPairs.forEach((pair, index) => {
                const row = document.createElement('div');
                row.className = 'match-vocab-row';

                let reviewResultHtml = '';

                if (currentGameId === 'flashcards' && window.flashcardsAssessmentResults instanceof Map) {
                    reviewResultHtml = getReviewResultHtml(
                        window.flashcardsAssessmentResults.get(index)
                    );
                } else if (currentGameId === 'say-word' && window.sayWordAssessmentResults instanceof Map) {
                    reviewResultHtml = getReviewResultHtml(
                        window.sayWordAssessmentResults.get(index)
                    );
                }
                else if (currentGameId === 'guess-word' && window.guessWordAssessmentResults instanceof Map) {
                    reviewResultHtml = getReviewResultHtml(
                        window.guessWordAssessmentResults.get(index)
                    );
                }
                else if (currentGameId === 'match' && window.matchAssessmentResults instanceof Map) {
                    reviewResultHtml = getReviewResultHtml(
                        window.matchAssessmentResults.get(getMatchPairKey(pair))
                    );
                }

                row.innerHTML = `
                    ${reviewResultHtml}
                    <div class="match-vocab-emoji">${wrapEmoji(pair.emoji)}</div>
                    <div class="match-vocab-word">${formatReviewWordForDisplay(pair.word)}</div>
                `;

                row.addEventListener('click', () => {
                    speakReviewText(formatReviewWordForDisplay(pair.word));
                });

                summaryList.appendChild(row);
            });

            reviewContainer.insertAdjacentElement('afterend', summaryList);

            if (settings.showSvg) {
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
                } else if (currentGameId === 'flashcards') {
                    renderFlashcardsGameIntro(introPairs);
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

    async function updateLanguage(lang, translations) {
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
        settings.currentLanguage = lang;
        await saveSettings();
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
        volumeMinIcon.addEventListener('click', async () => {
            volumeSlider.value = 0;
            settings.ttsVolume = '0';
            await saveSettings();
            updateSpeakerIcon(0);
        });
    }

    if (volumeMaxIcon && volumeSlider) {
        volumeMaxIcon.addEventListener('click', async () => {
            volumeSlider.value = 1;
            settings.ttsVolume = '1';
            await saveSettings();
            updateSpeakerIcon(1);
        });
    }

    if (volumeSlider) {
        const savedVolume = settings.ttsVolume;
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
        }

        volumeSlider.addEventListener('input', async () => {
            settings.ttsVolume = volumeSlider.value;
            await saveSettings();
            updateSpeakerIcon(parseFloat(volumeSlider.value));
        });

        updateSpeakerIcon(parseFloat(volumeSlider.value));
    }

    if (speedSlider) {
        const savedSpeed = settings.ttsSpeed;
        speedSlider.value = savedSpeed;

        speedSlider.addEventListener('input', async () => {
            settings.ttsSpeed = speedSlider.value;
            await saveSettings();
        });
    }

    async function toggleSvg() {
        const showSvg = svgSwitch.checked;
        settings.showSvg = showSvg;
        await saveSettings();

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
        return speedSlider ? parseFloat(speedSlider.value) : parseFloat(settings.ttsSpeed);
    }

    function getTTSVolume() {
        return volumeSlider ? parseFloat(volumeSlider.value) : parseFloat(settings.ttsVolume);
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

    async function initializeDefaultVoices() {
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

        settings.selectedVoices = defaultVoices;
        await saveSettings();
    }

    function checkAndInitializeVoices() {
        if (!settings.selectedVoices) {
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

        const storedVoices = settings.selectedVoices;
        const languageSettings = commonData?.settings || {};
        const storedVoiceName = storedVoices[currentLanguage];
        const languageVoices = voices.filter(voice => voice.lang.startsWith(currentLanguage));

        if (languageVoices.length > 0) {
            ttsEnabled = true;

            languageVoices.forEach(voice => {
                const button = document.createElement('button');
                button.className = 'voice-btn';
                button.type = 'button';
                button.textContent = voice.name;

                button.addEventListener('click', async () => {
                    currentVoice = voice;

                    document.querySelectorAll('.voice-btn').forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');

                    storedVoices[currentLanguage] = voice.name;
                    settings.selectedVoices = storedVoices;
                    await saveSettings();

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

        const storedVoices = settings.selectedVoices;
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
        console.log('updateSpeakerIcon', volume);
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