// === Global Setup ===
let currentLanguage = localStorage.getItem('currentLanguage') || 'en';
let previousLanguage = currentLanguage;
let currentVoice = null;
let ttsEnabled = false;
let voicesInitialized = false;
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
  
    const storyData = await loadStoryJson(storyKey);
    if (!storyData) return;
  
    const langData = storyData[currentLanguage];
    if (!langData) {
      console.warn(`Language ${currentLanguage} not found`);
      return;
    }
  
    storyMessages = langData.messages;
    currentMessageId = storyMessages[0].id;
    conversationHistory.push(currentMessageId);
  
    renderConversation();
  
    // ✅ Show the container now
    document.body.classList.add('content-ready');
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
      bubble.textContent = msg.text;
      wrapper.appendChild(bubble);
    } else if (msg.type === 'speaker') {
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.innerHTML = `
        <div class="emoji">${msg.character.emoji}</div>
        <div class="name">${msg.character.name}</div>
      `;

      const bubble = document.createElement('div');
      bubble.className = 'bubble left';
      bubble.textContent = msg.text;

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
    } else if (msg.type === 'user') {
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.innerHTML = `
        <div class="emoji">${msg.character.emoji}</div>
        <div class="name">${msg.character.name}</div>
      `;

      const bubble = document.createElement('div');
      bubble.className = 'bubble right';
      bubble.textContent = msg.text;

      wrapper.appendChild(bubble);
      wrapper.appendChild(avatar);
    }

    storyMain.appendChild(wrapper);
  });

// ✅ Footer logic for next + options
const current = storyMessages.find(m => m.id === currentMessageId);
const nextBtn = document.getElementById('nextBtn');
const optionContainer = document.getElementById('optionButtons');

// Always reset state first
nextBtn.classList.remove('disabled');
nextBtn.disabled = false;
optionContainer.innerHTML = '';

// ✅ Case 1: If options exist, disable "next" and show choices
if (current.options && current.options.length > 0) {
    nextBtn.classList.add('disabled');
    nextBtn.disabled = true;
    nextBtn.onclick = null; // ✅ prevent accidental click from lingering
  
    current.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.emoji;
      btn.onclick = () => {
        currentMessageId = opt.nextMessageId;
        conversationHistory.push(currentMessageId);
        renderConversation(/* skipAutoAdvance = true */);
      };
    optionContainer.appendChild(btn);
    });

// ✅ Case 2: Final message (no nextMessageId)
} else if (!current.nextMessageId) {
    nextBtn.innerHTML = `<img src="https://openmoji.org/data/color/svg/E201.svg" alt="Exit" />`;
    nextBtn.onclick = () => {
      window.location.href = 'index.html';
    };
  
    // 🎉 Trigger confetti for final message
    jsConfetti.addConfetti({
      emojis: ['🎉', '🥳', '✨', '🎈', '🌟'],
      confettiRadius: 4,
      confettiNumber: 80,
    });  

// ✅ Case 3: Normal next message
} else {
  nextBtn.innerHTML = `<img src="https://openmoji.org/data/color/svg/23E9.svg" alt="Next" />`;
  nextBtn.onclick = () => {
    currentMessageId = current.nextMessageId;
    conversationHistory.push(currentMessageId);
    renderConversation();
  };
}

scrollToMessage();
}

function scrollToMessage() {
    const container = document.getElementById('story-content');
    if (!container) return;
  
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }
