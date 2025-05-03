// === Global Setup ===
let currentLanguage = localStorage.getItem('currentLanguage') || 'en';
let previousLanguage = currentLanguage;
let currentVoice = null;
let ttsEnabled = false;
let voicesInitialized = false;
let lastOptions = null;
let selectedOption = null;
let storyData = {};
let showSvg = JSON.parse(localStorage.getItem('showSvg')) || false;
let showClues = JSON.parse(localStorage.getItem('showClues')) ?? true;
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

function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');
    buttons.forEach(btn => {
      const isSelected = btn.dataset.lang === lang;
      btn.classList.toggle('selected', isSelected);
    });
  }  

  function populateLanguageMenuFromStory(jsonData) {
    const dropdown = document.getElementById('languageDropdown'); // ✅ CORRECTED ID
    dropdown.innerHTML = ''; // Clear previous items
  
    Object.keys(jsonData).forEach(langCode => {
      const langInfo = jsonData[langCode];
      const button = document.createElement('button');
      button.className = 'language-btn';
      button.setAttribute('data-lang', langCode);
      button.textContent = langInfo.languageName || langCode;
  
      button.onclick = () => {
        currentLanguage = langCode;
        localStorage.setItem('currentLanguage', langCode);
        updateSelectedLanguageButton(langCode);
        rebuildConversation();
      };
  
      dropdown.appendChild(button);
    });
  
    updateSelectedLanguageButton(currentLanguage);
  }
  
// === Language Switching ===
function changeLanguage(lang) {
  previousLanguage = currentLanguage;
  currentLanguage = lang;
  localStorage.setItem('currentLanguage', lang);
  updateSelectedLanguageButton(lang);
  updateCustomLabelText();
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
  updateCustomLabelText();
  refreshAvailableVoices();
  setTTSLanguage(currentLanguage);
  toggleDropdown('languageDropdown');
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
    // [UL]... [ENDUL] → springgreen styling
    text = text.replace(/\[UL\](.+?)\[ENDUL\]/g, (_, inner) => {
      return `<span style="color: springgreen;">${inner}</span>`;
    });
  
    // <span class='emoji'>...</span> → convert content to SVG
    if (showSvg) {
      text = text.replace(/<span class=['"]emoji['"]>(.*?)<\/span>/g, (_, emojiChar) => {
        return convertEmojiToSvg(emojiChar);
      });
    }
  
    return text;
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
        localStorage.setItem('selectedVoice', voice.name);
        document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      if (voice.name === localStorage.getItem('selectedVoice')) {
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
  const voices = speechSynthesis.getVoices();
  const storedVoiceName = localStorage.getItem('selectedVoice');
  currentVoice = voices.find(voice => voice.lang.startsWith(lang) && voice.name === storedVoiceName);
  ttsEnabled = !!currentVoice;
}

// === Speak a message (for now, just raw text) ===
function speakText(text) {
  if (!ttsEnabled || !currentVoice) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = currentVoice;
  utterance.rate = 1.0;
  utterance.volume = 1.0;
  speechSynthesis.speak(utterance);
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

// === On Page Load ===
document.addEventListener('DOMContentLoaded', async () => {
    updateCustomLabelText();
    refreshAvailableVoices();
    setTTSLanguage(currentLanguage);
    updateSelectedLanguageButton(currentLanguage);

    const svgSwitch = document.getElementById('svgSwitch');
    if (svgSwitch) {
      svgSwitch.checked = showSvg;
    
      svgSwitch.addEventListener('change', () => {
        showSvg = svgSwitch.checked;
        localStorage.setItem('showSvg', JSON.stringify(showSvg));
        renderConversation(); // Re-render with updated emoji display
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
        } else   if (event.key === 'ArrowUp') {
            const emojiSwitch = document.getElementById('emojiSwitch');
            if (emojiSwitch) {
              emojiSwitch.checked = !emojiSwitch.checked;
              emojiSwitch.dispatchEvent(new Event('change'));
            }
        } else if (event.key === 'ArrowDown') {
                switchToPreviousLanguage();
        } else if (event.key === 's') {
            const svgSwitch = document.getElementById('svgSwitch');
            if (svgSwitch) {
              svgSwitch.checked = !svgSwitch.checked;
              svgSwitch.dispatchEvent(new Event('change'));
            }
        } else if (event.key === 'Shift') {
                toggleShowText();
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
        bubble.innerHTML = preprocessStoryText(msg.text); // 🟢 Now supports emojis and [UL]
        wrapper.appendChild(bubble);
      } else if (msg.type === 'speaker') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji">${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}</div>
          <div class="name">${msg.character.name}</div>
        `;
  
        const bubble = document.createElement('div');
        bubble.className = 'bubble left';
        bubble.innerHTML = preprocessStoryText(msg.text); // 🟢
  
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
      } else if (msg.type === 'user') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `
          <div class="emoji">${showSvg ? convertEmojiToSvg(msg.character.emoji) : msg.character.emoji}</div>
          <div class="name">${msg.character.name}</div>
        `;
  
        const bubble = document.createElement('div');
        bubble.className = 'bubble right';
        bubble.innerHTML = preprocessStoryText(msg.text); // 🟢
  
        wrapper.appendChild(bubble);
        wrapper.appendChild(avatar);
      }
  
      storyMain.appendChild(wrapper);
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
  
      jsConfetti.addConfetti({
        emojis: ['🎉', '🥳', '✨', '🎈', '🌟'],
        confettiRadius: 4,
        confettiNumber: 80,
      });
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
  }
  
function rebuildConversation() {
    const langData = storyData[currentLanguage];
    if (!langData) return;
  
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
      currentLanguage = langCode;
      localStorage.setItem('currentLanguage', langCode);
      updateSelectedLanguageButton(langCode);
      rebuildConversation(); // Re-render based on the selected language
    };

    dropdown.appendChild(button);
  });

  updateSelectedLanguageButton(currentLanguage); // Highlight current
}
