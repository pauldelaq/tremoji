// === Global Setup ===
let currentLanguage = localStorage.getItem('currentLanguage') || 'en';
let previousLanguage = currentLanguage;
let currentVoice = null;
let ttsEnabled = false;
let voicesInitialized = false;
let lastOptions = null;
let selectedOption = null;
let storyData = {};
let commonData = {};
let confettiPlayed = false;
let showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
let showClues = JSON.parse(localStorage.getItem('showClues')) ?? true;
let showText = JSON.parse(localStorage.getItem('showText')) ?? true;
const jsConfetti = new JSConfetti();

// === Dropdown Toggle ===
function toggleDropdown(id) {
  const dropdowns = document.getElementsByClassName("dropdown-content");
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].classList.contains("show") && dropdowns[i].id !== id) {
      dropdowns[i].classList.remove("show");
    }
  }
  const dropdown = document.getElementById(id);
  dropdown.classList.toggle("show");
}

function getCleanTextForTTS(html) {
  let cleaned = html;

  // Thai-specific cleanup
  if (currentLanguage === 'th') {
    // Strip invisible Unicode characters
    cleaned = cleaned.replace(/[\uFE0F\u200D]/g, '');

    // Add pause after reduplication character
    cleaned = cleaned.replace(/ๆ\s/g, 'ๆ. ');

    // Handle spacing
    const isTextSpacesEnabled = JSON.parse(localStorage.getItem('isTextSpacesEnabled')) || false;
    if (isTextSpacesEnabled) {
      cleaned = cleaned.replace(/ {2,}/g, '␣').replace(/ +/g, '').replace(/␣/g, ' ');
    } else {
      cleaned = cleaned.replace(/\s+/g, ' ');
    }
  }

  // Global cleanup (for all languages)
  cleaned = cleaned.replace(/\[(UL|ENDUL|BR)\]/gi, '');

  // ✅ FIRST: Remove emoji spans completely (including their content)
  cleaned = cleaned.replace(/<span[^>]*class=['"]emoji['"][^>]*>.*?<\/span>/gi, '');

  // ✅ THEN: Remove all other <span> tags (but keep their content)
  cleaned = cleaned.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  // ✅ THEN: Remove any <img> emoji SVGs
  cleaned = cleaned.replace(/<img[^>]*class=['"]?emoji['"]?[^>]*>/gi, '');
  
  // Strip all remaining HTML safely
  const temp = document.createElement('div');
  temp.innerHTML = cleaned;
  return temp.textContent || temp.innerText || '';
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
  
    return `<span class="emoji"><img src="https://openmoji.org/data/color/svg/${emojiCode}.svg" style="height: 1.5em;" alt="${emoji}"></span>`;
}  

function toggleShowText() {
  showText = !showText;
  localStorage.setItem('showText', JSON.stringify(showText));

  const textSwitch = document.getElementById('textSwitch');
  if (textSwitch) textSwitch.checked = showText;

  renderConversation();
}

function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');
    buttons.forEach(btn => {
      const isSelected = btn.dataset.lang === lang;
      btn.classList.toggle('selected', isSelected);
    });
  }  
  
// === Language Switching ===
function changeLanguage(lang) {
  previousLanguage = currentLanguage;
  currentLanguage = lang;
  localStorage.setItem('currentLanguage', lang);
  updateSelectedLanguageButton(lang);
  updateCustomLabelText();
  updateUILanguageLabels();
  refreshAvailableVoices();
  setTTSLanguage(lang);
  toggleDropdown('languageDropdown');
}

function switchToPreviousLanguage() {
  const temp = currentLanguage;
  currentLanguage = previousLanguage;
  previousLanguage = temp;

  localStorage.setItem('currentLanguage', currentLanguage);

  updateSelectedLanguageButton(currentLanguage);
  updateUILanguageLabels();
  updateCustomLabelText();
  toggleTextSpacesVisibility();
  updateStoryName();
  refreshAvailableVoices();
  setTTSLanguage(currentLanguage);
  rebuildConversation();
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
      <img src="https://openmoji.org/data/black/svg/27A1.svg" width="20" height="20">
      <br>
      <span style="display:inline-block; margin-left: 40px;">แยก คำ</span>
    `;
  } else {
    label.innerHTML = `
      文字 
      <img src="https://openmoji.org/data/black/svg/27A1.svg" width="20" height="20">
      文 字
    `;
  }
}

function preprocessStoryText(text) {
  // [BR] → line break
  text = text.replace(/\[BR\]/gi, '<br>');

  // Replace <span class="emoji">...</span> with SVGs if showSvg is active
  if (showSvg) {
    text = text.replace(/<span class=['"]emoji['"]>(.*?)<\/span>/g, (_, emojiChar) => {
      return convertEmojiToSvg(emojiChar);
    });
  }

  // Determine language spacing settings
  const isAsianLanguage = ['zh-CN', 'zh-TW', 'ja', 'th'].includes(currentLanguage);
  const isTextSpacesEnabled = JSON.parse(localStorage.getItem('isTextSpacesEnabled')) || false;

  // Wrap individual words
  text = wrapWordsInSpans(text, isAsianLanguage, isTextSpacesEnabled);

  // Apply [UL]... [ENDUL] styling after spans have been added
  text = text.replace(/\[UL\](.+?)\[ENDUL\]/g, (_, inner) => {
    return `<span style="color: springgreen;">${inner}</span>`;
  });

  return text;
}

function wrapWordsInSpans(text, isAsianLanguage, addSpaces = false) {
  let wordIndex = 0;

  if (isAsianLanguage) {
    const spacePlaceholder = '␣';
    let modifiedText = text.replace(/\s{2}/g, ` ${spacePlaceholder} `);

    modifiedText = modifiedText.split(/(<span class='emoji'>[^<]+<\/span>|\{[^}]*\})/g).map(part => {
        if (!part) return '';

        // Preserve emoji spans
        if (part.match(/^<span class='emoji'>[^<]+<\/span>$/)) return part;

        // Preserve raw {...} blocks and wrap as-is
        if (part.match(/^\{[^}]*\}$/)) {
          const raw = part.slice(1, -1);
          
          // If it's only a space (regular or full-width), return it directly
          if (/^[\s\u3000]+$/.test(raw)) {
              return raw;
          }
      
          // Otherwise, wrap normally
          return `<span id="word-${wordIndex++}" class='word'>${raw}</span>`;
      }
      
        // Process all other space-separated words
        return part.split(' ').map(word => {
            if (word.trim()) {
                let match = word.match(/^(.+?)(\d+(_\d+)*)$/);
                let cleanWord = match ? match[1] : word;
                let wordIds = match ? match[2].split('_') : [];
                let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';
                return `<span id="word-${wordIndex++}" class='word' ${dataWordId}>${cleanWord}</span>`;
            }
            return addSpaces ? ' ' : '';
        }).join(addSpaces ? ' ' : '');
    }).join('');

    modifiedText = modifiedText.replace(new RegExp(` ${spacePlaceholder} `, 'g'), '  ');
    return modifiedText.replace(new RegExp(spacePlaceholder, 'g'), ' ');
} else {
      return text.replace(/(<span class='emoji'>[^<]+<\/span>)|(\{[^}]+\}|\S+)/g, (match, emoji, word) => {
          if (emoji) return emoji;
          if (word) {
              if (word.startsWith('{') && word.endsWith('}')) {
                  const rawWord = word.slice(1, -1);
                  return `<span id="word-${wordIndex++}" class='word'>${rawWord}</span>`;
              }
              let match = word.match(/^(.+?)(\d+(_\d+)*)$/);
              let cleanWord = match ? match[1] : word;
              let wordIds = match ? match[2].split('_') : [];
              let dataWordId = wordIds.length ? `data-word-id="${wordIds.join(' ')}"` : '';
              return `<span id="word-${wordIndex++}" class='word' ${dataWordId}>${cleanWord}</span>`;
          }
      });
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
  const voiceContainer = document.getElementById('voiceOptions');
  if (!voiceContainer) return;

  const selectedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};

  voiceContainer.innerHTML = '';
  const langVoices = voices.filter(v => v.lang.startsWith(currentLanguage));
  if (langVoices.length > 0) {
    ttsEnabled = true;

    langVoices.forEach(voice => {
      const btn = document.createElement('button');
      btn.textContent = voice.name;
      btn.className = 'voice-btn';

      btn.onclick = () => {
        currentVoice = voice;
        selectedVoices[currentLanguage] = voice.name;
        localStorage.setItem('selectedVoices', JSON.stringify(selectedVoices));

        document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };

      if (selectedVoices[currentLanguage] === voice.name) {
        btn.classList.add('selected');
        currentVoice = voice;
      }

      voiceContainer.appendChild(btn);
    });
  } else {
    ttsEnabled = false;
    voiceContainer.innerHTML = "<p>No voices available for this language.</p>";
  }
}

function setTTSLanguage(lang) {
  const selectedVoices = JSON.parse(localStorage.getItem('selectedVoices')) || {};

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

function speakText(text) {
  if (!ttsEnabled || !currentVoice) return;

  console.log('🗣️ TTS input:', text); // ✅ DEBUG: see what's actually being spoken

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = currentVoice;
  utterance.rate = getTTSSpeed();
  utterance.volume = getTTSVolume();

  speechSynthesis.speak(utterance);
}

function playCurrentMessageTTS() {
  if (!currentMessageId) return;

  const msg = storyMessages.find(m => m.id === currentMessageId);
  if (!msg) return;

  const bubbleEl = document.querySelector(`#message-${msg.id} .bubble`);
  if (bubbleEl) {
    const cleanText = getCleanTextForTTS(bubbleEl.innerHTML);
    speakText(cleanText);
  }

  // Animation logic (leave unchanged)
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
  const minIcon = document.getElementById('volumeMinIcon');
  if (!minIcon) return;

  minIcon.src = volume == 0
      ? 'https://openmoji.org/data/color/svg/1F507.svg'
      : 'https://openmoji.org/data/color/svg/1F508.svg';
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  
  const storyKey = getQueryParam('story') || 'introduction';
  
  let storyMessages = [];
  let currentMessageId = null;
  let conversationHistory = [];
  
  async function loadStoryJson(storyKey) {
    const filePath = `data/stories/${storyKey}.json`;
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
    updateCustomLabelText();
    refreshAvailableVoices();
    setTTSLanguage(currentLanguage);

    // Load common.json
    try {
      const response = await fetch('data/common.json');
      if (!response.ok) throw new Error('Failed to load common.json');
      commonData = await response.json();
      console.log('commonData loaded:', commonData);
      localStorage.setItem('commonData', JSON.stringify(commonData));

      updateUILanguageLabels();
    } catch (err) {
      console.error('Error loading common.json:', err);
    }

    updateSelectedLanguageButton(currentLanguage);

    const volumeSlider = document.getElementById('volumeLevelSlider');
    const volumeMinIcon = document.getElementById('volumeMinIcon');
    const volumeMaxIcon = document.getElementById('volumeMaxIcon');
    
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
        volumeSlider.addEventListener('input', () => {
            localStorage.setItem('ttsVolume', volumeSlider.value);
            updateSpeakerIcon(parseFloat(volumeSlider.value));
        });
    
        const savedVolume = localStorage.getItem('ttsVolume');
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
            updateSpeakerIcon(parseFloat(savedVolume));
        }
    }
    
    const speedSlider = document.getElementById('TTSSpeedSlider');
    if (speedSlider) {
        speedSlider.addEventListener('input', () => {
            localStorage.setItem('ttsSpeed', speedSlider.value);
        });
    
        const savedSpeed = localStorage.getItem('ttsSpeed');
        if (savedSpeed !== null) {
            speedSlider.value = savedSpeed;
        }
    }    

    const svgSwitch = document.getElementById('svgSwitch');
    if (svgSwitch) {
      svgSwitch.checked = showSvg;
    
      svgSwitch.addEventListener('change', () => {
        showSvg = svgSwitch.checked;
        localStorage.setItem('showSvg', JSON.stringify(showSvg));
        renderConversation(); // Re-render with updated emoji display
      });
    }    

    const textSwitch = document.getElementById('textSwitch');
    if (textSwitch) {
      textSwitch.checked = showText;
    
      textSwitch.addEventListener('change', () => {
        showText = textSwitch.checked;
        localStorage.setItem('showText', JSON.stringify(showText));
        renderConversation(); // re-render all messages
      });
    }    

    const emojiSwitch = document.getElementById('emojiSwitch');
    if (emojiSwitch) {
      emojiSwitch.checked = showClues;
    
      emojiSwitch.addEventListener('change', () => {
        showClues = emojiSwitch.checked;
        localStorage.setItem('showClues', JSON.stringify(showClues));
        updateClueVisibility();
      });
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
        }
    };

    document.querySelector('.dropdown-content').addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // ✅ Font Size: Load from localStorage and apply
    const storedFontSize = localStorage.getItem('fontSize') || '16';
    document.getElementById('fontSizeSlider').value = storedFontSize;
    document.documentElement.style.setProperty('--font-size', `${storedFontSize}px`);
  
    storyData = await loadStoryJson(storyKey);
    if (!storyData) return;

    updateStoryName();

    // ✅ Build the language dropdown menu dynamically
    populateLanguageMenuFromStory(storyData);
    
    // ✅ Fallback to a valid language if needed
    if (!storyData[currentLanguage]) {
      currentLanguage = Object.keys(storyData)[0];
      localStorage.setItem('currentLanguage', currentLanguage);
    }
    
    // ✅ Start the conversation from the beginning
    rebuildConversation();
    
    updateClueVisibility();

    // ✅ Show page content once everything is ready
    document.body.classList.add('content-ready');
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
          localStorage.removeItem('currentWord');
      }
  });  

document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    const size = e.target.value;
    localStorage.setItem('fontSize', size);
    document.documentElement.style.setProperty('--font-size', `${size}px`);
  });  

  function renderConversation(skipAutoAdvance = false) {
    const storyMain = document.getElementById('story-content');
    storyMain.innerHTML = '';
  
    conversationHistory.forEach(id => {
      const msg = storyMessages.find(m => m.id === id);
      const wrapper = document.createElement('div');
      wrapper.className = `message ${msg.type}`;
      wrapper.id = `message-${msg.id}`;
  
      if (msg.type === 'narration') {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = showText
        ? `<span class="tts-narration" data-id="${msg.id}">
             <img src="https://openmoji.org/data/color/svg/1F4E2.svg" alt="Speak" />
           </span>
           <span class="narration-text">${preprocessStoryText(msg.text)}</span>`
        : `<span class="tts-narration" data-id="${msg.id}">
             <img src="https://openmoji.org/data/color/svg/1F4E2.svg" alt="Speak" />
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
        bubble.innerHTML = showText ? preprocessStoryText(msg.text) : '. . .';
  
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
        bubble.innerHTML = showText ? preprocessStoryText(msg.text) : '. . .';
        
        wrapper.appendChild(bubble);
        wrapper.appendChild(avatar);
      }
  
      storyMain.appendChild(wrapper);
    });
  
    document.querySelectorAll('.word').forEach(wordEl => {
      wordEl.addEventListener('click', () => {
          const wordIds = wordEl.getAttribute('data-word-id');
  
          if (wordIds) {
              localStorage.setItem('currentWord', JSON.stringify(wordIds.split(' ')));
          } else {
              localStorage.removeItem('currentWord');
          }
  
          document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
          wordEl.classList.add('highlight');
  
          speakText(wordEl.innerText);
      });
  });
  

    // === Footer Logic (unchanged)
    const current = storyMessages.find(m => m.id === currentMessageId);
    const nextBtn = document.getElementById('nextBtn');
    const optionContainer = document.getElementById('optionButtons');
  
    nextBtn.classList.remove('disabled');
    nextBtn.disabled = false;
    optionContainer.innerHTML = '';
  
    if (current.options && current.options.length > 0) {
      lastOptions = current.options;
      selectedOption = null;
  
      nextBtn.classList.add('disabled');
      nextBtn.disabled = true;
      nextBtn.onclick = null;
  
      lastOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = showSvg ? convertEmojiToSvg(opt.emoji) : opt.emoji;
  
        btn.onclick = () => {
          currentMessageId = opt.nextMessageId;
          conversationHistory.push(currentMessageId);
          selectedOption = opt.emoji;
          renderConversation();
        };
  
        optionContainer.appendChild(btn);
      });
    } else if (lastOptions && current.type === 'user') {
        lastOptions.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.innerHTML = showSvg ? convertEmojiToSvg(opt.emoji) : opt.emoji;
          btn.disabled = true;
      
          if (selectedOption === opt.emoji) {
            btn.classList.add('selected-option');
          }
      
          optionContainer.appendChild(btn);
        });
      
        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;
        nextBtn.innerHTML = `<img src="https://openmoji.org/data/color/svg/23E9.svg" alt="Next" />`;
        nextBtn.onclick = () => {
          currentMessageId = current.nextMessageId;
          conversationHistory.push(currentMessageId);
      
          const nextMsg = storyMessages.find(m => m.id === currentMessageId);
          if (nextMsg?.options?.length) {
            lastOptions = null;
            selectedOption = null;
          }
      
          renderConversation();
        };
      } else if (!current.nextMessageId) {
        nextBtn.innerHTML = `<img src="https://openmoji.org/data/color/svg/E201.svg" alt="Exit" />`;
        nextBtn.onclick = () => {
          window.location.href = 'index.html';
        };
      
        if (!confettiPlayed) {
          confettiPlayed = true;
          jsConfetti.addConfetti({
            emojis: ['🎉', '🥳', '✨', '🎈', '🌟'],
            confettiRadius: 4,
            confettiNumber: 80,
          });
        }
        } else {
      nextBtn.innerHTML = `<img src="https://openmoji.org/data/color/svg/23E9.svg" alt="Next" />`;
      nextBtn.onclick = () => {
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
  
    scrollToMessage();

    // === TTS Click Handling ===
    document.querySelectorAll('.tts-avatar').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          const msg = storyMessages.find(m => m.id == id);
          if (msg) {
            const bubble = document.querySelector(`#message-${msg.id} .bubble`);
            if (bubble) speakText(getCleanTextForTTS(bubble.innerHTML));
          }
                
          // Apply shake animation
          el.classList.remove('rotate-shake'); // reset class
          void el.offsetWidth;          // force reflow
          el.classList.add('rotate-shake');
        });
      });
        
      document.querySelectorAll('.tts-narration').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          const msg = storyMessages.find(m => m.id == id);
          if (msg) {
            const bubble = document.querySelector(`#message-${msg.id} .bubble`);
            if (bubble) speakText(getCleanTextForTTS(bubble.innerHTML));
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
  
function rebuildConversation() {
  const langData = storyData[currentLanguage];
  if (!langData) return;

  updateStoryName();

  storyMessages = langData.messages;
  conversationHistory = [storyMessages[0].id];
  currentMessageId = storyMessages[0].id;

  renderConversation();
}
  
function scrollToMessage() {
    const container = document.getElementById('story-content');
    if (!container) return;
  
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }

function populateLanguageMenuFromStory(jsonData) {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.innerHTML = ''; // Clear previous items

  Object.keys(jsonData).forEach(langCode => {
    const langInfo = jsonData[langCode];
    const button = document.createElement('button');
    button.className = 'language-btn';
    button.setAttribute('data-lang', langCode);
    button.textContent = langInfo.languageName || langCode;

    button.onclick = () => {
      previousLanguage = currentLanguage;
      currentLanguage = langCode;
      localStorage.setItem('currentLanguage', langCode);
      updateSelectedLanguageButton(langCode);
      updateCustomLabelText();
      setTTSLanguage(langCode);
      refreshAvailableVoices();
      updateUILanguageLabels();
      toggleTextSpacesVisibility();
      rebuildConversation();
    };
    
    dropdown.appendChild(button);
  });

  updateSelectedLanguageButton(currentLanguage);
  updateUILanguageLabels();
}
