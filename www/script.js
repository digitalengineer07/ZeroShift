let GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const GRID_SIZE = 3;
let currentBoard = [...GOAL_STATE];

// DOM Elements
const boardEl = document.getElementById('game-board');
const goalBoardEl = document.getElementById('goal-board');

const btnSolve = document.getElementById('btn-solve');
const btnSolveStart = document.getElementById('btn-solve-start');
const aiSolveGroup = document.getElementById('ai-solve-group') || document.getElementById('btn-solve').parentElement;
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnResume = document.getElementById('btn-resume');
const autoPlayGroup = document.getElementById('auto-play-group');
const statLimit = document.getElementById('stat-limit');
let moveLimit = null;
const btnNext = document.getElementById('btn-next');
const btnEasy = document.getElementById('btn-easy');
const btnMedium = document.getElementById('btn-medium');
const btnHard = document.getElementById('btn-hard');
const btnRandomizeGoal = document.getElementById('btn-randomize-goal');
const btnReset = document.getElementById('btn-reset');
const inputState = document.getElementById('input-state');
const btnSetState = document.getElementById('btn-set-state');
const btnShuffleInput = document.getElementById('btn-shuffle-input');

const btnStartGame = document.getElementById('btn-start-game');
const btnEndGame = document.getElementById('btn-end-game');

const statTimer = document.getElementById('stat-timer');
const statMoves = document.getElementById('stat-moves');
const statExplored = document.getElementById('stat-explored');
const statCost = document.getElementById('stat-cost');
const pathList = document.getElementById('path-list');
const msgBox = document.getElementById('message-box');

let tiles = [];
let goalTiles = [];

// State management
let solutionPath = [];
let currentStepIndex = 0;
let autoPlayInterval = null;
let isSolving = false;
let isManualTracking = false;
let isGameRunning = false;
let currentDifficultyLevel = 'Hard';
let baseChallengeBoard = [...currentBoard];

let timerInterval = null;
let timerSeconds = 0;
let timerLimit = 120; // Default matches HTML
let isCountDown = true;

const timerSelect = document.getElementById('timer-select');
if (timerSelect) {
    timerSelect.addEventListener('change', (e) => {
        timerLimit = parseInt(e.target.value);
        isCountDown = timerLimit > 0;
        if (!isGameRunning) resetTimer();
    });
}

function resetTimer() {
    stopTimer();
    timerSeconds = isCountDown ? timerLimit : 0;
    updateTimerDisplay();
}

function startTimer() {
    stopTimer();
    if (timerSeconds === 0 && isCountDown) {
        timerSeconds = timerLimit;
    }
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (isCountDown) {
            timerSeconds--;
            if (timerSeconds <= 0) {
                timerSeconds = 0;
                endGame(false);
            }
        } else {
            timerSeconds++;
        }
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    let m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    let s = (timerSeconds % 60).toString().padStart(2, '0');
    if (statTimer) statTimer.textContent = `${m}:${s}`;
}

// --- Initialization ---

function init() {
    createGoalBoard();
    createBoard();
    // Silently randomize board completely on load for the required game logic
    silentlyRandomizeBoard();
    attachEventListeners();
    updateUIToggle(false);
    resetTimer();
    showMessage("Game is setup! Select a timer and press 'START GAME' to unlock the board.", "info");
}

function silentlyRandomizeBoard(showMsg = false) {
    let shuffled;
    do {
        shuffled = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    } while (shuffled.toString() === GOAL_STATE.toString());

    if (getInversions(shuffled) % 2 !== getInversions(GOAL_STATE) % 2) {
        fixParity(shuffled);
    }
    
    currentBoard = shuffled;
    baseChallengeBoard = [...currentBoard];
    inputState.value = currentBoard.join(',');
    updateBoardVisuals();
    updateMoveLimit();
    if (showMsg) showMessage("Board shuffled (Hard). Click 'START GAME' to begin!", "info");
}

function createGoalBoard() {
    goalBoardEl.innerHTML = '';
    goalTiles = [];
    for (let i = 0; i < 9; i++) {
        let tile = document.createElement('div');
        tile.classList.add('tile');
        if (i === 0) {
            tile.classList.add('blank');
        } else {
            tile.textContent = i;
        }
        goalBoardEl.appendChild(tile);
        goalTiles[i] = tile;
    }
    updateGoalBoardVisuals();
}

function updateGoalBoardVisuals() {
    for (let i = 0; i < GOAL_STATE.length; i++) {
        let val = GOAL_STATE[i];
        let tile = goalTiles[val];
        let col = i % GRID_SIZE;
        let row = Math.floor(i / GRID_SIZE);
        tile.style.left = `${col * 33.11 + 1.3}%`;
        tile.style.top = `${row * 33.11 + 1.3}%`;
    }
}

function createBoard() {
    boardEl.innerHTML = '';
    tiles = [];
    for (let i = 0; i < 9; i++) {
        let tile = document.createElement('div');
        tile.classList.add('tile');
        if (i === 0) {
            tile.classList.add('blank');
        } else {
            tile.textContent = i;
            // Add interaction: manual play
            tile.addEventListener('click', () => handleTileClick(i));
        }
        boardEl.appendChild(tile);
        tiles[i] = tile;
    }
}

function handleTileClick(tileValue) {
    if (!isGameRunning) {
        showMessage("Click 'START GAME' to begin playing!", "error");
        return;
    }
    if (isSolving || autoPlayInterval) return; // Prevent during animation
    
    let blankIdx = currentBoard.indexOf(0);
    let tileIdx = currentBoard.indexOf(tileValue);
    
    let bRow = Math.floor(blankIdx / 3);
    let bCol = blankIdx % 3;
    let tRow = Math.floor(tileIdx / 3);
    let tCol = tileIdx % 3;
    
    if (Math.abs(bRow - tRow) + Math.abs(bCol - tCol) === 1) {
        
        let prefix = "";
        if (tRow < bRow) prefix = "Down"; 
        else if (tRow > bRow) prefix = "Up";
        else if (tCol < bCol) prefix = "Right";
        else if (tCol > bCol) prefix = "Left";

        let prevBoard = [...currentBoard];

        // Swap
        currentBoard[blankIdx] = tileValue;
        currentBoard[tileIdx] = 0;
        
        // Manual move implies tracking manual path
        if (!isManualTracking) {
            clearSolution();
            isManualTracking = true;
            solutionPath = [{ board: prevBoard, move: "Start", f: getManhattanDistance(prevBoard), g: 0 }];
            currentStepIndex = 0;
            pathList.innerHTML = '';
        }
        
        currentStepIndex++;
        let currentF = currentStepIndex + getManhattanDistance(currentBoard);
        
        solutionPath.push({
            board: [...currentBoard],
            move: `Move ${tileValue} ${prefix} (Manual)`,
            f: currentF,
            g: currentStepIndex
        });

        statMoves.textContent = currentStepIndex;
        statExplored.textContent = currentStepIndex;
        updateBoardVisuals();
        
        // Log manual move to UI
        let div = document.createElement('div');
        div.className = 'path-item active';
        document.querySelectorAll('.path-item').forEach(el => el.classList.remove('active'));
        div.innerHTML = `<span class="path-step">${currentStepIndex}. Move ${tileValue} ${prefix} (Manual)</span><span class="path-cost">f: ${currentF}</span>`;
        pathList.appendChild(div);
        
        // Prevent window jumping by natively scrolling the container only
        pathList.scrollTop = pathList.scrollHeight;

        if (currentBoard.toString() === GOAL_STATE.toString()) {
            endGame(true);
        } else if (moveLimit !== null && currentStepIndex >= moveLimit) {
            endGame(false, "Move limit exceeded! You Lose! Try Again.");
        } else {
            hideMessage();
            if (isGameRunning && moveLimit !== null) {
                let boardState = [...currentBoard];
                let currentStep = currentStepIndex;
                setTimeout(() => {
                    if (!isGameRunning) return; 
                    let opt = getOptimalMoveCount(boardState);
                    if (opt !== null && currentStep + opt > moveLimit) {
                        endGame(false, `Game Over! Cannot solve in ${moveLimit - currentStep} remaining moves (optimal is ${opt}).`);
                    }
                }, 10);
            }
        }
    }
}

function updateBoardVisuals() {
    for (let i = 0; i < currentBoard.length; i++) {
        let val = currentBoard[i];
        let tile = tiles[val];
        
        let col = i % GRID_SIZE;
        let row = Math.floor(i / GRID_SIZE);
        
        tile.style.left = `${col * 33.11 + 1.3}%`;
        tile.style.top = `${row * 33.11 + 1.3}%`;
    }
    
    let g = currentStepIndex;
    let h = getManhattanDistance(currentBoard);
    statCost.textContent = g + h;
}

function attachEventListeners() {
    if(btnEasy) btnEasy.addEventListener('click', () => { setDifficulty('Easy'); shuffleWithDepth(10, 'Easy'); });
    if(btnMedium) btnMedium.addEventListener('click', () => { setDifficulty('Medium'); shuffleWithDepth(25, 'Medium'); });
    if(btnHard) btnHard.addEventListener('click', () => { setDifficulty('Hard'); silentlyRandomizeBoard(true); });
    if(btnRandomizeGoal) btnRandomizeGoal.addEventListener('click', randomizeGoal);
    btnReset.addEventListener('click', resetBoard);
    btnSetState.addEventListener('click', parseInputState);
    if(btnShuffleInput) btnShuffleInput.addEventListener('click', randomizeCurrentBoard);
    btnSolve.addEventListener('click', () => {
        if (!isSolving) startSolver(false);
    });
    if(btnSolveStart) btnSolveStart.addEventListener('click', () => {
        if (!isSolving) startSolver(true);
    });
    btnNext.addEventListener('click', playNextMove);
    if(btnPlay) btnPlay.addEventListener('click', btnPlayClicked);
    if(btnPause) btnPause.addEventListener('click', btnPauseClicked);
    if(btnResume) btnResume.addEventListener('click', btnPlayClicked);
    
    if(btnStartGame) btnStartGame.addEventListener('click', startGame);
    if(btnEndGame) btnEndGame.addEventListener('click', () => endGame(false, "You gave up!"));
}

// --- Game Loop Management ---

function startGame() {
    if (currentBoard.toString() === GOAL_STATE.toString()) {
        showMessage("Board is already solved! Shuffle it first.", "error");
        return;
    }
    isGameRunning = true;
    clearSolution();
    updateUIToggle(true);
    startTimer();
    hideMessage();
}

function endGame(isWin, customMsg = null) {
    isGameRunning = false;
    stopTimer();
    updateUIToggle(false);
    
    // Safety check just in case we hit end game due to timer while a valid game was playing
    clearSolution();
    
    if (isWin) {
        showMessage("🎉 CONGRATULATIONS! You Solved the Puzzle! 🎉", "success");
    } else {
        let msg = customMsg || "⏰ Time's up! You Lose! Try Again.";
        showMessage(msg, "error");
    }
}

function updateUIToggle(isPlaying) {
    if (btnStartGame && btnEndGame) {
        btnStartGame.style.display = isPlaying ? 'none' : 'block';
        btnEndGame.style.display = isPlaying ? 'block' : 'none';
    }
    
    // Disable inputs when playing
    if (timerSelect) timerSelect.disabled = isPlaying;
    if (inputState) inputState.disabled = isPlaying;
    if (btnSetState) btnSetState.disabled = isPlaying;
    if (btnReset) btnReset.disabled = isPlaying;
    if (btnShuffleInput) btnShuffleInput.disabled = isPlaying;
    if (btnEasy) btnEasy.disabled = isPlaying;
    if (btnMedium) btnMedium.disabled = isPlaying;
    if (btnHard) btnHard.disabled = isPlaying;
    if (btnRandomizeGoal) btnRandomizeGoal.disabled = isPlaying;
}

// --- Logic functions ---

function getInversions(board) {
    let inversions = 0;
    for (let i = 0; i < board.length - 1; i++) {
        for (let j = i + 1; j < board.length; j++) {
            if (board[i] !== 0 && board[j] !== 0 && board[i] > board[j]) {
                inversions++;
            }
        }
    }
    return inversions;
}

function isSolvable(board) {
    return getInversions(board) % 2 === 0;
}

function getManhattanDistance(board) {
    let dist = 0;
    for (let i = 0; i < board.length; i++) {
        let val = board[i];
        if (val !== 0) {
            let targetIdx = GOAL_STATE.indexOf(val);
            let targetX = targetIdx % 3;
            let targetY = Math.floor(targetIdx / 3);
            let currentX = i % 3;
            let currentY = Math.floor(i / 3);
            dist += Math.abs(currentX - targetX) + Math.abs(currentY - targetY);
        }
    }
    return dist;
}

// --- UI Interaction ---

function showMessage(msg, type) {
    msgBox.textContent = msg;
    msgBox.className = `message-box ${type}`;
    msgBox.classList.remove('hidden');
}

function hideMessage() {
    msgBox.classList.add('hidden');
}

function resetBoard() {
    pauseAutoPlay();
    resetTimer();
    currentBoard = [...GOAL_STATE];
    baseChallengeBoard = [...currentBoard];
    inputState.value = GOAL_STATE.join(',');
    clearSolution();
    updateBoardVisuals();
    updateMoveLimit();
    showMessage("Board reset to goal state.", "info");
}

function randomizeGoal() {
    stopAutoPlay();
    let oldGoalState = [...GOAL_STATE];
    let shuffled;
    do {
        shuffled = [...oldGoalState];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    } while (shuffled.toString() === oldGoalState.toString());
    
    GOAL_STATE = shuffled;
    updateGoalBoardVisuals();
    
    // Check if the current board is mutually solvable with the new goal
    if (getInversions(currentBoard) % 2 !== getInversions(GOAL_STATE) % 2) {
        fixParity(currentBoard);
        inputState.value = currentBoard.join(',');
        updateBoardVisuals();
    }
    
    resetTimer();
    clearSolution();
    updateMoveLimit();
    showMessage("Goal state randomly shuffled!", "info");
}

function fixParity(board) {
    let idx1 = -1, idx2 = -1;
    for (let i = 0; i < board.length; i++) {
        if (board[i] !== 0) {
            if (idx1 === -1) idx1 = i;
            else if (idx2 === -1) { idx2 = i; break; }
        }
    }
    let temp = board[idx1];
    board[idx1] = board[idx2];
    board[idx2] = temp;
}

function setDifficulty(level) {
    currentDifficultyLevel = level;
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.remove('btn-primary', 'active');
        btn.classList.add('btn-outline');
    });
    
    let activeBtn = null;
    if (level === 'Easy') activeBtn = btnEasy;
    else if (level === 'Medium') activeBtn = btnMedium;
    else if (level === 'Hard') activeBtn = btnHard;
    
    if (activeBtn) {
        activeBtn.classList.remove('btn-outline');
        activeBtn.classList.add('btn-primary', 'active');
    }
}

function randomizeCurrentBoard() {
    if (currentDifficultyLevel === 'Easy') {
        shuffleWithDepth(10, 'Easy');
    } else if (currentDifficultyLevel === 'Medium') {
        shuffleWithDepth(25, 'Medium');
    } else {
        silentlyRandomizeBoard(false);
        showMessage("Board shuffled (Hard). Click 'START GAME' to begin!", "info");
    }
}

function shuffleWithDepth(depth, levelStr) {
    stopAutoPlay();
    currentBoard = [...GOAL_STATE];
    let prevZeroIdx = -1;
    for (let i = 0; i < depth; i++) {
        let prevZeroIdxTemp = currentBoard.indexOf(0);
        let neighbors = getNeighbors(currentBoard);
        let validNeighbors = neighbors.filter(n => n.board.indexOf(0) !== prevZeroIdx);
        if (validNeighbors.length === 0) validNeighbors = neighbors;
        let nextState = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        prevZeroIdx = prevZeroIdxTemp;
        currentBoard = nextState.board;
    }
    
    while (currentBoard.toString() === GOAL_STATE.toString()) {
        let prevZeroIdxTemp = currentBoard.indexOf(0);
        let neighbors = getNeighbors(currentBoard);
        let validNeighbors = neighbors.filter(n => n.board.indexOf(0) !== prevZeroIdx);
        if (validNeighbors.length === 0) validNeighbors = neighbors;
        let nextState = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        prevZeroIdx = prevZeroIdxTemp;
        currentBoard = nextState.board;
    }
    
    baseChallengeBoard = [...currentBoard];
    inputState.value = currentBoard.join(',');
    clearSolution();
    updateBoardVisuals();
    updateMoveLimit();
    showMessage(`Board shuffled (${levelStr}). Click 'START GAME' to begin!`, "info");
}

function parseInputState() {
    stopAutoPlay();
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    let val = inputState.value.trim();
    let parts = val.split(',').map(x => parseInt(x.trim()));
    
    if (parts.length === 9 && new Set(parts).size === 9 && parts.every(x => x >= 0 && x <= 8)) {
        if (getInversions(parts) % 2 !== getInversions(GOAL_STATE) % 2) {
            showMessage("This puzzle state is UNSOLVABLE against the current Goal State.", "error");
            currentBoard = parts;
        }
        currentBoard = parts;
        baseChallengeBoard = [...currentBoard];
        resetTimer();
        clearSolution();
        updateBoardVisuals();
        updateMoveLimit();
        showMessage("Custom state loaded successfully.", "success");
    } else {
        showMessage("Invalid input. Must be 9 unique numbers 0-8 comma-separated.", "error");
    }
}

function clearSolution() {
    solutionPath = [];
    currentStepIndex = 0;
    isManualTracking = false;
    statMoves.textContent = "0";
    statExplored.textContent = "0";
    pathList.innerHTML = '<div class="empty-path">Play manually by clicking tiles! <br><br> Or map the AI path!</div>';
    
    if (aiSolveGroup) aiSolveGroup.style.display = 'flex';
    if (btnPlay) {
        btnPlay.style.display = 'flex';
        btnPlay.disabled = true;
    }
    if (btnPause) btnPause.style.display = 'none';
    if (btnResume) btnResume.style.display = 'none';
    if (btnNext) btnNext.disabled = true;
    
    btnSolve.disabled = false;
    if (btnSolveStart) btnSolveStart.disabled = false;
    btnSolve.innerHTML = "🎯 AI Solve Current";
}

// --- A* Solver ---

class PriorityQueue {
    constructor() { this.heap = []; }
    push(node) { this.heap.push(node); this.bubbleUp(this.heap.length - 1); }
    pop() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) { this.heap[0] = end; this.sinkDown(0); }
        return min;
    }
    bubbleUp(index) {
        let node = this.heap[index];
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            let parent = this.heap[parentIndex];
            if (node.f >= parent.f) break;
            this.heap[index] = parent;
            this.heap[parentIndex] = node;
            index = parentIndex;
        }
    }
    sinkDown(index) {
        let node = this.heap[index];
        let length = this.heap.length;
        while (true) {
            let leftChildIdx = 2 * index + 1;
            let rightChildIdx = 2 * index + 2;
            let swap = null;
            if (leftChildIdx < length && this.heap[leftChildIdx].f < node.f) { swap = leftChildIdx; }
            if (rightChildIdx < length) {
                if ((swap === null && this.heap[rightChildIdx].f < node.f) ||
                    (swap !== null && this.heap[rightChildIdx].f < this.heap[leftChildIdx].f)) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.heap[index] = this.heap[swap];
            this.heap[swap] = node;
            index = swap;
        }
    }
    isEmpty() { return this.heap.length === 0; }
}

function getNeighbors(board) {
    let neighbors = [];
    let zeroIdx = board.indexOf(0);
    let row = Math.floor(zeroIdx / 3);
    let col = zeroIdx % 3;
    let moves = [
        { dRow: -1, dCol: 0, prefix: "Up" },
        { dRow: 1, dCol: 0, prefix: "Down" },
        { dRow: 0, dCol: -1, prefix: "Left" },
        { dRow: 0, dCol: 1, prefix: "Right" }
    ];
    for (let m of moves) {
        let nRow = row + m.dRow;
        let nCol = col + m.dCol;
        if (nRow >= 0 && nRow < 3 && nCol >= 0 && nCol < 3) {
            let nIdx = nRow * 3 + nCol;
            let newBoard = [...board];
            let swappedVal = newBoard[nIdx];
            newBoard[zeroIdx] = swappedVal;
            newBoard[nIdx] = 0;
            neighbors.push({ board: newBoard, move: `Move ${swappedVal} ${getOppositeDir(m.prefix)}` });
        }
    }
    return neighbors;
}

function getOppositeDir(dir) {
    if (dir === "Up") return "Down";
    if (dir === "Down") return "Up";
    if (dir === "Left") return "Right";
    return "Left";
}

function startSolver(fromStart = false) {
    let originalLimit = moveLimit;
    let originalCurrentStepIndex = currentStepIndex;
    let isGameWasRunning = isGameRunning;

    if (isGameRunning) {
        endGame(false, "AI took over your game! Solution revealed.");
    } else {
        stopTimer();
    }
    
    if (fromStart) {
        if (baseChallengeBoard) {
            currentBoard = [...baseChallengeBoard];
            updateBoardVisuals();
        }
        clearSolution();
    }
    
    if (currentBoard.toString() === GOAL_STATE.toString()) {
        showMessage("Puzzle is already solved!", "success");
        return;
    }
    if (getInversions(currentBoard) % 2 !== getInversions(GOAL_STATE) % 2) {
        showMessage("This puzzle state is UNSOLVABLE strictly against this Goal.", "error");
        statLimit.textContent = "N/A";
        moveLimit = null;
        return;
    }
    
    isSolving = true;
    isManualTracking = false;
    btnSolve.disabled = true;
    btnSolve.textContent = "Running A*...";
    showMessage("Running A* Search...", "info");
    
    setTimeout(() => {
        let result = solveAStar(currentBoard);
        isSolving = false;
        if (result) {
            buildSolutionPath(result.node, []);
            statExplored.textContent = result.exploredCount;
            let aiRequired = result.node.g;
            
            let msg = `AI path: ${aiRequired} moves required. Move limit adjusted to ${aiRequired}. Click Play!`;

            if (isGameWasRunning && originalLimit !== null && !fromStart) {
                let remaining = originalLimit - originalCurrentStepIndex;
                if (aiRequired > remaining) {
                    msg = `Warning: Unsolvable within constraints! AI needs ${aiRequired} moves, only ${remaining} left.`;
                    showMessage(msg, "error");
                } else {
                    showMessage(msg, "success");
                }
            } else {
                showMessage(msg, "success");
            }
            
            if (aiSolveGroup) aiSolveGroup.style.display = 'none';
            if (btnPlay) {
                btnPlay.style.display = 'flex';
                btnPlay.disabled = false;
            }
            if (btnPause) btnPause.style.display = 'none';
            if (btnResume) btnResume.style.display = 'none';
            if (btnNext) btnNext.disabled = false;
            
            renderPathList();
        } else {
            showMessage("Could not find a solution.", "error");
            btnSolve.disabled = false;
            if (btnSolveStart) btnSolveStart.disabled = false;
            btnSolve.innerHTML = "🎯 AI Solve Current";
            statLimit.textContent = "N/A";
            moveLimit = null;
        }
    }, 50);
}

function solveAStar(initialBoard) {
    let pq = new PriorityQueue();
    let startNode = {
        board: initialBoard, g: 0, f: getManhattanDistance(initialBoard), parent: null, move: "Start"
    };
    pq.push(startNode);
    let explored = new Set();
    let exploredCount = 0;
    let gMap = new Map();
    gMap.set(initialBoard.toString(), 0);
    
    while (!pq.isEmpty()) {
        let current = pq.pop();
        let boardStr = current.board.toString();
        if (explored.has(boardStr)) continue;
        exploredCount++;
        
        // Prevent browser crash on far states
        if (exploredCount > 8000) return null;
        
        if (boardStr === GOAL_STATE.toString()) return { node: current, exploredCount: exploredCount };
        explored.add(boardStr);
        let neighbors = getNeighbors(current.board);
        for (let n of neighbors) {
            let nStr = n.board.toString();
            if (explored.has(nStr)) continue;
            let tentativeG = current.g + 1;
            if (!gMap.has(nStr) || tentativeG < gMap.get(nStr)) {
                gMap.set(nStr, tentativeG);
                let h = getManhattanDistance(n.board);
                let f = tentativeG + h;
                pq.push({ board: n.board, g: tentativeG, f: f, parent: current, move: n.move });
            }
        }
    }
    return null;
}

function buildSolutionPath(endNode, prefixPath = []) {
    let path = [];
    let curr = endNode;
    while (curr) { path.push(curr); curr = curr.parent; }
    let aiPath = path.reverse();
    
    if (prefixPath && prefixPath.length > 0) {
        let offsetG = prefixPath.length - 1;
        aiPath.shift(); // Remove the overlapping current state
        for (let i = 0; i < aiPath.length; i++) {
            let n = aiPath[i];
            n.g = offsetG + i + 1;
            n.f = n.g + getManhattanDistance(n.board);
            if (n.move && !n.move.includes("(AI)")) n.move = n.move + " (AI)";
        }
        solutionPath = prefixPath.concat(aiPath);
        currentStepIndex = offsetG;
    } else {
        for (let n of aiPath) {
            if (n.g > 0 && n.move && !n.move.includes("(AI)")) n.move = n.move + " (AI)";
        }
        solutionPath = aiPath;
        currentStepIndex = 0;
    }
    
    statMoves.textContent = currentStepIndex;
    
    // Adjust limit dynamically
    moveLimit = solutionPath.length - 1;
    statLimit.textContent = moveLimit;
}

function renderPathList() {
    pathList.innerHTML = '';
    solutionPath.forEach((node, idx) => {
        let div = document.createElement('div');
        div.className = 'path-item';
        div.id = `path-item-${idx}`;
        div.innerHTML = `<span class="path-step">${idx}. ${node.move}</span><span class="path-cost">f: ${node.f}</span>`;
        pathList.appendChild(div);
    });
    highlightCurrentStep();
}

function highlightCurrentStep() {
    document.querySelectorAll('.path-item').forEach(el => el.classList.remove('active'));
    let activeItem = document.getElementById(`path-item-${currentStepIndex}`);
    if (activeItem) {
        activeItem.classList.add('active');
        
        // Prevent window jumping by scrolling container directly
        pathList.scrollTo({
            top: activeItem.offsetTop,
            behavior: 'smooth'
        });
    }
}

function playNextMove() {
    if (currentStepIndex < solutionPath.length - 1) {
        isSolving = true;
        currentStepIndex++;
        currentBoard = solutionPath[currentStepIndex].board;
        statMoves.textContent = currentStepIndex;
        updateBoardVisuals();
        highlightCurrentStep();
        if (currentStepIndex === solutionPath.length - 1) {
            btnNext.disabled = true;
            pauseAutoPlay();
            btnPause.style.display = 'none';
            btnPlay.style.display = 'flex';
            isSolving = false;
            showMessage("Goal Reached automatically!", "success");
        }
        setTimeout(() => isSolving = false, 300); // Wait for CSS transition
    }
}

function btnPlayClicked() {
    btnPlay.style.display = 'none';
    btnResume.style.display = 'none';
    btnPause.style.display = 'flex';
    btnNext.disabled = true;
    startAutoPlay();
}

function btnPauseClicked() {
    btnPause.style.display = 'none';
    btnResume.style.display = 'flex';
    btnNext.disabled = false;
    pauseAutoPlay();
}

function startAutoPlay() {
    if (autoPlayInterval) return;
    if (currentStepIndex >= solutionPath.length - 1) {
        currentStepIndex = 0;
        currentBoard = solutionPath[0].board;
        statMoves.textContent = "0";
        updateBoardVisuals();
        highlightCurrentStep();
        hideMessage();
    }
    autoPlayInterval = setInterval(playNextMove, 500);
}

function pauseAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}

function updateMoveLimit() {
    statLimit.innerHTML = `<span style="font-size: 0.7em;">opt</span>`;
    moveLimit = null;
    if (getInversions(currentBoard) % 2 !== getInversions(GOAL_STATE) % 2) {
        statLimit.textContent = "N/A";
        return;
    }
    setTimeout(() => {
        let maxMoves = getOptimalMoveCount(currentBoard);
        if (maxMoves !== null) {
            moveLimit = maxMoves;
            statLimit.textContent = moveLimit;
        } else {
            statLimit.textContent = "∞";
        }
    }, 10);
}

function getOptimalMoveCount(board) {
    if (board.toString() === GOAL_STATE.toString()) return 0;
    let pq = new PriorityQueue();
    let startNode = { board: board, g: 0, f: getManhattanDistance(board) };
    pq.push(startNode);
    let explored = new Set();
    let gMap = new Map();
    gMap.set(board.toString(), 0);
    
    let exploredCount = 0;
    while (!pq.isEmpty()) {
        let current = pq.pop();
        let boardStr = current.board.toString();
        if (explored.has(boardStr)) continue;
        
        exploredCount++;
        // Limit exploration to avoid completely freezing main thread on random huge shuffles
        if (exploredCount > 8000) return null;
        
        if (boardStr === GOAL_STATE.toString()) return current.g;
        explored.add(boardStr);
        let neighbors = getNeighbors(current.board);
        for (let n of neighbors) {
            let nStr = n.board.toString();
            if (explored.has(nStr)) continue;
            let tentativeG = current.g + 1;
            if (!gMap.has(nStr) || tentativeG < gMap.get(nStr)) {
                gMap.set(nStr, tentativeG);
                pq.push({ board: n.board, g: tentativeG, f: tentativeG + getManhattanDistance(n.board) });
            }
        }
    }
    return null;
}

// Start
init();

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => console.log('SW Registered!')).catch(err => console.log('SW failed: ', err));
    });
}
