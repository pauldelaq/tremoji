// Load translations and update the page dynamically
document.addEventListener('DOMContentLoaded', async function () {
    const fetchTranslations = async (lang) => {
        try {
            const response = await fetch('data/survey.json');
            if (!response.ok) throw new Error('Failed to load translations');
            const data = await response.json();
            return data.translations[lang];
        } catch (error) {
            console.error('Error loading translations:', error);
            return null;
        }
    };

    const updatePageContent = (translations) => {
        if (!translations) return;

        // Update text content
        document.title = translations.title;
        document.getElementById('title').textContent = translations.title;
        document.getElementById('description').textContent = translations.description;

        // Update form labels and placeholders
        document.getElementById('name-label').textContent = translations.form.nameLabel;
        document.getElementById('name').placeholder = translations.form.namePlaceholder;
        document.getElementById('email-label').textContent = translations.form.emailLabel;
        document.getElementById('email').placeholder = translations.form.emailPlaceholder;
        document.getElementById('number-label').textContent = translations.form.ageLabel;
        document.getElementById('number').placeholder = translations.form.agePlaceholder;
        document.getElementById('role-label').textContent = translations.form.roleLabel;

        // Populate role dropdown with translated placeholder
        const dropdown = document.getElementById('dropdown');
        dropdown.innerHTML = ''; // Clear existing options
        const placeholderOption = document.createElement('option');
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        placeholderOption.value = '';
        placeholderOption.textContent = translations.form.rolePlaceholder; // Use translated placeholder
        dropdown.appendChild(placeholderOption);

        // Populate role options
        translations.form.roleOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            dropdown.appendChild(opt);
        });

        // Update languages section
        document.getElementById('languages-label').textContent = translations.form.languagesLabel;

        // Update recommendation section
        document.getElementById('recommendation-label').textContent = translations.form.recommendationLabel;
        const radioSection = document.querySelector('.radio-section');
        radioSection.innerHTML = ''; // Clear existing radios
        translations.form.recommendationOptions.forEach(option => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.name = 'recommendation';
            input.type = 'radio';
            input.value = option.value;
            input.className = 'radio';
            label.appendChild(input);
            label.append(option.text);
            radioSection.appendChild(label);
        });

        // Update comments section
        document.getElementById('comments-label').textContent = translations.form.commentsLabel;
        document.getElementById('comments').placeholder = translations.form.commentsPlaceholder;

        // Update submit button
        document.getElementById('submit').textContent = translations.form.submitButton;
    };

    const setLanguage = async (lang) => {
        const translations = await fetchTranslations(lang);
        updatePageContent(translations);
    };

    // Detect language from localStorage or default to English
    const storedLang = localStorage.getItem('currentLanguage') || 'en';
    await setLanguage(storedLang);

    // Dropdown menu functionality
    const dropdown = document.querySelector('.dropdown');
    const dropbtn = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('language-dropdown');

    // Toggle dropdown visibility
    dropbtn.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    // Populate language buttons in the dropdown
    const response = await fetch('data/survey.json');
    const data = await response.json();
    const translations = data.translations;

    dropdownContent.innerHTML = ''; // Clear existing content
    for (const lang in translations) {
        const langData = translations[lang];
        const button = document.createElement('button');
        button.className = 'language-btn';
        button.type = 'button';
        button.setAttribute('data-lang', lang);
        button.textContent = langData.name; // Use the "name" field
        dropdownContent.appendChild(button);

        button.addEventListener('click', async function () {
            const selectedLang = this.getAttribute('data-lang');
            localStorage.setItem('currentLanguage', selectedLang);
            await setLanguage(selectedLang);
            dropdownContent.classList.remove('show'); // Close the dropdown
        });
    }
});

// Event listener for form submission
document.getElementById('survey-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default redirection behavior

    const submitButton = document.getElementById('submit');
    submitButton.textContent = 'Thanks for the feedback!';
    submitButton.disabled = true;
    submitButton.style.backgroundColor = '#ccc'; // Optional: Change button color
    submitButton.style.cursor = 'not-allowed';

    // Collect form data
    const formData = new FormData(event.target);

    // Send form data to the Google Apps Script URL
    fetch('https://script.google.com/macros/s/AKfycbxZIOFRup9dXj8Wxx1QXLmK7ZVAfxyPHpU7ZLnXZPAvo6srq5_DWQPipkjCeCPjffar/exec', {
        method: 'POST',
        body: new URLSearchParams(formData), // Convert FormData to URL-encoded string
    })
        .then(response => {
            if (!response.ok) {
                alert('There was an issue submitting your feedback. Please try again.');
                submitButton.disabled = false; // Re-enable the button if submission fails
                submitButton.textContent = 'Submit';
                submitButton.style.backgroundColor = ''; // Reset to original color
                submitButton.style.cursor = 'pointer';
            }
        })
        .catch(error => {
            alert('Failed to submit feedback. Please check your connection and try again.');
            console.error(error);
            submitButton.disabled = false; // Re-enable the button if submission fails
            submitButton.textContent = 'Submit';
            submitButton.style.backgroundColor = ''; // Reset to original color
            submitButton.style.cursor = 'pointer';
        });
});

// Event listener for the Header text
document.addEventListener('DOMContentLoaded', function () {
    const headerTitle = document.getElementById('header-title');

    if (headerTitle) {
        headerTitle.addEventListener('click', function () {
            window.location.href = 'index.html';
        });
    }
});
