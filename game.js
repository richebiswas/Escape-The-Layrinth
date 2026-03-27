// ========================================
// HORROR ESCAPE ROOM - GAME LOGIC (FIXED)
// ========================================

// Audio Context
let audioCtx = null;

// Game State
let currentLevel = 1;
let timeLeft = 300;
let timerInterval = null;
let gameActive = true;
let collectedHints = [];
let patternSolved = false;
// ========================================
// ENHANCED LEVEL 3 - More clues and better visibility
// ========================================

// Replace the levels object in your game.js with this:

const levels = {
    1: {
        name: "CELL BLOCK A",
        password: "NIGHTMARE",
        riddle: "I am the darkness that hunts in dreams. What am I?",
        pattern: ["🔴", "⚫", "🔴", "⚫", "🔴", "⚫", "🔴", "⚫", "🔴"],
        objects: [
            { id: "oldBook", x: "12%", y: "68%", icon: "📖", label: "OLD JOURNAL", hint: "📖 JOURNAL: 'The beast that haunts my sleep is called NIGHTMARE... The password is NIGHTMARE!'" }
        ]
    },
    2: {
        name: "THE RITUAL ROOM",
        password: "BLOODMOON",
        riddle: "When the sky turns crimson red, what rises with dread?",
        pattern: ["🔴", "🔴", "⚫", "🔴", "🔴", "⚫", "🔴", "🔴", "⚫"],
        objects: [
            { id: "grimoire", x: "48%", y: "58%", icon: "📜", label: "DARK GRIMOIRE", hint: "📜 GRIMOIRE: 'Under the BLOOD MOON, sacrifices begin... The password is BLOODMOON!'" }
        ]
    },
    3: {
        name: "THE MASTER'S CHAMBER 👻",
        password: "PHANTOM",
        riddle: "I am a ghost that haunts the mind, invisible yet you feel me. What am I?",
        pattern: ["⚫", "🔴", "⚫", "⚫", "🔴", "⚫", "⚫", "🔴", "⚫"],
        objects: [
            { 
                id: "spiritBox", 
                x: "28%", 
                y: "72%", 
                icon: "📻", 
                label: "👻 SPIRIT BOX", 
                hint: "📻 STATIC VOICE CRACKLES: 'PHANTOM... PHANTOM... The password is PHANTOM! Type it in the terminal to escape!'" 
            },
            { 
                id: "ghostFigure", 
                x: "52%", 
                y: "35%", 
                icon: "👤", 
                label: "👤 GHOSTLY FIGURE", 
                hint: "👤 A translucent figure whispers: 'I am the PHANTOM... The password is my name... PHANTOM!'" 
            },
            { 
                id: "hauntedMirror", 
                x: "72%", 
                y: "48%", 
                icon: "🪞", 
                label: "🪞 HAUNTED MIRROR", 
                hint: "🪞 Mirror writing appears: 'PHANTOM sees you... The password is PHANTOM!'" 
            }
        ]
    }
};

let currentLevelData = levels[1];

// DOM Elements
const startScreen = document.getElementById('startScreen');
const storyScreen = document.getElementById('storyScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const roomContainer = document.getElementById('roomContainer');
const inventoryList = document.getElementById('inventoryList');
const timerDisplay = document.getElementById('timerDisplay');
const levelBadge = document.getElementById('levelBadge');
const endMessage = document.getElementById('endMessage');
const endDetail = document.getElementById('endDetail');
const modalContainer = document.getElementById('modalContainer');

// ========================================
// AUDIO FUNCTIONS
// ========================================
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type, volume = 0.3) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = volume;
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'click': osc.frequency.value = 800; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2); break;
        case 'unlock': osc.frequency.value = 1200; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); break;
        case 'win': osc.frequency.value = 1500; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6); break;
        case 'levelup': osc.frequency.value = 1000; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5); break;
        case 'error': osc.frequency.value = 300; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); break;
        default: osc.frequency.value = 600; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    }
    osc.start();
    osc.stop(now + 0.5);
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================
function showScreen(screenToShow) {
    const screens = [startScreen, storyScreen, gameScreen, endScreen];
    screens.forEach(screen => { if (screen) screen.classList.remove('active'); });
    screenToShow.classList.add('active');
}

function showHintNotification(message, isNew = true) {
    const notification = document.createElement('div');
    notification.className = 'hint-notification';
    notification.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 5px;">🔍 ${isNew ? 'NEW CLUE FOUND!' : 'CLUE'}</div>
        <div style="font-size: 0.9rem;">${message}</div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentNode) notification.remove(); }, 3500);
}

let currentTooltip = null;

function showTooltip(element, text, icon) {
    if (currentTooltip) currentTooltip.remove();
    const tooltip = document.createElement('div');
    tooltip.className = 'interactive-tooltip';
    tooltip.innerHTML = `${icon} ${text}`;
    document.body.appendChild(tooltip);
    
    const updatePosition = (e) => {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY - 35) + 'px';
    };
    
    element.addEventListener('mousemove', updatePosition);
    element.addEventListener('mouseleave', () => {
        tooltip.remove();
        element.removeEventListener('mousemove', updatePosition);
        currentTooltip = null;
    });
    
    currentTooltip = tooltip;
    const rect = element.getBoundingClientRect();
    updatePosition({ clientX: rect.left + 50, clientY: rect.top + 30 });
}

function updateInventoryUI() {
    if (collectedHints.length === 0) {
        inventoryList.innerHTML = '<span class="inv-item empty">🔍 Click on GLOWING objects to find clues!</span>';
    } else {
        inventoryList.innerHTML = collectedHints.map((hint, i) => {
            const shortHint = hint.length > 45 ? hint.substring(0, 45) + '...' : hint;
            return `<span class="inv-item" title="${hint}">📜 ${shortHint}</span>`;
        }).join('');
    }
}

// ========================================
// EXAMINE OBJECT
// ========================================
function examineObject(objectId, hintText, objectName, icon) {
    if (!gameActive) return;
    playSound('click', 0.2);
    
    const shortHint = hintText.length > 70 ? hintText.substring(0, 70) + '...' : hintText;
    
    if (!collectedHints.some(h => h.includes(objectId) || h === shortHint)) {
        collectedHints.push(shortHint);
        updateInventoryUI();
        
        const newItem = inventoryList.querySelector('.inv-item:last-child');
        if (newItem) newItem.classList.add('new');
        setTimeout(() => { if (newItem) newItem.classList.remove('new'); }, 1500);
        
        showHintNotification(`${icon} ${objectName}\n\n${hintText}`, true);
        alert(`🔍 ${objectName.toUpperCase()} EXAMINED!\n\n${hintText}`);
    } else {
        showHintNotification(`📜 Already found: ${objectName}\n\n${hintText.substring(0, 60)}...`, false);
    }
}

// ========================================
// PATTERN PUZZLE
// ========================================
function showPatternPuzzle() {
    return new Promise((resolve) => {
        showHintNotification("💡 Pattern clue: Look at the objects around the room! The glowing items show the pattern...", false);
        
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal';
        let selectedIndices = [];
        const targetPattern = currentLevelData.pattern;
        const targetRedCount = targetPattern.filter(p => p === '🔴').length;
        
        modalDiv.innerHTML = `
            <div class="modal-content">
                <h3>🔮 PATTERN PUZZLE</h3>
                <p>Select <strong style="color:#ffaa44">${targetRedCount} red (🔴)</strong> cells to match the hidden pattern!</p>
                <div class="pattern-grid" id="patternGrid"></div>
                <div class="hint-text">💡 HINT: ${currentLevel === 1 ? 'Try selecting a diagonal pattern!' : currentLevel === 2 ? 'Every 3rd cell is red!' : 'The red cells form a plus shape!'}</div>
                <div class="modal-buttons">
                    <button class="modal-btn submit" id="verifyPattern">✅ VERIFY PATTERN</button>
                    <button class="modal-btn close" id="closePattern">❌ CANCEL</button>
                </div>
            </div>
        `;
        
        modalContainer.appendChild(modalDiv);
        const grid = modalDiv.querySelector('#patternGrid');
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'pattern-cell';
            cell.textContent = '❓';
            cell.dataset.index = i;
            cell.onclick = () => {
                if (selectedIndices.includes(i)) {
                    selectedIndices = selectedIndices.filter(idx => idx !== i);
                    cell.textContent = '❓';
                    cell.classList.remove('selected');
                } else if (selectedIndices.length < targetRedCount) {
                    selectedIndices.push(i);
                    cell.textContent = '🔴';
                    cell.classList.add('selected');
                } else {
                    playSound('error', 0.2);
                    showHintNotification(`You need exactly ${targetRedCount} red cells!`, false);
                }
            };
            grid.appendChild(cell);
        }
        
        modalDiv.querySelector('#verifyPattern').onclick = () => {
            const sortedSelected = [...selectedIndices].sort((a, b) => a - b);
            const targetIndices = [];
            targetPattern.forEach((val, idx) => { if (val === '🔴') targetIndices.push(idx); });
            
            const isCorrect = sortedSelected.length === targetIndices.length && 
                              sortedSelected.every((val, idx) => val === targetIndices[idx]);
            
            if (isCorrect) {
                playSound('unlock', 0.3);
                modalDiv.remove();
                resolve(true);
            } else {
                playSound('error', 0.3);
                alert('❌ Incorrect pattern! Try again! Look at the objects around the room for pattern hints.');
            }
        };
        
        modalDiv.querySelector('#closePattern').onclick = () => { modalDiv.remove(); resolve(false); };
    });
}

// ========================================
// PASSWORD PROMPT - FIXED WITH CLEAR INPUT FIELD
// ========================================
async function showPasswordPrompt() {
    if (!gameActive) return;
    
    // Check if pattern puzzle is solved
    if (!patternSolved) {
        const patternSuccess = await showPatternPuzzle();
        if (!patternSuccess) {
            alert("❌ You must solve the pattern puzzle to unlock the password terminal!\n\n🔍 Look for GLOWING objects around the room for pattern hints!");
            return;
        }
        patternSolved = true;
        alert("✨ Pattern solved! The password terminal is now accessible!");
        playSound('levelup', 0.3);
    }
    
    playSound('click', 0.2);
    
    // Create modal with password input
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h3>🔐 PASSWORD TERMINAL</h3>
            <p><strong>Riddle:</strong> ${currentLevelData.riddle}</p>
            <p style="color: #ffaa66; font-size: 0.9rem;">Enter the password to escape this room!</p>
            <input type="text" class="password-input" id="passwordInput" placeholder="TYPE PASSWORD HERE..." autocomplete="off">
            <div class="modal-buttons">
                <button class="modal-btn submit" id="submitPassword">🔓 SUBMIT</button>
                <button class="modal-btn close" id="closeModal">❌ CANCEL</button>
            </div>
            <div class="hint-text">
                💡 CLUES FOUND: ${collectedHints.length} | 
                <span style="color: #ffaa44;">Click on GLOWING objects around the room to find password hints!</span>
            </div>
        </div>
    `;
    
    modalContainer.appendChild(modalDiv);
    const input = modalDiv.querySelector('#passwordInput');
    
    const checkPassword = () => {
        const val = input.value.trim().toUpperCase();
        if (val === currentLevelData.password) {
            playSound('unlock', 0.4);
            modalDiv.remove();
            levelComplete();
        } else {
            playSound('error', 0.3);
            alert(`❌ WRONG PASSWORD: "${val}"\n\n💡 HINT: ${collectedHints.length > 0 ? 'Check your inventory for the correct password!' : 'Click on GLOWING objects around the room to find password hints!'}`);
            input.value = '';
            input.focus();
            input.style.borderColor = '#ff4444';
            setTimeout(() => { input.style.borderColor = '#ff7777'; }, 500);
        }
    };
    
    modalDiv.querySelector('#submitPassword').onclick = checkPassword;
    modalDiv.querySelector('#closeModal').onclick = () => modalDiv.remove();
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });
    input.focus();
}

// ========================================
// LEVEL COMPLETE
// ========================================
async function levelComplete() {
    if (!gameActive) return;
    
    if (currentLevel === 3) {
        if (timerInterval) clearInterval(timerInterval);
        gameActive = false;
        playSound('win', 0.5);
        showScreen(endScreen);
        endMessage.innerHTML = "🏆 FREEDOM! 🏆";
        endDetail.innerHTML = "You escaped the nightmare labyrinth! Your soul is free... The entity screams in defeat!";
        return;
    }
    
    playSound('levelup', 0.4);
    const storyMessages = {
        1: "🔮 You escaped the first room... but something feels wrong...\n\nThe darkness grows stronger... The entity is watching.",
        2: "🌙 The entity is furious! It knows you're getting closer to freedom...\n\nOne more room to go. Stay strong!"
    };
    alert(storyMessages[currentLevel] || "You progress deeper into the labyrinth... The air grows colder.");
    
    const roomImage = document.getElementById('roomImage');
    if (roomImage) roomImage.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 400));
    
    currentLevel++;
    currentLevelData = levels[currentLevel];
    collectedHints = [];
    patternSolved = false;
    updateInventoryUI();
    levelBadge.innerText = `LEVEL ${currentLevel}: ${currentLevelData.name}`;
    
    if (roomImage) roomImage.style.opacity = '1';
    renderRoomObjects();
}

// ========================================
// RENDER ROOM OBJECTS - WITH CLEAR PASSWORD TERMINAL
// ========================================
function renderRoomObjects() {
    const existingObjects = roomContainer.querySelectorAll('.clickable-object');
    existingObjects.forEach(obj => obj.remove());
    const existingHighlights = roomContainer.querySelectorAll('.room-highlight');
    existingHighlights.forEach(hl => hl.remove());
    
    // All interactive objects
    const objects = [
        ...currentLevelData.objects.map(obj => ({ ...obj, type: 'clue', actionIcon: '🔍' })),
        {
            id: 'terminal', x: '45%', y: '82%', icon: '🔐', label: '🔐 PASSWORD TERMINAL',
            hint: `Enter the password to escape! Riddle: ${currentLevelData.riddle}`,
            type: 'terminal', actionIcon: '🔐'
        },
        {
            id: 'whisper', x: '78%', y: '15%', icon: '📜', label: '👻 WHISPERING PAGES',
            hint: `Ghostly whisper: "${currentLevelData.riddle}" echoes... Look for glowing objects for clues!`,
            type: 'clue', actionIcon: '👻'
        },
        {
            id: 'cabinet', x: '8%', y: '55%', icon: '🚪', label: '🔎 MYSTERIOUS CABINET',
            hint: `Inside: "Pattern clue: ${currentLevel === 1 ? 'Try selecting a diagonal pattern!' : currentLevel === 2 ? 'Every 3rd cell is red!' : 'The red cells form a plus shape!'}"`,
            type: 'clue', actionIcon: '🔎'
        },
        {
            id: 'note', x: '88%', y: '70%', icon: '📄', label: '🩸 BLOODY NOTE',
            hint: `Blood-stained paper: "The password is ${currentLevelData.password}! Find the terminal and enter it!"`,
            type: 'clue', actionIcon: '🩸'
        },
        {
            id: 'skull', x: '65%', y: '45%', icon: '💀', label: '💀 CRYPTIC SKULL',
            hint: `Skull whispers: "${currentLevelData.riddle} The answer is ${currentLevelData.password}"`,
            type: 'clue', actionIcon: '💀'
        },
        {
            id: 'clock', x: '25%', y: '28%', icon: '⏰', label: '⏰ BROKEN CLOCK',
            hint: `Clock shows: ${currentLevel === 1 ? 'NIGHTMARE at midnight!' : currentLevel === 2 ? 'BLOOD MOON rising!' : 'PHANTOM hour!'} The password is ${currentLevelData.password}!`,
            type: 'clue', actionIcon: '⏰'
        }
    ];
    
    objects.forEach(obj => {
        const div = document.createElement('div');
        div.className = 'clickable-object';
        div.style.left = obj.x;
        div.style.top = obj.y;
        div.style.position = 'absolute';
        div.setAttribute('data-type', obj.type || 'clue');
        div.setAttribute('data-name', obj.label);
        
        // Special styling for terminal
        const terminalText = obj.type === 'terminal' ? '<div style="font-size: 0.6rem; color: #ff4444; margin-top: 3px;">⬅️ CLICK TO ENTER PASSWORD</div>' : '<div style="font-size: 0.6rem; color: #ffaa44; margin-top: 3px;">⬅️ CLICK FOR CLUE</div>';
        
        div.innerHTML = `
            <div class="object-icon">${obj.icon}</div>
            <div class="hint-tag">${obj.label}</div>
            ${terminalText}
        `;
        
        div.onmouseenter = () => showTooltip(div, obj.type === 'terminal' ? 'Click to enter password and escape!' : `Click to examine ${obj.label}`, obj.icon);
        div.onclick = (e) => {
            e.stopPropagation();
            if (obj.type === 'terminal') {
                showPasswordPrompt();
            } else {
                examineObject(obj.id, obj.hint, obj.label, obj.icon);
            }
        };
        roomContainer.appendChild(div);
        
        // Add highlight glow
        const highlight = document.createElement('div');
        highlight.className = 'room-highlight';
        highlight.style.left = `calc(${obj.x} - 20px)`;
        highlight.style.top = `calc(${obj.y} - 20px)`;
        highlight.style.width = '80px';
        highlight.style.height = '80px';
        roomContainer.appendChild(highlight);
    });
    
    // Instructions panel
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.bottom = '10px';
    instructions.style.left = '10px';
    instructions.style.background = 'rgba(0,0,0,0.85)';
    instructions.style.padding = '10px 15px';
    instructions.style.borderRadius = '10px';
    instructions.style.fontSize = '0.7rem';
    instructions.style.color = '#ffaa88';
    instructions.style.zIndex = '25';
    instructions.style.fontFamily = 'monospace';
    instructions.style.borderLeft = '3px solid #ffaa44';
    instructions.innerHTML = '✨ <strong>HOVER</strong> over GLOWING objects | <strong>CLICK</strong> clues to find password | <strong>🔐 TERMINAL</strong> to enter password and escape';
    roomContainer.appendChild(instructions);
}

// ========================================
// TIMER
// ========================================
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            gameActive = false;
            playSound('error', 0.5);
            alert("⏰ TIME'S UP! The darkness consumes you... GAME OVER.");
            showScreen(endScreen);
            endMessage.innerHTML = "💀 GAME OVER 💀";
            endDetail.innerHTML = "You ran out of time. The labyrinth claimed another soul.";
            return;
        }
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 60) timerDisplay.classList.add('danger-timer');
        else timerDisplay.classList.remove('danger-timer');
    }, 1000);
}

// ========================================
// SAVE / LOAD
// ========================================
function saveGame() {
    if (!gameActive) { alert("Cannot save - game is over!"); return; }
    const saveData = { currentLevel, timeLeft, collectedHints, patternSolved };
    localStorage.setItem('horrorEscapeSave', JSON.stringify(saveData));
    playSound('click', 0.2);
    alert("💾 Game saved!");
}

function loadGame() {
    const saveData = localStorage.getItem('horrorEscapeSave');
    if (!saveData) { alert("No save file found."); return; }
    const data = JSON.parse(saveData);
    currentLevel = data.currentLevel;
    currentLevelData = levels[currentLevel];
    timeLeft = data.timeLeft;
    collectedHints = data.collectedHints || [];
    patternSolved = data.patternSolved || false;
    gameActive = true;
    if (timerInterval) clearInterval(timerInterval);
    startTimer();
    levelBadge.innerText = `LEVEL ${currentLevel}: ${currentLevelData.name}`;
    updateInventoryUI();
    renderRoomObjects();
    showScreen(gameScreen);
    playSound('click', 0.2);
    alert("💾 Game loaded!");
}

// ========================================
// INIT GAME
// ========================================
function initGame() {
    currentLevel = 1;
    currentLevelData = levels[1];
    timeLeft = 300;
    collectedHints = [];
    patternSolved = false;
    gameActive = true;
    if (timerInterval) clearInterval(timerInterval);
    updateInventoryUI();
    levelBadge.innerText = `LEVEL 1: CELL BLOCK A`;
    renderRoomObjects();
    startTimer();
    showScreen(gameScreen);
    initAudio();
}

// ========================================
// EVENT LISTENERS
// ========================================
document.getElementById('startBtn').onclick = () => { playSound('click', 0.2); initAudio(); showScreen(storyScreen); };
document.getElementById('loadGameBtn').onclick = () => { playSound('click', 0.2); initAudio(); loadGame(); };
document.getElementById('startGameBtn').onclick = () => { playSound('click', 0.2); initGame(); };
document.getElementById('playAgainBtn').onclick = () => { playSound('click', 0.2); showScreen(startScreen); if (timerInterval) clearInterval(timerInterval); gameActive = false; };
document.getElementById('saveGameBtn').onclick = () => saveGame();

// Mouse lighting
document.addEventListener('mousemove', (e) => {
    document.body.style.setProperty('--mouse-x', (e.clientX / window.innerWidth * 100) + '%');
    document.body.style.setProperty('--mouse-y', (e.clientY / window.innerHeight * 100) + '%');
});

// Auto-init audio
document.body.addEventListener('click', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

console.log("🎮 Game loaded! Click on GLOWING objects for clues, then use PASSWORD TERMINAL to escape!");