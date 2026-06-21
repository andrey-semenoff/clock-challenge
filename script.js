const body = document.body;
const clockFace = document.getElementById("clock-face");
const clockEl = document.getElementById("clock");
const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");
const levelSelect = document.getElementById("level-select");
const proModeCheckbox = document.getElementById("pro-mode-checkbox");
const modeSelect = document.getElementById("mode-select");
const roundsSelect = document.getElementById("rounds-select");
const timeoutSelect = document.getElementById("timeout-select");
const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");
const input = document.getElementById("time-input");
const feedbackText = document.getElementById("feedback-text");
const scoreCount = document.getElementById("score-count");
const roundCount = document.getElementById("round-count");
const elapsedDisplay = document.getElementById("elapsed-display");
const countdownDisplay = document.getElementById("countdown-display");
const countdownContainer = document.getElementById("countdown-container");
const boardLabel = document.getElementById("board-label");
const inputLabel = document.getElementById("input-label");
const submitButton = document.getElementById("submit-button");
const nextButton = document.getElementById("next-button");

let currentTime = null;
let score = 0;
let round = 0;
let level = 1;
let maxRounds = 10;
let countdown = 0;
let elapsedSeconds = 0;
let timeoutMode = false;
let proMode = false;
let hasSubmittedAnswer = false;
let timerId = null;
let gameActive = false;
let taskSet = new Set();
let totalPossibleTasks = 0;

const romanLabels = [
  "XII",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
];
const levelDescriptions = {
  1: "Arabic numbers, full hours",
  2: "Arabic numbers, half hours",
  3: "Arabic numbers, quarter hours",
  4: "Arabic numbers, 5-minute steps",
  5: "Arabic numbers, any minute",
  6: "Roman numerals, any minute",
  7: "Major dashes only",
  8: "5-minute ticks only",
  9: "Empty dial only",
};

function getMinuteStep() {
  if (level === 1) return 60;
  if (level === 2) return 30;
  if (level === 3) return 15;
  if (level === 4) return 5;
  return 1;
}

function getRandomTime() {
  const hour = Math.floor(Math.random() * 24);
  const step = getMinuteStep();
  const minute =
    step === 60 ? 0 : Math.floor(Math.random() * (60 / step)) * step;
  const second = proMode ? Math.floor(Math.random() * 60) : 0;
  return { hour, minute, second };
}

function getTotalPossibleTasks() {
  if (level === 1) return 24;
  if (level === 2) return 48;
  if (level === 3) return 96;
  if (level === 4) return 288;
  return proMode ? 24 * 60 * 60 : 24 * 60;
}

function taskKey(time) {
  return proMode
    ? `${time.hour}:${time.minute}:${time.second}`
    : `${time.hour}:${time.minute}`;
}

function generateUniqueTime() {
  if (taskSet.size >= totalPossibleTasks) {
    return null;
  }

  let attempts = 0;
  while (attempts < 1000) {
    const candidate = getRandomTime();
    const key = taskKey(candidate);
    if (!taskSet.has(key)) {
      taskSet.add(key);
      return candidate;
    }
    attempts += 1;
  }

  const step = getMinuteStep();
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += step) {
      const secondsToCheck = proMode ? 60 : 1;
      for (let second = 0; second < secondsToCheck; second += 1) {
        const candidate = { hour, minute, second };
        const key = taskKey(candidate);
        if (!taskSet.has(key)) {
          taskSet.add(key);
          return candidate;
        }
      }
    }
  }

  return null;
}

function formatTime(time) {
  const hours = String(time.hour).padStart(2, "0");
  const minutes = String(time.minute).padStart(2, "0");
  if (proMode) {
    const seconds = String(time.second).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}`;
}

function parseInput(value) {
  const digits = value.replace(/\D/g, "");
  if (proMode) {
    if (digits.length < 5 || digits.length > 6) return null;
    const hour = Number(digits.slice(0, digits.length - 4));
    const minute = Number(digits.slice(-4, -2));
    const second = Number(digits.slice(-2));
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(second)
    )
      return null;
    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      second < 0 ||
      second > 59
    )
      return null;
    return { hour, minute, second };
  }

  if (digits.length < 3 || digits.length > 4) return null;
  const hour = Number(digits.slice(0, digits.length - 2));
  const minute = Number(digits.slice(-2));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute, second: 0 };
}

function updateStatus(message, status = "neutral") {
  feedbackText.textContent = message;
  feedbackText.style.color =
    status === "success"
      ? "var(--success)"
      : status === "danger"
        ? "var(--danger)"
        : "var(--text-muted-dark)";
}

function updateInputLabel() {
  inputLabel.textContent = `Enter ${proMode ? "HHMMSS" : "HHMM"}`;
  input.placeholder = proMode ? "e.g. 073015" : "e.g. 0725";
}

function setControlState(active) {
  input.disabled = !active;
  submitButton.disabled = !active;
  stopButton.disabled = !active;
  nextButton.disabled = !active || !hasSubmittedAnswer;
}

function formatTimeInput() {
  const digits = input.value.replace(/\D/g, "").slice(0, proMode ? 6 : 4);
  if (proMode) {
    if (digits.length <= 2) {
      input.value = digits;
    } else if (digits.length <= 4) {
      input.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    } else {
      input.value = `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
    }
  } else {
    if (digits.length <= 2) {
      input.value = digits;
    } else {
      input.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
  }
}

function updateScoreboard() {
  scoreCount.textContent = score;
  roundCount.textContent = round;
}

function renderClockFace() {
  clockFace.innerHTML = "";
  const hasLabels = level <= 6;
  const useRoman = level === 6;
  const hasDots = level <= 6;
  const hasMajorDashes = level === 7;
  const hasTicks = level === 8;
  const showEmpty = level === 9;

  if (hasDots) {
    for (let i = 0; i < 60; i += 1) {
      const dot = document.createElement("div");
      dot.className = "minute-dot";
      dot.style.setProperty("--rotation", `${i * 6}deg`);
      clockFace.appendChild(dot);
    }
  }

  if (showEmpty) {
    return;
  }

  for (let index = 0; index < 12; index += 1) {
    const marker = document.createElement("div");
    marker.className = "marker";
    marker.style.setProperty("--rotation", `${index * 30}deg`);

    const labelValue = index === 0 ? 12 : index;
    if (hasLabels) {
      const label = document.createElement("span");
      label.className = "marker-label";
      label.textContent = useRoman ? romanLabels[index] : String(labelValue);
      marker.classList.add("number-marker");
      marker.appendChild(label);
      marker.style.setProperty("--marker-width", "0");
      marker.style.setProperty("--marker-height", "0");
    } else {
      marker.style.setProperty(
        "--marker-width",
        hasMajorDashes ? (index % 3 === 0 ? "4px" : "2px") : "4px",
      );
      marker.style.setProperty(
        "--marker-height",
        hasMajorDashes ? (index % 3 === 0 ? "20px" : "12px") : "16px",
      );
    }

    if (hasTicks) {
      marker.style.setProperty("--marker-width", "2px");
      marker.style.setProperty("--marker-height", "16px");
    }

    clockFace.appendChild(marker);
  }
}

function setTheme(time) {
  const isDay = time.hour >= 6 && time.hour < 18;
  body.classList.toggle("day-mode", isDay);
  body.classList.toggle("night-mode", !isDay);
}

function setClock(time) {
  const hourAngle =
    ((time.hour % 12) + time.minute / 60 + time.second / 3600) * 30;
  const minuteAngle = (time.minute + time.second / 60) * 6;
  const secondAngle = time.second * 6;

  hourHand.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
  secondHand.style.transform = `translateX(-50%) rotate(${secondAngle}deg)`;
  secondHand.style.display = proMode ? "block" : "none";
}

function formatElapsed(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remSeconds}`;
}

function updateTimers() {
  elapsedDisplay.textContent = formatElapsed(elapsedSeconds);
  if (!timeoutMode) return;

  countdown -= 1;
  countdownDisplay.textContent = countdown;
  if (countdown <= 0) {
    countdown = 0;
    updateStatus("Time is up! Restart to play again.", "danger");
    endGame();
  }
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    if (!gameActive) return;
    elapsedSeconds += 1;
    updateTimers();
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function beginGame() {
  level = Number(levelSelect.value);
  timeoutMode = modeSelect.value === "timeout";
  proMode = proModeCheckbox.checked && level >= 5;
  maxRounds = Number(roundsSelect.value);
  score = 0;
  round = 0;
  elapsedSeconds = 0;
  countdown = timeoutMode ? Number(timeoutSelect.value) : 0;
  hasSubmittedAnswer = false;
  taskSet.clear();
  totalPossibleTasks = getTotalPossibleTasks();
  gameActive = true;

  startButton.disabled = true;
  levelSelect.disabled = true;
  proModeCheckbox.disabled = true;
  modeSelect.disabled = true;
  roundsSelect.disabled = true;
  timeoutSelect.disabled = !timeoutMode;
  nextButton.disabled = true;
  countdownContainer.classList.toggle("hidden", !timeoutMode);
  boardLabel.textContent = `${levelDescriptions[level]}${proMode ? " + seconds" : ""}`;

  renderClockFace();
  updateInputLabel();
  setControlState(true);
  nextRound();
  input.focus();
  if (clockEl && clockEl.scrollIntoView) {
    clockEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  startTimer();
}

function endGame() {
  gameActive = false;
  stopTimer();
  levelSelect.disabled = false;
  proModeCheckbox.disabled = false;
  modeSelect.disabled = false;
  roundsSelect.disabled = false;
  timeoutSelect.disabled = true;
  startButton.disabled = false;
  setControlState(false);
}

function nextRound() {
  if (!gameActive) {
    updateStatus("Press Start game to begin.", "neutral");
    return;
  }

  if (round >= maxRounds && !timeoutMode) {
    updateStatus(`You reached ${maxRounds} rounds. Game stopped.`, "neutral");
    endGame();
    return;
  }

  const candidate = generateUniqueTime();
  if (!candidate) {
    updateStatus("You answered all possible tasks. Game stopped.", "neutral");
    endGame();
    return;
  }

  currentTime = candidate;
  setClock(currentTime);
  setTheme(currentTime);
  round += 1;
  updateScoreboard();
  input.value = "";
  hasSubmittedAnswer = false;
  nextButton.disabled = true;
  setControlState(true);
  updateStatus(
    `Enter the time shown on the clock as ${proMode ? "HHMMSS" : "HHMM"} in 24-hour format.`,
    "neutral",
  );
}

function submitAnswer() {
  if (!gameActive) {
    updateStatus("Start the game first and choose a level.", "danger");
    return;
  }

  if (hasSubmittedAnswer) {
    nextRound();
    return;
  }

  const guess = parseInput(input.value);
  if (!guess) {
    updateStatus(
      `Use digits only, e.g. ${proMode ? "073015" : "0730"} for 24-hour time.`,
      "danger",
    );
    return;
  }

  const answer = formatTime(guess);
  const correct = formatTime(currentTime);
  if (answer === correct) {
    score += 1;
    updateStatus(
      `Great! ${correct} is correct. Press Enter or Next clock for the next round.`,
      "success",
    );
    updateScoreboard();
  } else {
    updateStatus(
      `Not quite. The correct answer was ${correct}. Press Enter or Next clock to continue.`,
      "danger",
    );
  }
  hasSubmittedAnswer = true;
  nextButton.disabled = false;
}

submitButton.addEventListener("click", submitAnswer);
input.addEventListener("input", formatTimeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (hasSubmittedAnswer) {
      nextRound();
    } else {
      submitAnswer();
    }
  }
});

nextButton.addEventListener("click", nextRound);
stopButton.addEventListener("click", () => {
  endGame();
  updateStatus("Game stopped. Pick a level and start again.", "neutral");
});
startButton.addEventListener("click", beginGame);

modeSelect.addEventListener("change", () => {
  const isTimeout = modeSelect.value === "timeout";
  timeoutSelect.disabled = !isTimeout;
  roundsSelect.disabled = isTimeout;
});

levelSelect.addEventListener("change", () => {
  const selectedLevel = Number(levelSelect.value);
  proModeCheckbox.disabled = selectedLevel < 5;
  if (selectedLevel < 5) {
    proModeCheckbox.checked = false;
  }
  updateInputLabel();
});

proModeCheckbox.addEventListener("change", () => {
  updateInputLabel();
});

window.addEventListener("DOMContentLoaded", () => {
  countdownContainer.classList.add("hidden");
  proModeCheckbox.disabled = true;
  roundsSelect.disabled = modeSelect.value === "timeout";
  updateInputLabel();
  updateStatus("Pick a level and start the game.", "neutral");
});
