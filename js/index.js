document.addEventListener('DOMContentLoaded', () => {
    const translations = {
        en: {
            welcome: "Welcome to Tr.Emoji! Learn vocabulary in a fun and engaging way using emojis.",
            selectCategory: "Select a Category to Practice:",
            categories: [
                { emoji: "😀😢😡😱😍", text: "Emotions" },
                { emoji: "👨‍⚕️👩‍🏫👨‍🍳👨‍🔧👩‍🔬", text: "Jobs" },
                { emoji: "⚽🏀🏈⚾🎾", text: "Sports" },
                { emoji: "🏃‍♂️🚴‍♀️🧘‍♀️🎨✍️", text: "Actions" },
                { emoji: "👨👩👶👵👴", text: "People" },
                { emoji: "🐶🐱🐭🐹🐰", text: "Animals" },
                { emoji: "🌲🌵🌷🌻🌼", text: "Plants" },
                { emoji: "🍎🍔🍣🍕🍰", text: "Food" },
                { emoji: "🗺️🗾🏞️🏔️🏜️", text: "Geography" },
                { emoji: "🇺🇸🇫🇷🇯🇵🇧🇷🇮🇳", text: "Countries" },
                { emoji: "🚗🚕🚙🚌🚎", text: "Transportation" },
                { emoji: "⏰🕰️⌚⏳⏲️", text: "Time" },
                { emoji: "☀️🌧️⛈️❄️🌪️", text: "Weather" },
                { emoji: "👗👚👖👔👠", text: "Clothing" },
                { emoji: "🏓🏸🥊🏒🏑", text: "Sports Equipment" },
                { emoji: "🎸🎹🎷🎺🥁", text: "Musical Instruments" },
                { emoji: "✏️🖊️🖌️📝📏", text: "Stationery" },
                { emoji: "🛏️🛋️🚪🧽🧹", text: "Household Items" },
                { emoji: "⛪🕌🕍🕋✝️", text: "Religion" }
            ]
        },
        es: {
            welcome: "¡Bienvenido a Tr.Emoji! Aprende vocabulario de una manera divertida y atractiva usando emojis.",
            selectCategory: "Selecciona una Categoría para Practicar:",
            categories: [
                { emoji: "😀😢😡😱😍", text: "Emociones" },
                { emoji: "👨‍⚕️👩‍🏫👨‍🍳👨‍🔧👩‍🔬", text: "Trabajos" },
                { emoji: "⚽🏀🏈⚾🎾", text: "Deportes" },
                { emoji: "🏃‍♂️🚴‍♀️🧘‍♀️🎨✍️", text: "Acciones" },
                { emoji: "👨👩👶👵👴", text: "Personas" },
                { emoji: "🐶🐱🐭🐹🐰", text: "Animales" },
                { emoji: "🌲🌵🌷🌻🌼", text: "Plantas" },
                { emoji: "🍎🍔🍣🍕🍰", text: "Comida" },
                { emoji: "🗺️🗾🏞️🏔️🏜️", text: "Geografía" },
                { emoji: "🇺🇸🇫🇷🇯🇵🇧🇷🇮🇳", text: "Países" },
                { emoji: "🚗🚕🚙🚌🚎", text: "Transporte" },
                { emoji: "⏰🕰️⌚⏳⏲️", text: "Tiempo" },
                { emoji: "☀️🌧️⛈️❄️🌪️", text: "Clima" },
                { emoji: "👗👚👖👔👠", text: "Ropa" },
                { emoji: "🏓🏸🥊🏒🏑", text: "Equipo Deportivo" },
                { emoji: "🎸🎹🎷🎺🥁", text: "Instrumentos Musicales" },
                { emoji: "✏️🖊️🖌️📝📏", text: "Papelería" },
                { emoji: "🛏️🛋️🚪🧽🧹", text: "Artículos del Hogar" },
                { emoji: "⛪🕌🕍🕋✝️", text: "Religión" }
            ]
        }
    };

    const categoryItems = document.querySelectorAll('.category-item');

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            alert(`You selected: ${item.textContent}`);
            // Here you can add logic to navigate to the selected category's practice page
        });
    });

    const helpButton = document.querySelector('.help-btn');
    helpButton.addEventListener('click', () => {
        window.location.href = 'faq.html'; // Redirect to the FAQ page
    });

    const langButton = document.querySelector('.dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');

    langButton.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContent.classList.toggle('show');
    });

    // Close the dropdown when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!langButton.contains(event.target) && !dropdownContent.contains(event.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    const languageLinks = document.querySelectorAll('.dropdown-content a');
    languageLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            updateLanguage(selectedLang);
        });
    });

    function updateLanguage(lang) {
        const translation = translations[lang];

        document.querySelector('.container h1').textContent = 'Tr.Emoji';
        document.querySelector('.container p').textContent = translation.welcome;
        document.querySelector('.categories h2').textContent = translation.selectCategory;

        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';
        translation.categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `${category.emoji} <span class="category-text">${category.text}</span>`;
            categoryList.appendChild(li);

            li.addEventListener('click', () => {
                alert(`You selected: ${category.text}`);
                // Add logic to navigate to the selected category's practice page
            });
        });
    }

    // Default language
    updateLanguage('en');
});
