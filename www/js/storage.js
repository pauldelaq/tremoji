const TR_EMOJI_SETTINGS_KEY = 'trEmoji.settings';
const TR_EMOJI_PROGRESS_KEY = 'trEmoji.progress';

const nativePreferences =
    window.Capacitor?.isNativePlatform?.() === true
        ? window.Capacitor.Plugins?.Preferences
        : null;

const defaultSettings = {
    currentLanguage: 'en',
    showClues: false,
    showText: true,
    showSvg: false,
    fontSize: '18',
    isTextSpacesEnabled: false,
    ttsSpeed: '1.0',
    ttsVolume: '1',
    selectedVoices: {},
    difficulty: 'easy',
    sayWordAutoAdvance: false,
    flashcardsShowSentence: true,
    flashcardsCardsForReview: 'some'
};

let settings = {
    ...defaultSettings
};

const defaultProgress = {
    answerLogs: {},
    categoryCompletion: {},
    storyCompletion: {}
};

let progress = {
    ...defaultProgress
};

function parseStoredObject(value, defaults) {
    if (!value) {
        return { ...defaults };
    }

    try {
        return {
            ...defaults,
            ...JSON.parse(value)
        };
    } catch (error) {
        console.error('Failed to parse stored Tr.emoji data:', error);
        return { ...defaults };
    }
}

async function initializeStorage() {
    if (nativePreferences) {
        const [storedSettings, storedProgress] = await Promise.all([
            nativePreferences.get({
                key: TR_EMOJI_SETTINGS_KEY
            }),
            nativePreferences.get({
                key: TR_EMOJI_PROGRESS_KEY
            })
        ]);

        Object.assign(
            settings,
            parseStoredObject(
                storedSettings.value,
                defaultSettings
            )
        );

        Object.assign(
            progress,
            parseStoredObject(
                storedProgress.value,
                defaultProgress
            )
        );

        return;
    }

    Object.assign(
        settings,
        parseStoredObject(
            localStorage.getItem(TR_EMOJI_SETTINGS_KEY),
            defaultSettings
        )
    );

    Object.assign(
        progress,
        parseStoredObject(
            localStorage.getItem(TR_EMOJI_PROGRESS_KEY),
            defaultProgress
        )
    );
}

async function saveSettings() {
    const value = JSON.stringify(settings);

    if (nativePreferences) {
        await nativePreferences.set({
            key: TR_EMOJI_SETTINGS_KEY,
            value
        });

        return;
    }

    localStorage.setItem(
        TR_EMOJI_SETTINGS_KEY,
        value
    );
}

async function saveProgress() {
    const value = JSON.stringify(progress);

    if (nativePreferences) {
        await nativePreferences.set({
            key: TR_EMOJI_PROGRESS_KEY,
            value
        });

        return;
    }

    localStorage.setItem(
        TR_EMOJI_PROGRESS_KEY,
        value
    );
}