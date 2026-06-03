

const TR_EMOJI_SETTINGS_KEY = 'trEmoji.settings';

const defaultSettings = {
    currentLanguage: 'en',
    showClues: false,
    showText: true,
    showSvg: false,
    fontSize: '16',
    isTextSpacesEnabled: false,
    ttsSpeed: '1.0',
    ttsVolume: '1',
    selectedVoices: {},
    difficulty: 'easy',
    sayWordAutoAdvance: 'false',
    flashcardsShowSentence: 'true',
    flashcardsCardsForReview: 'some'
};

let settings = {
    ...defaultSettings,
    ...(JSON.parse(localStorage.getItem(TR_EMOJI_SETTINGS_KEY)) || {})
};

function saveSettings() {
    localStorage.setItem(
        TR_EMOJI_SETTINGS_KEY,
        JSON.stringify(settings)
    );
}