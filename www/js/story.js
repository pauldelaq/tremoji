// === Global Setup ===
let currentLanguage;
let previousLanguage;
let currentVoice = null;
let ttsEnabled = false;
let voicesInitialized = false;
let lastOptions = null;
let selectedOption = null;
let currentWord = null;
let storyData = {};
let commonData = {};
let confettiPlayed = false;
let showSvg;
let showClues;
let showText;
const jsConfetti = new JSConfetti();

const FREE_WEB_STORIES = new Set([
  'Introduction',
  'Restaurant'
]);

function isNativeApp() {
  return Boolean(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

function canAccessStory(storyKey) {
  return isNativeApp() || FREE_WEB_STORIES.has(storyKey);
}

function getStoryScrollContainer() {
  return document.querySelector('.page-scroll');
}

async function recordStoryCompletion() {
  const lang = currentLanguage;
  const storyKey = getQueryParam('file');
  const difficulty = settings.difficulty;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const storyCompletion = progress.storyCompletion || {};

  if (!storyCompletion[lang]) {
    storyCompletion[lang] = {};
  }

  storyCompletion[lang][storyKey] = {
    difficulty,
    date: dateStr
  };

  progress.storyCompletion = storyCompletion;
  await saveProgress();
  console.log(`[✔] Logged story completion: ${lang} → ${storyKey}, difficulty: ${difficulty}`);
}

// === Dropdown Toggle ===
function toggleDropdown(id, button) {
  const dropdown = document.getElementById(id);
  const isOpen = dropdown.classList.contains("show");

  // ✅ Close all dropdowns and remove highlights
  document.querySelectorAll(".dropdown-content").forEach(d => d.classList.remove("show"));
  document.querySelectorAll(".dropbtn").forEach(b => b.classList.remove("active"));

  // ✅ If it was already open, just return
  if (isOpen) return;

  // ✅ Otherwise, open this one and highlight the button
  dropdown.classList.add("show");
  if (button) button.classList.add("active");
}
    
function updateClueVisibility() {
    document.body.classList.toggle('hide-clues', !showClues);
  }  

function convertEmojiToSvg(emoji) {
    const codepoints = [...emoji].map(ch => ch.codePointAt(0).toString(16).toUpperCase());
    let emojiCode = codepoints.join('-');

    // Normalize to avoid FE0F errors
    if (emojiCode.includes('FE0F')) {
      emojiCode = emojiCode.replace('-FE0F', '');
    }

    return `<span class="emoji"><img src="assets/svg/${emojiCode}.svg" style="height: 1.5em;" alt="${emoji}"></span>`;
}

async function toggleShowText() {
  showText = !showText;
  settings.showText = showText;
  await saveSettings();

  const textSwitch = document.getElementById('textSwitch');
  if (textSwitch) textSwitch.checked = showText;

  renderConversation(true);
}

function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');
    buttons.forEach(btn => {
      const isSelected = btn.dataset.lang === lang;
      btn.classList.toggle('selected', isSelected);
    });
  }  
  
// === Language Switching ===
async function changeLanguage(lang) {
  previousLanguage = currentLanguage;
  currentLanguage = lang;
  settings.currentLanguage = lang;
  await saveSettings();
  updateSelectedLanguageButton(lang);
  updateCustomLabelText();
  toggleTextSpacesVisibility();
  updateUILanguageLabels();
  refreshAvailableVoices();
  setTTSLanguage(lang);
  toggleDropdown('languageDropdown');
}

async function switchToPreviousLanguage() {
  const temp = currentLanguage;
  currentLanguage = previousLanguage;
  previousLanguage = temp;

  settings.currentLanguage = currentLanguage;
  await saveSettings();

  updateSelectedLanguageButton(currentLanguage);
  updateUILanguageLabels();
  updateCustomLabelText();
  toggleTextSpacesVisibility();
  updateStoryName();
  applyThaiTextStyle();
  refreshAvailableVoices();
  setTTSLanguage(currentLanguage);
  rebuildConversation(false);
}

function updateUILanguageLabels() {
  const s = commonData?.settings;
  const lang = currentLanguage;

  if (!s) return;

  const map = {
    showCluesLabel: s.showClues?.[lang],
    showTextLabel: s.showText?.[lang],
    showSvgLabel: s.showSvg?.[lang],
    volumeLevelLabel: s.volume?.[lang],
    TTSSpeedLabel: s.ttsSpeed?.[lang],
    fontSizeLabel: s.fontSize?.[lang],
    helpLabel: s.help?.[lang]
  };

  for (const id in map) {
    const el = document.getElementById(id);
    if (el && map[id]) {
      el.textContent = map[id];
    }
  }

  const cats = document.querySelectorAll('.setting-category p');
  if (cats.length > 0 && s.ttsSettings?.[lang]) cats[0].textContent = s.ttsSettings[lang];
  if (cats.length > 1 && s.ttsVoices?.[lang]) cats[1].textContent = s.ttsVoices[lang];
}

function toggleTextSpacesVisibility() {
  const customSwitchContainer = document.querySelector('.custom-switch-container');
  const asianLanguages = ['zh-CN', 'zh-TW', 'ja', 'th'];

  if (asianLanguages.includes(currentLanguage)) {
      customSwitchContainer.style.display = 'block'; // Show the setting
  } else {
      customSwitchContainer.style.display = 'none'; // Hide the setting
  }
}

// === Label Update (like 文字 ➝ 文 字) ===
function updateCustomLabelText() {
  const label = document.getElementById('customLabel');
  if (!label) return;

  if (currentLanguage === 'th') {
    label.innerHTML = `
      แยกคำ 
      <img src="assets/svg/27A1.svg" width="20" height="20">
      <br>
      <span style="display:inline-block; margin-left: 40px;">แยก คำ</span>
    `;
  } else {
    label.innerHTML = `
      文字 
      <img src="assets/svg/27A1.svg" width="20" height="20">
      文 字
    `;
  }
}

function applyThaiTextStyle() {
  const storyContent = document.getElementById('story-content');
  if (!storyContent) return;

  if (currentLanguage === 'th') {
    storyContent.classList.add('thai-text');
  } else {
    storyContent.classList.remove('thai-text');
  }
}

function processTextBasedOnLanguage(text) {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // transport & map
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')  // regional flags
    .replace(/[\uFE0F\u200D]/g, '');         // variation selectors
}

function preprocessStoryText(text, forTTS = false) {
if (forTTS) {
  let cleaned = text
    .replace(/\[UL\]|\[ENDUL\]|\[BR\]/g, '')
    .replace(/\[\[([^\]/]+)\/([^\]]+)\]\]/g, '$2') // preserve TTS override version
    .replace(/\[\[.*?\]\]/g, '') // remove any remaining double-bracketed content
    .replace(/<span class=['"]emoji['"]>.*?<\/span>/gi, '')
    .replace(/<[^>]+>/g, '');

  cleaned = processTextBasedOnLanguage(cleaned);

  if (currentLanguage === 'th') {
    // Collapse single spaces, preserve double spaces
    cleaned = cleaned.replace(/(?<! ) (?! )/g, ''); // remove single spaces only
  }

  return cleaned;
}
  
  const isAsianLanguage = ['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage);
  const isTextSpacesEnabled = settings.isTextSpacesEnabled;

  // 🔁 Step 0: LOCK any {...}
  text = text.replace(/\{([^}]+)\}/g, (_, inner) => `[[LOCKED:${inner}]]`);

  // 🔁 Step 1: Replace [BR] with placeholder
  text = text.replace(/\[BR\]/gi, '[[LINEBREAK]]');

  // 🔁 Step 2: Wrap spans
  text = wrapWordsInSpans(text, isAsianLanguage, isTextSpacesEnabled);

  // ✅ Step 3: Apply green coloring to [UL]...[/ENDUL] spans after wrapping
  text = text.replace(/\[UL\](.+?)\[ENDUL\]/g, (_, inner) =>
    `<span style="color: springgreen;">${inner}</span>`
  );

  // ✅ Step 4: Convert [[HIGHLIGHT:...]] into spring green span (if still present)
  text = text.replace(/\[\[HIGHLIGHT:(.+?)\]\]/g, (_, inner) =>
    `<span style="color: springgreen;">${inner}</span>`
  );

  // 🔁 Step 5: Restore line breaks
  text = text.replace(/\[\[LINEBREAK\]\]/g, '<br>');

  // 🔁 Step 6: Restore locked segments
  let wordIndex = (text.match(/class=['"]word['"]/g) || []).length;
  text = text.replace(/\[\[LOCKED:([^\]]+)\]\]/g, (_, inner) =>
    `<span id="word-${wordIndex++}" class="word">${inner}</span>`
  );

  // 🔁 Step 7: Emoji SVGs
  if (showSvg) {
    text = text.replace(/<span class=['"]emoji['"]>(.*?)<\/span>/g, (_, emojiChar) =>
      convertEmojiToSvg(emojiChar)
    );
  }

  return text;
}

function wrapWordsInSpans(text, isAsianLanguage, addSpaces = false) {
  let wordIndex = 0;
  let pendingOverride = null;

  // 🔒 Protect LOCKED blocks from space-based splitting
  text = text.replace(/\[\[LOCKED:[^\]]+\]\]/g, m => m.replace(/ /g, '__LOCKED_SPACE__'));

  if (isAsianLanguage) {
    const spacePlaceholder = '␣';
    let modifiedText = text.replace(/\s{2}/g, ` ${spacePlaceholder} `);

    modifiedText = modifiedText.split(/(<span class='emoji'>[^<]+<\/span>)/g).map(part => {
      if (part.match(/<span class='emoji'>[^<]+<\/span>/)) return part;

      const tokens = part.match(/(\S+|\s+)/g) || []; // Match words AND all space sequences
      return tokens.map(token => {
        if (token.trim() === '') {
          if (addSpaces) return token;
          return token.length >= 2 ? ' ' : '';
        }
              
        // ✅ Inline highlight
        const highlightMatch = token.match(/^\[\[HIGHLIGHT:([\s\S]+)\]\]$/);
        if (highlightMatch) {
          const inner = highlightMatch[1];
          const segments = inner.match(/(<span class='emoji'>[^<]+<\/span>)|(\[\[.*?\]\]|\{[^}]+\}|\S+)/g);
          if (!segments) return `<span style="color: springgreen;">${inner}</span>`;
          const parsed = segments.map(segment =>
            wrapWordsInSpans(segment, isAsianLanguage, addSpaces)
          ).join('');
          return `<span style="color: springgreen;">${parsed}</span>`;
        }
      
        if (token.startsWith('[[') && token.endsWith(']]')) {
          const inner = token.slice(2, -2);
          if (inner.includes('/')) {
            const [visible, tts] = inner.split('/');
            return `<span id="word-${wordIndex++}" class='word' data-tts="${tts}">${visible}</span>`;
          }
          if (inner.startsWith('OVERRIDE:')) {
            pendingOverride = inner.slice(9);
            return '';
          }
        }
      
        if (token.startsWith('[[OVERRIDE:') && token.endsWith(']]')) {
          pendingOverride = token.slice(10, -2);
          return '';
        }
      
        if (token.startsWith('[[LOCKED:') && token.endsWith(']]')) {
          const raw = token.slice(9, -2).replace(/__LOCKED_SPACE__/g, ' ');
          const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
          pendingOverride = null;
          return `<span id="word-${wordIndex++}" class='word'${ttsAttr}>${raw}</span>`;
        }
      
        if (token.startsWith('{') && token.endsWith('}')) {
          const raw = token.slice(1, -1);
          const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
          pendingOverride = null;
          return `<span id="word-${wordIndex++}" class='word'${ttsAttr}>${raw}</span>`;
        }
      
        let idMatch = token.match(/^(.+?)(\d+(_\d+)*)$/);
        let cleanWord = idMatch ? idMatch[1] : token;
        let wordIds = idMatch ? idMatch[2].split('_') : [];
        let dataWordId = wordIds.length ? ` data-word-id="${wordIds.join(' ')}"` : '';
        const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
        pendingOverride = null;
        return `<span id="word-${wordIndex++}" class='word'${dataWordId}${ttsAttr}>${cleanWord}</span>`;
      }).join('');
          }).join('');

    modifiedText = modifiedText.replace(new RegExp(` ${spacePlaceholder} `, 'g'), '  ');
    modifiedText = modifiedText.replace(new RegExp(spacePlaceholder, 'g'), ' ');
    modifiedText = modifiedText.replace(/__LOCKED_SPACE__/g, ' ');
    return modifiedText;

  } else {
    let modifiedText = text.replace(
      /(<span class='emoji'>[^<]+<\/span>)|(\[\[HIGHLIGHT:[^\]]+\]\]|\[\[LOCKED:[^\]]+\]\]|\[\[LINEBREAK\]\]|\[\[OVERRIDE:[^\]]+\]\]|\[\[[^/]+\/[^\]]+\]\]|\{[^}]+\}|\S+)/g,
      (match, emoji, word) => {
        if (emoji) return emoji;
        if (!word) return '';

        // ✅ Inline highlight
        const highlightMatch = word.match(/^\[\[HIGHLIGHT:([\s\S]+)\]\]$/);
        if (highlightMatch) {
          const inner = highlightMatch[1];
        
          // 🔁 Re-tokenize inner manually — use same pattern as non-Asian branch
          const segments = inner.match(/(<span class='emoji'>[^<]+<\/span>)|(\[\[.*?\]\]|\{[^}]+\}|\S+)/g);
        
          if (!segments) return `<span style="color: springgreen;">${inner}</span>`;
        
          const parsed = segments.map(segment =>
            wrapWordsInSpans(segment, isAsianLanguage, addSpaces)
          ).join(addSpaces ? ' ' : '');
        
          return `<span style="color: springgreen;">${parsed}</span>`;
        }
                
        // ✅ Inline override [[visible/tts]]
        if (word.startsWith('[[') && word.endsWith(']]')) {
          const inner = word.slice(2, -2);
          if (inner.includes('/')) {
            const [visible, tts] = inner.split('/');
            return `<span id="word-${wordIndex++}" class='word' data-tts="${tts}">${visible}</span>`;
          }
          if (inner.startsWith('OVERRIDE:')) {
            pendingOverride = inner.slice(9);
            return '';
          }
        }

        if (word.startsWith('[[OVERRIDE:') && word.endsWith(']]')) {
          pendingOverride = word.slice(10, -2);
          return '';
        }

        if (word.startsWith('[[LOCKED:') && word.endsWith(']]')) {
          const raw = word.slice(9, -2).replace(/__LOCKED_SPACE__/g, ' ');
          const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
          pendingOverride = null;
          return `<span id="word-${wordIndex++}" class='word'${ttsAttr}>${raw}</span>`;
        }

        if (word.startsWith('{') && word.endsWith('}')) {
          const raw = word.slice(1, -1);
          const idMatch = raw.match(/^(.+?)(\d+(_\d+)*)$/);
          const cleanWord = idMatch ? idMatch[1] : raw;
          const wordIds = idMatch ? idMatch[2].split('_') : [];
          const dataWordId = wordIds.length ? ` data-word-id="${wordIds.join(' ')}"` : '';
          const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
          pendingOverride = null;
          return `<span id="word-${wordIndex++}" class='word' ${dataWordId}${ttsAttr}>${cleanWord}</span>`;
        }

        const idMatch = word.match(/^(.+?)(\d+(_\d+)*)$/);
        const cleanWord = idMatch ? idMatch[1] : word;
        const wordIds = idMatch ? idMatch[2].split('_') : [];
        const dataWordId = wordIds.length ? ` data-word-id="${wordIds.join(' ')}"` : '';
        const ttsAttr = pendingOverride ? ` data-tts="${pendingOverride}"` : '';
        pendingOverride = null;
        return `<span id="word-${wordIndex++}" class='word' ${dataWordId}${ttsAttr}>${cleanWord}</span>`;
      }
    );

    modifiedText = modifiedText.replace(/__LOCKED_SPACE__/g, ' ');
    return modifiedText;
  }
}

// === Voice Handling ===
function refreshAvailableVoices() {
  speechSynthesis.onvoiceschanged = () => {
    logAvailableVoices();
  };
  if (speechSynthesis.getVoices().length) {
    logAvailableVoices();
  }
}

function logAvailableVoices() {
  const voices = speechSynthesis.getVoices();
  const voiceOptionsContainer = document.getElementById('voiceOptions');
  if (!voiceOptionsContainer) return;

  const selectedVoices = settings.selectedVoices;
  voiceOptionsContainer.innerHTML = ''; // Clear old buttons

  const langVoices = voices.filter(v => v.lang.startsWith(currentLanguage));

  if (langVoices.length > 0) {
    ttsEnabled = true;

    langVoices.forEach(voice => {
      const btn = document.createElement('button');
      btn.textContent = voice.name;
      btn.className = 'voice-btn';

      btn.onclick = async () => {
        currentVoice = voice;
        selectedVoices[currentLanguage] = voice.name;
        settings.selectedVoices = selectedVoices;
        await saveSettings();

        document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };

      if (selectedVoices[currentLanguage] === voice.name) {
        btn.classList.add('selected');
        currentVoice = voice;
      }

      voiceOptionsContainer.appendChild(btn);
    });

    // ✅ Re-enable sliders if previously disabled
    const volumeSlider = document.getElementById('volumeLevelSlider');
    const speedSlider = document.getElementById('TTSSpeedSlider');
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

    // ✅ Create translated message
    const message = document.createElement('p');
    const languageSettings = commonData.settings;
    const noVoicesMessage = languageSettings.noVoicesAvailable?.[currentLanguage];
    message.textContent = noVoicesMessage || '';
    message.classList.add('unavailable-message');
    voiceOptionsContainer.appendChild(message);

    // ✅ Disable sliders and gray them out
    const volumeSlider = document.getElementById('volumeLevelSlider');
    const speedSlider = document.getElementById('TTSSpeedSlider');
    if (volumeSlider) {
      volumeSlider.disabled = true;
      volumeSlider.classList.add('disabled-slider');
    }
    if (speedSlider) {
      speedSlider.disabled = true;
      speedSlider.classList.add('disabled-slider');
    }
  }
}

function setTTSLanguage(lang) {
  const selectedVoices = settings.selectedVoices;

  const applyVoice = () => {
    const voices = speechSynthesis.getVoices();
    const storedVoiceName = selectedVoices[lang];

    currentVoice = voices.find(v => v.lang.startsWith(lang) && v.name === storedVoiceName)
      || voices.find(v => v.lang.startsWith(lang));

    ttsEnabled = !!currentVoice;
  };

  // If voices not ready, wait for them
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true });
  } else {
    applyVoice();
  }
}

function speakText(text, options = {}) {
  const { enableHighlight = false, messageId = currentMessageId } = options;

  if (!ttsEnabled || !currentVoice) return;

  const utterance = new SpeechSynthesisUtterance(
    currentLanguage === 'ko' ? '\u200B' + text : text
  );
  utterance.voice = currentVoice;
  utterance.rate = getTTSSpeed();
  utterance.volume = getTTSVolume();

  const skipHighlightLangs = ['zh-CN', 'zh-TW', 'ja', 'th'];

  if (enableHighlight && !skipHighlightLangs.includes(currentLanguage)) {
    const bubble = options.bubble || document.querySelector(`#message-${messageId} .bubble`);
    if (!bubble) return;

    // ✅ Extract spans and build matching utterance text
    const wordSpans = Array.from(bubble.querySelectorAll('.word'))
      .filter(span => span.textContent.trim() !== '');

      const ttsText = wordSpans.map(span => (span.dataset.tts || span.textContent).trim()).join(' ');
      utterance.text = ttsText;

    let wordIndex = 0;
    let lastCharIndex = -1;

    utterance.onboundary = (event) => {
      if (event.name !== 'word') return;
      if (wordIndex >= wordSpans.length) return;
    
      const span = wordSpans[wordIndex];
      if (!span) return;
    
      const spanText = (span.dataset.tts || span.textContent).trim();
      const spokenFragment = utterance.text.slice(event.charIndex).trimStart();
      
      // Strip common punctuation and lowercase for comparison
      const normalize = str => str
      .replace(/^\u200B/, '')                // ✅ Remove ZWSP if present
      .normalize('NFC')                      // ✅ Normalize accents
      .replace(/[.,!?¡¿;:]/g, '')            // ✅ Remove punctuation
      .toLowerCase();
      const normalizedSpan = normalize(spanText);
      const normalizedFragment = normalize(spokenFragment.slice(0, spanText.length + 2));
      
      if (!normalizedFragment.startsWith(normalizedSpan)) {
        console.log(`[Skip] Mismatch: expected "${spanText}", but got "${spokenFragment.slice(0, spanText.length)}"`);
        return;
      }
          
      // ✅ Skip lone punctuation (as before)
      if (['!', '?', ':', ';'].includes(spanText) &&
          span.previousSibling?.textContent.trim() === '') {
        wordIndex++;
        return;
      }
    
      wordSpans.forEach(w => w.classList.remove('highlight'));
      span.classList.add('highlight');
      console.log(`[TTS highlight] wordIndex ${wordIndex}: "${spanText}"`);
      wordIndex++;
    };
    
    utterance.onend = () => {
      wordSpans.forEach(w => w.classList.remove('highlight'));
    };
  }
  console.warn('[TTS] Full utterance text:', utterance.text);
  speechSynthesis.speak(utterance);
}

function playCurrentMessageTTS() {
  if (!currentMessageId) return;

  const msg = storyMessages.find(m => String(m.id) === String(currentMessageId));
  if (!msg) return;

  const bubble = document.querySelector(`#message-${msg.id}-${conversationHistory.lastIndexOf(msg.id)} .bubble`);
  if (!bubble) return;

  const wordSpans = Array.from(bubble.querySelectorAll('.word'))
  .filter(span => span.textContent.trim() !== '');

  const isSkipHighlightLang = ['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage);

  let cleanText;
  if (!showText || isSkipHighlightLang || wordSpans.length === 0) {
    cleanText = preprocessStoryText(msg.text, true);
  } else {
    cleanText = wordSpans.map(span => (span.dataset.tts || span.textContent).trim()).join(' ');
  }
    
    speakText(cleanText, {
      enableHighlight: !isSkipHighlightLang && wordSpans.length > 0 && showText,
      messageId: msg.id,
      bubble
    });
      
  if (msg.type === 'speaker' || msg.type === 'user') {
    const avatarEl = document.querySelector(`.tts-avatar[data-id='${msg.id}']`);
    if (avatarEl) {
      avatarEl.classList.remove('rotate-shake');
      void avatarEl.offsetWidth;
      avatarEl.classList.add('rotate-shake');
    }
  } else if (msg.type === 'narration') {
    const narrationIcon = document.querySelector(`.tts-narration[data-id='${msg.id}'] img`);
    if (narrationIcon) {
      narrationIcon.classList.remove('rotate-shake');
      void narrationIcon.offsetWidth;
      narrationIcon.classList.add('rotate-shake');
    }
  }
}

function getTTSVolume() {
  const slider = document.getElementById('volumeLevelSlider');
  return slider ? parseFloat(slider.value) : 1;
}

function getTTSSpeed() {
  const slider = document.getElementById('TTSSpeedSlider');
  return slider ? parseFloat(slider.value) : 1.0;
}

function updateSpeakerIcon(volume) {
  const icon = document.getElementById('volumeMinIcon');
  if (!icon) return;

  if (volume <= 0.01) {
    icon.src = 'assets/svg/1F507.svg';
    volumeMinIcon.classList.add('muted');
  } else {
    icon.src = 'assets/svg/1F508.svg';
    volumeMinIcon.classList.remove('muted');
  }
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  
  const storyKey = getQueryParam('file');

  if (!storyKey) {
    console.error('No file specified in URL');
    window.location.replace('index.html');
  } else if (!canAccessStory(storyKey)) {
    window.location.replace('index.html');
  }

  const filePath = `data/stories/${storyKey}.json`;

  let storyMessages = [];
  let currentMessageId = null;
  let conversationHistory = [];
  
  async function loadStoryJson(storyKey) {
    const filePath = `./data/stories/${storyKey}.json`;  // add `./` to be safe
    console.log('Trying to load story from:', filePath);
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`Failed to load ${filePath}`);
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }
  
  function updateStoryName() {
    const storyNameDisplay = document.getElementById('storyNameDisplay');
    if (storyNameDisplay && storyData[currentLanguage]) {
      storyNameDisplay.textContent = storyData[currentLanguage].storyName || '';
    }
  }  

// === On Page Load ===
document.addEventListener('DOMContentLoaded', async () => {
    await initializeStorage();
    currentLanguage = settings.currentLanguage;
    previousLanguage = currentLanguage;
    showSvg = settings.showSvg;
    showClues = settings.showClues;
    showText = settings.showText;
    updateCustomLabelText();
    toggleTextSpacesVisibility();
    setTTSLanguage(currentLanguage);

    // Load common.json
    try {
      const response = await fetch('data/common.json');
      if (!response.ok) throw new Error('Failed to load common.json');
      commonData = await response.json();
      console.log('commonData loaded:', commonData);

      updateUILanguageLabels();
    } catch (err) {
      console.error('Error loading common.json:', err);
    }

    refreshAvailableVoices();

    updateSelectedLanguageButton(currentLanguage);

    const volumeSlider = document.getElementById('volumeLevelSlider');
    const volumeMinIcon = document.getElementById('volumeMinIcon');
    const volumeMaxIcon = document.getElementById('volumeMaxIcon');
    
    if (volumeMinIcon && volumeSlider) {
        volumeMinIcon.addEventListener('click', async () => {
            volumeSlider.value = 0;
            settings.ttsVolume = '0'
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
        volumeSlider.addEventListener('input', async () => {
            settings.ttsVolume = volumeSlider.value;
            await saveSettings();
            updateSpeakerIcon(parseFloat(volumeSlider.value));
        });
    
        const savedVolume = settings.ttsVolume;
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
            updateSpeakerIcon(parseFloat(savedVolume));
        }
    }
    
    const speedSlider = document.getElementById('TTSSpeedSlider');
    if (speedSlider) {
        speedSlider.addEventListener('input', async () => {
            settings.ttsSpeed = speedSlider.value;
            await saveSettings();
        });
    
        const savedSpeed = settings.ttsSpeed;
        if (savedSpeed !== null) {
            speedSlider.value = savedSpeed;
        }
    }    

    const svgSwitch = document.getElementById('svgSwitch');
    if (svgSwitch) {
      svgSwitch.checked = showSvg;
    
      svgSwitch.addEventListener('change', async () => {
        showSvg = svgSwitch.checked;
        settings.showSvg = showSvg;
        await saveSettings();
        renderConversation(true);
      });
    }    

    const customSwitch = document.getElementById('customSwitch');
    if (customSwitch) {
      const stored = settings.isTextSpacesEnabled;
      customSwitch.checked = stored;
    
      customSwitch.addEventListener('change', async () => {
        const enabled = customSwitch.checked;
        settings.isTextSpacesEnabled = enabled;
        await saveSettings();
        renderConversation(true);
      });
    }    

    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
      textSwitch.checked = showText;
    
      textSwitch.addEventListener('change', async () => {
        showText = textSwitch.checked;
        settings.showText = showText;
        await saveSettings();
        renderConversation(true);
      });
    }    

    const emojiSwitch = document.getElementById('emojiSwitch');
    if (emojiSwitch) {
      emojiSwitch.checked = showClues;
    
      emojiSwitch.addEventListener('change', async () => {
        showClues = emojiSwitch.checked;
        settings.showClues = showClues;
        await saveSettings();
        updateClueVisibility();
      });
    }    

    const difficulty = settings.difficulty;

    // Disable language switching in Medium & Hard
    if (difficulty !== 'easy') {
      const switchLangBtn = document.querySelector('.switch-lang-btn');
      if (switchLangBtn) switchLangBtn.style.display = 'none';
    
      const dropdownBtn = document.querySelector('.dropbtn[data-target="languageDropdown"]');
      if (dropdownBtn) dropdownBtn.style.display = 'none';
    }
    
    if (difficulty === 'hard') {
      // Disable and lock "Show Text" setting
      settings.showText = 'false';
      await saveSettings();
      showText = false;
    
      const textSwitchContainer = document.getElementById('textSwitch')?.closest('.setting-item');
      if (textSwitchContainer) {
        textSwitchContainer.style.display = 'none';
      }
    
      // If the switch element exists (e.g., a slider), disable it and uncheck
      const textSwitch = document.getElementById('textSwitch');
      if (textSwitch) {
        textSwitch.checked = false;
        textSwitch.disabled = true;
      }
    
      // Immediately apply hidden text styles
      document.body.classList.add('hide-text');
    }
    
    // ✅ Font Size: Load from localStorage and apply
    const storedFontSize = settings.fontSize;
    document.getElementById('fontSizeSlider').value = storedFontSize;
    document.documentElement.style.setProperty('--font-size', `${storedFontSize}px`);
  
    storyData = await loadStoryJson(storyKey);
    if (!storyData) return;

    updateStoryName();
    applyThaiTextStyle();

    // ✅ Build the language dropdown menu dynamically
    populateLanguageMenuFromStory(storyData);
    
    // ✅ Fallback to a valid language if needed
    if (!storyData[currentLanguage]) {
      currentLanguage = Object.keys(storyData)[0];
      settings.currentLanguage = currentLanguage;
      await saveSettings();
    }
    
    // ✅ Start the conversation from the beginning
    rebuildConversation(true);

    updateClueVisibility();

    // ✅ Show page content once everything is ready
    document.body.classList.add('content-ready');

    const storyScrollContainer = getStoryScrollContainer();

    if (storyScrollContainer) {
      storyScrollContainer.scrollTop = 0;

      requestAnimationFrame(() => {
        storyScrollContainer.scrollTop = 0;

        requestAnimationFrame(() => {
          storyScrollContainer.scrollTop = 0;
        });
      });
    }
});

// Add event listener to the help icon for opening the FAQ page
document.addEventListener('DOMContentLoaded', function() {
  const helpIcon = document.getElementById('helpIcon');
  if (helpIcon) {
      helpIcon.addEventListener('click', () => {
          window.open('faq.html', '_blank', 'noopener,noreferrer');
      });
  }
});

document.querySelectorAll('.dropbtn').forEach(btn => {
  const targetId = btn.dataset.target;
  if (!targetId) return;

  const handler = (e) => {
    e.preventDefault();
    toggleDropdown(targetId, btn);
  };

  btn.addEventListener('click', handler);
  btn.addEventListener('touchend', handler); // mobile support
});

    // Reusable function to navigate to index.html and handle review page logic
    function navigateToIndex() {
        window.location.href = 'index.html';
    }

    // Add event listener to the Header text
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.addEventListener('click', navigateToIndex);
    }

    // Keyboard navigation
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            navigateToIndex();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const emojiSwitch = document.getElementById('emojiSwitch');
            if (emojiSwitch) {
              emojiSwitch.checked = !emojiSwitch.checked;
              emojiSwitch.dispatchEvent(new Event('change'));
            }
        } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                switchToPreviousLanguage();
        } else if (event.key === 's') {
            const svgSwitch = document.getElementById('svgSwitch');
            if (svgSwitch) {
              svgSwitch.checked = !svgSwitch.checked;
              svgSwitch.dispatchEvent(new Event('change'));
            }
        } else if (event.key === 'Shift') {
                toggleShowText();
        } else if (event.key === ' ') {
            event.preventDefault();
            playCurrentMessageTTS();
        }
        else if (event.key === 'Enter') {
          const nextBtn = document.getElementById('nextBtn');
          if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled')) {
            nextBtn.click();
          }
        }
        else if (event.key === '1' || event.key === '2') {
          const optionButtons = document.querySelectorAll('.option-btn');
          const index = parseInt(event.key, 10) - 1;
      
          if (optionButtons.length > index) {
            const targetButton = optionButtons[index];
            if (!targetButton.disabled) {
              targetButton.click();
            }
          }
        }
    });

    document.body.addEventListener('click', function (event) {
      const isInsideSpeechBubble = event.target.closest('.bubble');

      if (!isInsideSpeechBubble && !event.target.closest('header') && !event.target.closest('footer')) {
          document.querySelectorAll('.word.highlight').forEach(el => el.classList.remove('highlight'));
          currentWord = null;
      }
  });

document.getElementById('fontSizeSlider').addEventListener('input', async (e) => {
    const size = e.target.value;
    settings.fontSize = size;
    await saveSettings();
    document.documentElement.style.setProperty('--font-size', `${size}px`);
  });  

  function renderConversation(skipAutoAdvance = false) {
    const storyMain = document.getElementById('story-content');
    const container = getStoryScrollContainer();
    const hadExistingMessages = storyMain.children.length > 0;
    let wasAtBottom = false;
    if (container && hadExistingMessages) {
      const threshold = 20;
      wasAtBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
        threshold;
    }
    storyMain.innerHTML = '';
  
    conversationHistory.forEach((id, i) => {
      const msg = storyMessages.find(m => String(m.id) === String(id));
      const wrapper = document.createElement('div');
      wrapper.className = `message ${msg.type}`;
      wrapper.id = `message-${msg.id}-${i}`;
  
      if (msg.type === 'narration') {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = showText
        ? `<span class="tts-narration" data-id="${msg.id}">
             <img src="assets/svg/1F4E2.svg" alt="Speak" />
           </span>
           <span class="narration-text">${preprocessStoryText(msg.text)}</span>`
        : `<span class="tts-narration" data-id="${msg.id}">
             <img src="assets/svg/1F4E2.svg" alt="Speak" />
           </span>
           <span class="narration-text">. . .</span>`;
        wrapper.appendChild(bubble);
      } else if (msg.type === 'speaker') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji tts-avatar" data-id="${msg.id}">
          ${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}
          </div>
          <div class="name">${msg.character.name}</div>
        `;
  
        const bubble = document.createElement('div');
        bubble.className = 'bubble left';
        bubble.innerHTML = showText
        ? preprocessStoryText(msg.text)
        : `<span class="hidden-tts">${preprocessStoryText(msg.text)}</span><span class="dots">. . .</span>`;
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
      } else if (msg.type === 'user') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji tts-avatar" data-id="${msg.id}">
          ${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}
          </div>
          <div class="name">${msg.character.name}</div>
        `;
  
        const bubble = document.createElement('div');
        bubble.className = 'bubble right';
        bubble.innerHTML = showText
        ? preprocessStoryText(msg.text)
        : `<span class="hidden-tts">${preprocessStoryText(msg.text)}</span><span class="dots">. . .</span>`;
              
        wrapper.appendChild(bubble);
        wrapper.appendChild(avatar);
      }
  
      storyMain.appendChild(wrapper);

      if (!skipAutoAdvance && i === conversationHistory.length - 1) {
        const bubble = wrapper.querySelector('.bubble');
        const avatar = wrapper.querySelector('.avatar');
        const narrationIcon = wrapper.querySelector('.tts-narration');
      
        if (msg.type === 'user') {
          if (bubble) bubble.classList.add('swipe-in-right');
          if (avatar) avatar.classList.add('swipe-in-right');
        } else if (msg.type === 'speaker') {
          if (bubble) bubble.classList.add('swipe-in-left');
          if (avatar) avatar.classList.add('swipe-in-left');
        } else if (msg.type === 'narration') {
          if (bubble) bubble.classList.add('swipe-in-left');
          if (narrationIcon) narrationIcon.classList.add('swipe-in-left');
        }
      }

      // (Removed: storyShownMessageIds localStorage persistence)

      // === Footer Logic (revised)
      const current = storyMessages.find(m => String(m.id) === String(currentMessageId));
      const nextBtn = document.getElementById('nextBtn');
      const optionContainer = document.getElementById('optionButtons');

      optionContainer.innerHTML = '';

      // === CASE 1: Show option buttons if this message has options
      if (current?.options?.length > 0) {
        nextBtn.classList.add('disabled');
        nextBtn.disabled = true;
        nextBtn.onclick = null;

        current.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.innerHTML = showSvg ? convertEmojiToSvg(opt.emoji) : opt.emoji;

          btn.onclick = () => {
            // ✅ Save user choice + options
            selectedOption = opt.emoji;
            lastOptions = current.options;

            currentMessageId = opt.nextMessageId;
            conversationHistory.push(currentMessageId);
            renderConversation();
          };

          optionContainer.appendChild(btn);
        });
      }

      // === CASE 2: Re-display lastOptions if we're on a user reply (no new options)
      else if (lastOptions && current.type === 'user') {
        lastOptions.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.innerHTML = showSvg ? convertEmojiToSvg(opt.emoji) : opt.emoji;
          btn.disabled = true;

          if (selectedOption === opt.emoji) {
            btn.classList.add('selected-option'); // Optional: style selected one differently
          }

          optionContainer.appendChild(btn);
        });

        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;
        nextBtn.innerHTML = `<img src="assets/svg/23E9.svg" alt="Next" />`;

        nextBtn.onclick = () => {
          nextBtn.classList.add('pulse-effect');
          setTimeout(() => nextBtn.classList.remove('pulse-effect'), 150);

          currentMessageId = current.nextMessageId;
          conversationHistory.push(currentMessageId);

          const nextMsg = storyMessages.find(m => m.id === currentMessageId);
          if (nextMsg?.options?.length) {
            lastOptions = null;
            selectedOption = null;
          }

          renderConversation();
        };
      }

      // === CASE 3: Final message — show Exit
      else if (!current?.nextMessageId) {
        nextBtn.innerHTML = `<img src="assets/svg/E201.svg" alt="Exit" />`;
        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;

        nextBtn.onclick = () => {
          nextBtn.classList.add('pulse-effect');
          setTimeout(() => nextBtn.classList.remove('pulse-effect'), 150);
          window.location.href = 'index.html';
        };

        if (!confettiPlayed) {
          confettiPlayed = true;

          // ✅ Log completion for this story
          recordStoryCompletion();

          jsConfetti.addConfetti({
            emojis: ['🎉', '🥳', '✨', '🎈', '🌟'],
            confettiRadius: 4,
            confettiNumber: 80,
          });
        }
      }

      // === CASE 4: Show regular "Next" button
      else {
        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;
        nextBtn.innerHTML = `<img src="assets/svg/23E9.svg" alt="Next" />`;

        nextBtn.onclick = () => {
          nextBtn.classList.add('pulse-effect');
          setTimeout(() => nextBtn.classList.remove('pulse-effect'), 150);

          currentMessageId = current.nextMessageId;
          conversationHistory.push(currentMessageId);

          const nextMsg = storyMessages.find(m => m.id === currentMessageId);
          if (nextMsg?.options?.length) {
            lastOptions = null;
            selectedOption = null;
          }

          renderConversation();
        };
      }

    });
  
    // === Scroll handling after full rendering
    requestAnimationFrame(() => {
      if (!container) return;

      if (!skipAutoAdvance) {
        scrollToMessage();
      } else if (wasAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    });

    document.querySelectorAll('.word').forEach(wordEl => {
      wordEl.addEventListener('click', () => {
          const wordIds = wordEl.getAttribute('data-word-id');

          if (wordIds) {
              currentWord = wordIds.split(' ');
          } else {
              currentWord = null;
          }

          document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
          wordEl.classList.add('highlight');

          speakText(wordEl.innerText, { enableHighlight: false });
        });
  });
  
  document.querySelectorAll('.tts-avatar').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const msg = storyMessages.find(m => m.id == id);
      if (!msg) return;
  
      const bubble = el.closest('.message')?.querySelector('.bubble');
      if (bubble) {
        const wordSpans = Array.from(bubble.querySelectorAll('.word'))
  .filter(span => span.textContent.trim() !== '');
  const cleanText = preprocessStoryText(msg.text, true); // 🧠 pass `forTTS = true`
  speakText(cleanText, {
    enableHighlight: showText,
    messageId: msg.id,
    bubble
  });
          }
  
      el.classList.remove('rotate-shake');
      void el.offsetWidth;
      el.classList.add('rotate-shake');
    });
  });
  
  document.querySelectorAll('.tts-narration').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const msg = storyMessages.find(m => m.id == id);
      if (!msg) return;

      const bubble = el.closest('.message')?.querySelector('.bubble');
      if (bubble) {
        const wordSpans = Array.from(bubble.querySelectorAll('.word'))
          .filter(span => span.textContent.trim() !== '');
        const cleanText = preprocessStoryText(msg.text, true); // 🧠 pass `forTTS = true`
        speakText(cleanText, {
          enableHighlight: showText,
          messageId: msg.id,
          bubble
        });
      }

      const icon = el.querySelector('img');
      if (icon) {
        icon.classList.remove('rotate-shake');
        void icon.offsetWidth;
        icon.classList.add('rotate-shake');
      }
    });
  });
}

  // === DEBUG: Render all story messages for a language ===
  async function debugRenderAllStoryMessages(lang = currentLanguage) {
    if (!storyData || Object.keys(storyData).length === 0) {
      console.warn('[Debug] storyData is not loaded yet. Open a story first, then run debugRenderAllStoryMessages().');
      return;
    }

    if (!storyData[lang]) {
      console.warn(`[Debug] No story data found for language: ${lang}`);
      console.warn('[Debug] Available languages:', Object.keys(storyData));
      return;
    }

    const storyMain = document.getElementById('story-content');
    const nextBtn = document.getElementById('nextBtn');
    const optionContainer = document.getElementById('optionButtons');

    if (!storyMain) {
      console.warn('[Debug] Could not find #story-content.');
      return;
    }

    currentLanguage = lang;
    settings.currentLanguage = lang;
    await saveSettings();
    updateSelectedLanguageButton(lang);
    updateCustomLabelText();
    toggleTextSpacesVisibility();
    updateUILanguageLabels();
    updateStoryName();
    applyThaiTextStyle();
    setTTSLanguage(lang);

    storyMessages = storyData[lang].messages;
    storyMain.innerHTML = '';

    if (optionContainer) optionContainer.innerHTML = '';
    if (nextBtn) {
      nextBtn.classList.add('disabled');
      nextBtn.disabled = true;
      nextBtn.onclick = null;
    }

    storyMessages.forEach((msg, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = `message ${msg.type}`;
      wrapper.id = `debug-message-${msg.id}-${i}`;

      if (msg.type === 'narration') {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = showText
          ? `<span class="tts-narration" data-id="${msg.id}">
               <img src="assets/svg/1F4E2.svg" alt="Speak" />
             </span>
             <span class="narration-text">${preprocessStoryText(msg.text)}</span>`
          : `<span class="tts-narration" data-id="${msg.id}">
               <img src="assets/svg/1F4E2.svg" alt="Speak" />
             </span>
             <span class="hidden-tts">${preprocessStoryText(msg.text)}</span><span class="narration-text">. . .</span>`;
        wrapper.appendChild(bubble);
      } else if (msg.type === 'speaker') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji tts-avatar" data-id="${msg.id}">
          ${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}
          </div>
          <div class="name">${msg.character.name}</div>
        `;

        const bubble = document.createElement('div');
        bubble.className = 'bubble left';
        bubble.innerHTML = showText
          ? preprocessStoryText(msg.text)
          : `<span class="hidden-tts">${preprocessStoryText(msg.text)}</span><span class="dots">. . .</span>`;

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
      } else if (msg.type === 'user') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji tts-avatar" data-id="${msg.id}">
          ${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}
          </div>
          <div class="name">${msg.character.name}</div>
        `;

        const bubble = document.createElement('div');
        bubble.className = 'bubble right';
        bubble.innerHTML = showText
          ? preprocessStoryText(msg.text)
          : `<span class="hidden-tts">${preprocessStoryText(msg.text)}</span><span class="dots">. . .</span>`;

        wrapper.appendChild(bubble);
        wrapper.appendChild(avatar);
      }

      storyMain.appendChild(wrapper);
    });

    document.querySelectorAll('.word').forEach(wordEl => {
      wordEl.addEventListener('click', () => {
        const wordIds = wordEl.getAttribute('data-word-id');

        if (wordIds) {
          currentWord = wordIds.split(' ');
        } else {
          currentWord = null;
        }

        document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
        wordEl.classList.add('highlight');

        speakText(wordEl.innerText, { enableHighlight: false });
      });
    });

    document.querySelectorAll('.tts-avatar').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const msg = storyMessages.find(m => m.id == id);
        if (!msg) return;

        const bubble = el.closest('.message')?.querySelector('.bubble');
        if (bubble) {
          const cleanText = preprocessStoryText(msg.text, true);
          speakText(cleanText, {
            enableHighlight: showText,
            messageId: msg.id,
            bubble
          });
        }

        el.classList.remove('rotate-shake');
        void el.offsetWidth;
        el.classList.add('rotate-shake');
      });
    });

    document.querySelectorAll('.tts-narration').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const msg = storyMessages.find(m => m.id == id);
        if (!msg) return;

        const bubble = el.closest('.message')?.querySelector('.bubble');
        if (bubble) {
          const cleanText = preprocessStoryText(msg.text, true);
          speakText(cleanText, {
            enableHighlight: showText,
            messageId: msg.id,
            bubble
          });
        }

        const icon = el.querySelector('img');
        if (icon) {
          icon.classList.remove('rotate-shake');
          void icon.offsetWidth;
          icon.classList.add('rotate-shake');
        }
      });
    });

    console.log(`[Debug] Rendered all ${storyMessages.length} messages for language: ${lang}`);
  }

  window.debugRenderAllStoryMessages = debugRenderAllStoryMessages;
  
  function rebuildConversation(skipScroll = false) {
    const langData = storyData[currentLanguage];
    if (!langData) return;

    const container = getStoryScrollContainer();

    const oldIndex =
      conversationHistory.lastIndexOf(currentMessageId);

    const oldMessage = document.getElementById(
      `message-${currentMessageId}-${oldIndex}`
    );

    let oldOffset = null;

    if (container && oldMessage) {
      oldOffset =
        oldMessage.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
    }

    updateStoryName();
    storyMessages = langData.messages;

    const validMessages = [];

    for (const id of conversationHistory) {
      const msg = storyMessages.find(
        m => String(m.id) === String(id)
      );

      if (msg) {
        validMessages.push(msg.id);
      }
    }

    if (validMessages.length > 0) {
      conversationHistory = validMessages;
      currentMessageId =
        validMessages[validMessages.length - 1];
    } else {
      conversationHistory = [storyMessages[0].id];
      currentMessageId = storyMessages[0].id;
    }

    renderConversation(true);

    if (skipScroll || oldOffset === null || !container) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newIndex =
          conversationHistory.lastIndexOf(currentMessageId);

        const newMessage = document.getElementById(
          `message-${currentMessageId}-${newIndex}`
        );

        if (!newMessage) return;

        const newOffset =
          newMessage.getBoundingClientRect().top -
          container.getBoundingClientRect().top;

        container.scrollTop += newOffset - oldOffset;
      });
    });
  }

  function scrollToMessage() {
    const container = getStoryScrollContainer();
    const index = conversationHistory.lastIndexOf(currentMessageId);
    const lastMsg = document.getElementById(
      `message-${currentMessageId}-${index}`
    );

    if (!container || !lastMsg) return;

    const containerRect = container.getBoundingClientRect();
    const messageRect = lastMsg.getBoundingClientRect();

    const targetTop =
      container.scrollTop +
      messageRect.top -
      containerRect.top -
      10;

    container.scrollTo({
      top: targetTop,
      behavior: 'instant'
    });
  }

  function populateLanguageMenuFromStory(jsonData) {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.innerHTML = ''; // Clear previous items
  
    const betaLanguages = ['de', 'is', 'th', 'ja', 'ko'];
    const normalLangs = [];
    const betaLangs = [];
  
    Object.entries(jsonData).forEach(([langCode, langInfo]) => {
      const languageName = langInfo.languageName || langCode;
  
      const button = document.createElement('button');
      button.className = 'language-btn';
      button.setAttribute('data-lang', langCode);
      button.textContent = languageName;
  
      if (langCode === currentLanguage) {
        button.classList.add('selected');
      }
  
      button.onclick = async () => {
        previousLanguage = currentLanguage;
        currentLanguage = langCode;
        settings.currentLanguage = langCode;
        await saveSettings();
        updateSelectedLanguageButton(langCode);
        updateCustomLabelText();
        setTTSLanguage(langCode);
        refreshAvailableVoices();
        updateUILanguageLabels();
        toggleTextSpacesVisibility();
        rebuildConversation(false);
      };
  
      if (betaLanguages.includes(langCode)) {
        betaLangs.push(button);
      } else {
        normalLangs.push(button);
      }
    });
  
    // Append normal languages
    normalLangs.forEach(btn => dropdown.appendChild(btn));
  
    // Remove border from last normal language button (if beta section exists)
    if (betaLangs.length > 0 && normalLangs.length > 0) {
      const lastNormalBtn = normalLangs[normalLangs.length - 1];
      lastNormalBtn.style.borderBottom = 'none';
    }
  
    // Add separator + beta languages
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
  
    updateSelectedLanguageButton(currentLanguage);
    updateUILanguageLabels();
  }
  
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
    
        // ✅ Remove highlights from all buttons
        const buttons = document.querySelectorAll(".dropbtn.active");
        buttons.forEach(btn => btn.classList.remove("active"));
      }
    };
    
    document.querySelector('.dropdown-content').addEventListener('click', (event) => {
        event.stopPropagation();
    });
