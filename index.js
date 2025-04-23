// Declare initializer at the top so it can be called from anywhere
let initializer;

// Get DOM elements
const letterContainer = document.getElementById("letter-container");
const optionsContainer = document.getElementById("options-container");
const hintsContainer = document.getElementById("hints-container");
const userInputSection = document.getElementById("user-input-section");
const newGameContainer = document.getElementById("new-game-container");
const newGameButton = document.getElementById("new-game-button");
const canvas = document.getElementById("canvas");
const resultText = document.getElementById("result-text");
const hintButton = document.getElementById("hint-button");
const saveButton = document.getElementById("save-button");
const resetStatsButton = document.getElementById("reset-stats");
const themeToggle = document.getElementById("theme-toggle");
const wordLengthFilter = document.getElementById("word-length-filter");
const historyContainer = document.getElementById("history-container");

// Game variables
let winCount = 0;
let count = 0;
let maxWrongAttempts = 6; // Default, can be changed by difficulty
let chosenObj = {};
let chosenWord = "";
let wordMeaning = "";
let hintsRemaining = 3;
let gameTimer;
let seconds = 0;

// Theme toggle functionality
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    // Save theme preference
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);
});

// Apply saved theme on load
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
}

// Reset stats button functionality
resetStatsButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all your game statistics?")) {
        localStorage.removeItem("hangmanScores");
        displayScores();
        displayWordHistory();
    }
});

// Save game button functionality
saveButton.addEventListener("click", () => {
    saveGameProgress();
    alert("Game saved successfully!");
});

// Set up difficulty buttons
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setDifficulty(btn.dataset.level);
    });
});

// Word length filter
wordLengthFilter.addEventListener('change', () => {
    applyWordLengthFilter(wordLengthFilter.value);
});

// Original options backup for filtering
let originalOptions = {};

// Timer functionality
const startTimer = () => {
    // Reset timer
    clearInterval(gameTimer);
    seconds = 0;
    updateTimerDisplay();

    // Start new timer
    gameTimer = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
};

const stopTimer = () => {
    clearInterval(gameTimer);
};

const updateTimerDisplay = () => {
    const timerElement = document.getElementById('timer');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerElement.textContent = `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

// Animation for letter reveal
const animateLetterReveal = (element) => {
    if (!element.classList.contains('animated')) {
        element.classList.add('animated');
        element.style.animation = 'popIn 0.5s ease';
    }
};

// Animation for wrong guess
const animateWrongGuess = () => {
    canvas.classList.add('shake');

    // Remove the class after animation completes
    setTimeout(() => {
        canvas.classList.remove('shake');
    }, 500);
};

// Confetti animation for win
const triggerWinAnimation = () => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
};

// Advanced scorekeeping system
const initializeScoreSystem = () => {
    // Check if scores exist in local storage
    let scores = JSON.parse(localStorage.getItem('hangmanScores')) || {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        streak: 0,
        bestStreak: 0,
        wordHistory: [],
        difficulty: 'normal' // Default difficulty
    };

    return scores;
};

// Update scores after game
const updateScores = (result, word) => {
    let scores = initializeScoreSystem();

    scores.gamesPlayed += 1;

    if (result === 'win') {
        scores.wins += 1;
        scores.streak += 1;
        if (scores.streak > scores.bestStreak) {
            scores.bestStreak = scores.streak;
        }
    } else {
        scores.losses += 1;
        scores.streak = 0;
    }

    // Add word to history (most recent first)
    scores.wordHistory.unshift({
        word: word,
        result: result,
        date: new Date().toISOString()
    });

    // Keep only last 10 words
    if (scores.wordHistory.length > 10) {
        scores.wordHistory = scores.wordHistory.slice(0, 10);
    }

    // Save back to local storage
    localStorage.setItem('hangmanScores', JSON.stringify(scores));

    // Update UI
    displayScores();
    displayWordHistory();
};

// Display score in UI
const displayScores = () => {
    const scores = initializeScoreSystem();
    const scoreContainer = document.getElementById('score-container');

    scoreContainer.innerHTML = `
<div class="score-card">
  <div class="score-item">
    <span class="score-label">Games</span>
    <span class="score-value">${scores.gamesPlayed}</span>
  </div>
  <div class="score-item">
    <span class="score-label">Wins</span>
    <span class="score-value win-color">${scores.wins}</span>
  </div>
  <div class="score-item">
    <span class="score-label">Losses</span>
    <span class="score-value lose-color">${scores.losses}</span>
  </div>
  <div class="score-item">
    <span class="score-label">Streak</span>
    <span class="score-value">${scores.streak}</span>
  </div>
  <div class="score-item">
    <span class="score-label">Best</span>
    <span class="score-value">${scores.bestStreak}</span>
  </div>
</div>
`;
};

// Display word history
const displayWordHistory = () => {
    const scores = initializeScoreSystem();
    historyContainer.innerHTML = '';

    if (scores.wordHistory.length === 0) {
        historyContainer.innerHTML = '<p>No games played yet.</p>';
        return;
    }

    scores.wordHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
  <span class="history-word">${item.word}</span>
  <span class="history-result ${item.result}">${item.result === 'win' ? 'Won' : 'Lost'}</span>
`;
        historyContainer.appendChild(historyItem);
    });
};

// Filter words by length
const applyWordLengthFilter = (filterValue) => {
    // Make sure options is defined and has been copied
    if (!window.options || Object.keys(originalOptions).length === 0) {
        // If options aren't available yet, delay and retry
        setTimeout(() => applyWordLengthFilter(filterValue), 100);
        return;
    }
    
    // Reset options to original first
    window.options = JSON.parse(JSON.stringify(originalOptions));

    // Apply filter
    if (filterValue !== 'all') {
        let minLength, maxLength;

        switch (filterValue) {
            case 'short':
                minLength = 4;
                maxLength = 6;
                break;
            case 'medium':
                minLength = 7;
                maxLength = 9;
                break;
            case 'long':
                minLength = 10;
                maxLength = 100;
                break;
            default:
                return;
        }

        for (let category in window.options) {
            window.options[category] = window.options[category].filter(wordObj => {
                const word = Object.keys(wordObj)[0];
                return word.length >= minLength && word.length <= maxLength;
            });
        }
    }

    // Restart game with filtered words
    initializer();
};

// Difficulty levels
const setDifficulty = (level) => {
    const scores = initializeScoreSystem();
    scores.difficulty = level;
    localStorage.setItem('hangmanScores', JSON.stringify(scores));

    // Apply difficulty settings
    switch (level) {
        case 'easy':
            maxWrongAttempts = 8; // More attempts allowed
            break;
        case 'normal':
            maxWrongAttempts = 6; // Default
            break;
        case 'hard':
            maxWrongAttempts = 4; // Fewer attempts
            break;
    }

    // Update UI
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.level === level) {
            btn.classList.add('active');
        }
    });

    // Reset game with new difficulty
    initializer();
};

// Hints system - This must be a global function since it's called from HTML
window.useHint = function() {
    if (hintsRemaining <= 0) return;

    const dashes = document.getElementsByClassName('dashes');
    const charArray = chosenWord.split('');

    // Find all hidden letters
    const hiddenIndices = [];
    for (let i = 0; i < dashes.length; i++) {
        if (dashes[i].textContent === '_') {
            hiddenIndices.push(i);
        }
    }

    if (hiddenIndices.length === 0) return;

    // Reveal a random hidden letter
    const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    const letterToReveal = charArray[randomIndex];

    // Reveal this letter everywhere it appears
    charArray.forEach((char, index) => {
        if (char === letterToReveal && dashes[index].textContent === '_') {
            dashes[index].textContent = char;
            dashes[index].classList.add('hint');
            animateLetterReveal(dashes[index]);
            winCount += 1;
        }
    });

    // Update hint counter
    hintsRemaining -= 1;
    document.getElementById('hints-left').textContent = hintsRemaining;

    // Disable hint button if no hints left
    if (hintsRemaining <= 0) {
        document.getElementById('hint-button').disabled = true;
    }

    // Check for win
    if (winCount === charArray.length) {
        resultText.innerHTML = `<h2 class='win-msg'>You Win!!</h2><p>The word was <span>${chosenWord}</span></p>`;
        updateScores('win', chosenWord);
        triggerWinAnimation();
        blocker();
    }
};

// Save progress functionality
const saveGameProgress = () => {
    const gameState = {
        chosenWord,
        wordMeaning,
        revealedIndices: [],
        wrongGuesses: count,
        hintsRemaining,
        seconds
    };

    // Track which positions have been revealed
    const dashes = document.getElementsByClassName('dashes');
    for (let i = 0; i < dashes.length; i++) {
        if (dashes[i].textContent !== '_') {
            gameState.revealedIndices.push(i);
        }
    }

    localStorage.setItem('hangmanGameState', JSON.stringify(gameState));
};

const loadGameProgress = () => {
    const savedState = JSON.parse(localStorage.getItem('hangmanGameState'));
    if (!savedState) return false;

    // Restore game state
    chosenWord = savedState.chosenWord;
    wordMeaning = savedState.wordMeaning;
    count = savedState.wrongGuesses;
    hintsRemaining = savedState.hintsRemaining;
    seconds = savedState.seconds;

    // Set up the display
    let displayItem = chosenWord.replace(/./g, '<span class="dashes">_</span>');
    userInputSection.innerHTML = displayItem;

    // Reveal letters that were already guessed
    const dashes = document.getElementsByClassName('dashes');
    savedState.revealedIndices.forEach(index => {
        dashes[index].textContent = chosenWord[index];
        winCount += 1;
    });

    // Set up hint display
    hintsContainer.innerHTML = "<h4>Hint:</h4><hr><br> " + wordMeaning + "<br><hr><br>";
    document.getElementById('hints-left').textContent = hintsRemaining;

    // Draw hangman based on wrong guesses
    for (let i = 1; i <= count; i++) {
        drawMan(i);
    }

    // Restart timer
    updateTimerDisplay();
    startTimer();

    return true;
};

// Display option buttons
const displayOptions = () => {
    optionsContainer.innerHTML += `<h3>Click to start the game</h3>`;
    let buttonCon = document.createElement("div");
    buttonCon.style.display = "flex";
    buttonCon.style.justifyContent = "center";
    buttonCon.style.alignItems = "center";
    for (let value in window.options) {
        buttonCon.innerHTML += `<button class="option-button" onclick="window.generateWord('${value}')">${value}</button>`;
    }
    optionsContainer.appendChild(buttonCon);
};

// Block all the Buttons
const blocker = () => {
    let optionsButtons = document.querySelectorAll(".option-button");
    let letterButtons = document.querySelectorAll(".letter-button");
    // disable all options
    optionsButtons.forEach((button) => {
        button.disabled = true;
    });

    // disable all letters
    letterButtons.forEach((button) => {
        button.disabled = true;
    });

    // Disable hint button
    hintButton.disabled = true;

    // Stop timer
    stopTimer();

    newGameContainer.classList.remove("hide");
};

// Word Generator
window.generateWord = function(optionValue) {
    let optionsButtons = document.querySelectorAll(".option-button");
    // If optionValue matches the button innerText then highlight the button
    optionsButtons.forEach((button) => {
        if (button.innerText.toLowerCase() === optionValue) {
            button.classList.add("active");
        }
        button.disabled = true;
    });

    // initially hide letters, clear previous word
    letterContainer.classList.remove("hide");
    userInputSection.innerText = "";

    // Reset game state
    winCount = 0;
    count = 0;

    // Reset timer
    startTimer();

    // Reset hints
    hintsRemaining = 3;
    document.getElementById('hints-left').textContent = hintsRemaining;
    hintButton.disabled = false;

    let optionArray = window.options[optionValue];
    // choose random word
    chosenObj = optionArray[Math.floor(Math.random() * optionArray.length)];
    chosenWord = Object.keys(chosenObj)[0];
    wordMeaning = Object.values(chosenObj)[0];

    // replace every letter with span containing dash
    let displayItem = chosenWord.replace(/./g, '<span class="dashes">_</span>');

    // Display each element as span
    userInputSection.innerHTML = displayItem;
    hintsContainer.innerHTML = "<h4>Hint:</h4><hr><br> " + wordMeaning + "<br><hr><br>";

    // Clear previous canvas
    let { initialDrawing } = canvasCreator();
    initialDrawing();

    // Create letter buttons
    createLetterButtons();
};