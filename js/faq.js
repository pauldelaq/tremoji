// Function to highlight currently selected language
function updateSelectedLanguageButton(lang) {
    const buttons = document.querySelectorAll('.language-btn');

    // Remove 'selected' class from all buttons
    buttons.forEach(button => {
        button.classList.remove('selected');
    });

    // Find the button that corresponds to the selected language and add the 'selected' class
    const selectedButton = [...buttons].find(button => button.getAttribute('data-lang') === lang);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const dropdown = document.querySelector('.dropdown');
    const dropbtn = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');

    dropbtn.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    // Function to get the language from localStorage
    function getStoredLanguage() {
        return localStorage.getItem('currentLanguage') || 'en'; // Default to 'en' if no language stored
    }

    // Function to update the page content based on the current language
    const updateLanguage = async (lang) => {
        try {
            const response = await fetch('data/faq.json'); // Fetch the JSON file from data/faq.json
            if (!response.ok) {
                throw new Error('Failed to fetch translations data');
            }
            const data = await response.json(); // Parse JSON response
            const translations = data.translations;

            console.log('Translations:', translations); // Log the translations object
            const currentLang = translations[lang];
            if (currentLang) {
                document.getElementById('faq-title').textContent = currentLang.title;

                const faqContainer = document.getElementById('faqs');
                faqContainer.innerHTML = ''; // Clear existing content

                currentLang.faqs.forEach((faq, index) => {
                    const faqItem = document.createElement('div');
                    faqItem.classList.add('faq-item');

                    const questionElement = document.createElement('h2');
                    questionElement.textContent = faq.question;

                    const answerElement = document.createElement('p');
                    answerElement.innerHTML = faq.answer;

                    faqItem.appendChild(questionElement);
                    faqItem.appendChild(answerElement);

                    faqContainer.appendChild(faqItem);
                });

                // Update keyboard shortcuts
                const shortcutsList = document.getElementById('shortcuts-list');
                shortcutsList.innerHTML = ''; // Clear existing content

                currentLang.shortcuts.forEach(shortcut => {
                    const shortcutItem = document.createElement('div');
                    shortcutItem.classList.add('shortcut');

                    const shortcutKey = document.createElement('div');
                    shortcutKey.classList.add('shortcut-key');
                    shortcutKey.textContent = shortcut.key;

                    const shortcutDescription = document.createElement('div');
                    shortcutDescription.classList.add('shortcut-description');
                    shortcutDescription.textContent = shortcut.action;

                    shortcutItem.appendChild(shortcutKey);
                    shortcutItem.appendChild(shortcutDescription);

                    shortcutsList.appendChild(shortcutItem);
                });

                // Update keyboard shortcuts heading
                const keyboardShortcutsHeading = document.getElementById('keyboard-shortcuts-heading');
                if (keyboardShortcutsHeading) {
                    keyboardShortcutsHeading.textContent = currentLang.keyboardShortcutsHeading;
                } else {
                    console.error('Keyboard shortcuts heading element not found');
                }

            // Update tutorial videos
            const tutorialVideosSection = document.getElementById('videos-list');
            tutorialVideosSection.innerHTML = ''; // Clear existing content

            if (currentLang.tutorialVideos) {
                // Create or update the heading for tutorial videos
                let tutorialHeading = document.getElementById('tutorial-videos-heading');
                if (!tutorialHeading) {
                    tutorialHeading = document.createElement('h2');
                    tutorialHeading.id = 'tutorial-videos-heading'; // Assign an ID to the heading
                    tutorialVideosSection.appendChild(tutorialHeading);
                }

                // Update the text content of the heading with the translated version
                tutorialHeading.textContent = currentLang.tutorialVideos.heading;

                // Create or update the message below the heading
                let tutorialMessage = document.getElementById('tutorial-videos-message');
                if (!tutorialMessage) {
                    tutorialMessage = document.createElement('p');
                    tutorialMessage.id = 'tutorial-videos-message'; // Assign an ID to the message
                    tutorialVideosSection.appendChild(tutorialMessage);
                }

                // Update the text content of the message with the translated version
                tutorialMessage.textContent = currentLang.tutorialVideos.message;

                // Now add the videos
                currentLang.tutorialVideos.videos.forEach(video => {
                    const videoTitle = document.createElement('h3');
                    videoTitle.textContent = video.title;
                    tutorialVideosSection.appendChild(videoTitle);

                    const videoElement = document.createElement('iframe');
                    videoElement.width = "315";
                    videoElement.height = "315";
                    videoElement.src = video.url;
                    videoElement.title = video.title;
                    videoElement.frameBorder = "0";
                    videoElement.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                    videoElement.allowFullscreen = true;
                    videoElement.referrerPolicy = "strict-origin-when-cross-origin";

                    tutorialVideosSection.appendChild(videoElement);
                });
            }
                            
            } else {
                console.error(`No data found for language: ${lang}`);
                console.log('Available languages:', Object.keys(translations)); // Log available languages
            }
        } catch (error) {
            console.error('Error fetching or parsing translations data:', error);
        }
    };

    // Populate the language dropdown
    const populateLanguageDropdown = async () => {
        try {
            const response = await fetch('data/faq.json'); // Fetch the JSON file from data/faq.json
            if (!response.ok) {
                throw new Error('Failed to fetch translations data');
            }
            const data = await response.json(); // Parse JSON response
            const translations = data.translations;

            console.log('Translations:', translations); // Log the translations object

            dropdownContent.innerHTML = '';  // Clear the dropdown content first

            for (const lang in translations) {
                const button = document.createElement('button');
                button.className = 'language-btn';  // Apply the CSS class for styling
                button.type = 'button';  // Specify that this is a button element
                button.setAttribute('data-lang', lang); // Set the data-lang attribute
                button.textContent = translations[lang].name; // Assuming each translation object has a `name` property
                dropdownContent.appendChild(button);

                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    const lang = event.target.getAttribute('data-lang');
                    localStorage.setItem('currentLanguage', lang); // Store language in localStorage
                    updateLanguage(lang);
                    updateSelectedLanguageButton(lang); // Highlight the selected language
                    dropdownContent.classList.remove('show'); // Close the dropdown menu after language change
                });
            }

            // Highlight the selected language on page load
            const storedLang = getStoredLanguage(); // Get the stored language
            updateSelectedLanguageButton(storedLang); // Highlight the stored language
        } catch (error) {
            console.error('Error fetching or parsing translations data:', error);
        }
    };

    // Initialize with language from localStorage or default to 'en'
    const lang = getStoredLanguage();
    updateLanguage(lang);
    populateLanguageDropdown(); // Populate the dropdown after fetching translations
});

// Add event listener to the Header text
document.addEventListener('DOMContentLoaded', function() {
    const headerTitle = document.getElementById('header-title');

    if (headerTitle) {
        headerTitle.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
});