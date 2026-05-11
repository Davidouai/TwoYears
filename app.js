const data = window.SOUVENIRS_DATA || [];
const totalSteps = data.length;
let currentIndex = 0;
let totalHelpUsed = 0;
let currentHelpLevel = 0;
const pixelScales = [1/40, 1/24, 1/16, 1/10, 1/6, 1/3, 1];
const maxHelpLevel = pixelScales.length - 1;
const solvedStages = Array(totalSteps).fill(false);
const helpByStage = Array(totalSteps).fill(0);

const totalStepsEl = document.getElementById("totalSteps");
const stageTotalEl = document.getElementById("stageTotal");
if (totalStepsEl) totalStepsEl.textContent = totalSteps;
if (stageTotalEl) stageTotalEl.textContent = totalSteps;

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const stepper = document.getElementById("stepper");
const stageName = document.getElementById("stageName");
const helpCount = document.getElementById("helpCount");
const helpGaugeFill = document.getElementById("helpGaugeFill");
const helpGaugeText = document.getElementById("helpGaugeText");
const mediaGrid = document.getElementById("mediaGrid");
const guessInput = document.getElementById("guessInput");
const helpBtn = document.getElementById("helpBtn");
const submitBtn = document.getElementById("submitBtn");
const feedbackText = document.getElementById("feedbackText");
const finalScreen = document.getElementById("finalScreen");
const finalHelpCount = document.getElementById("finalHelpCount");
const finalMessage = document.getElementById("finalMessage");
const restartBtn = document.getElementById("restartBtn");
const confettiRoot = document.getElementById("confetti");

function encodeResource(src) {
  return encodeURI(src);
}

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "et")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, j) => j);
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarityScore(value, expected) {
  const source = normalizeText(value);
  const target = normalizeText(expected);
  if (!source.length || !target.length) return 0;
  if (source === target) return 1;
  if (target.includes(source) || source.includes(target)) return 0.95;
  const distance = levenshtein(source, target);
  return 1 - distance / Math.max(source.length, target.length);
}

function isCorrectAnswer(value, expected) {
  const normalizedValue = normalizeText(value);
  const normalizedExpected = normalizeText(expected);
  if (!normalizedValue.length) return false;
  if (normalizedValue === normalizedExpected) return true;
  return similarityScore(normalizedValue, normalizedExpected) >= 0.7;
}

function renderStepper() {
  stepper.innerHTML = data
    .map((_step, index) => {
      const completed = solvedStages[index];
      const isActive = index === currentIndex;
      const classes = ["step"];
      if (isActive) classes.push("active");
      if (completed) classes.push("completed");
      const label = completed && !isActive ? "✓" : `${index + 1}`;
      return `<span class="${classes.join(" ")}">${label}</span>`;
    })
    .join("");
}

function drawPixelated(canvas, source, scale) {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  // Dark background (letterboxing)
  ctx.fillStyle = "#3a0e25";
  ctx.fillRect(0, 0, sw, sh);

  // object-fit: contain — preserve aspect ratio
  const natW = source.naturalWidth || source.videoWidth || 0;
  const natH = source.naturalHeight || source.videoHeight || 0;
  if (natW && natH) {
    const ratio = Math.min(sw / natW, sh / natH);
    const fw = Math.max(1, Math.round(natW * ratio));
    const fh = Math.max(1, Math.round(natH * ratio));
    ctx.drawImage(source, Math.round((sw - fw) / 2), Math.round((sh - fh) / 2), fw, fh);
  } else {
    ctx.drawImage(source, 0, 0, sw, sh);
  }

  // Scale the tiny sw×sh region back up to fill the canvas
  ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, w, h);
}

function renderMedia(stage) {
  mediaGrid.innerHTML = "";
  const solved = solvedStages[currentIndex];
  const showQuestion = !solved && currentHelpLevel === 0;
  const useCanvas = !solved && currentHelpLevel < maxHelpLevel;
  const scale = useCanvas ? pixelScales[currentHelpLevel] : 1;

  stage.media.forEach((item) => {
    const card = document.createElement("div");
    card.className = `media-card ${solved ? "revealed" : ""}`;

    let mediaElement;

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = encodeResource(item.src);
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "metadata";

      if (useCanvas) {
        const canvas = document.createElement("canvas");
        canvas.className = "media";
        if (currentHelpLevel === 0) canvas.classList.add("blur");
        video.play().catch(() => {});
        requestAnimationFrame(function loop() {
          if (!canvas.isConnected) return;
          if (video.readyState >= 2) drawPixelated(canvas, video, scale);
          requestAnimationFrame(loop);
        });
        mediaElement = canvas;
      } else {
        video.className = "media";
        video.addEventListener("canplay", () => {
          if (!video.paused) video.play().catch(() => {});
        });
        mediaElement = video;
      }
    } else {
      if (useCanvas) {
        const canvas = document.createElement("canvas");
        canvas.className = "media";
        if (currentHelpLevel === 0) canvas.classList.add("blur");
        const img = new Image();
        img.onload = function () {
          requestAnimationFrame(function () {
            if (!canvas.isConnected) return;
            drawPixelated(canvas, img, scale);
          });
        };
        img.src = encodeResource(item.src);
        mediaElement = canvas;
      } else {
        const img = document.createElement("img");
        img.src = encodeResource(item.src);
        img.alt = stage.title;
        img.className = "media";
        mediaElement = img;
      }
    }

    card.appendChild(mediaElement);

    const overlay = document.createElement("div");
    overlay.className = "media-overlay";
    if (solved) {
      overlay.style.opacity = "0";
      overlay.textContent = "";
    } else if (showQuestion) {
      overlay.style.opacity = "1";
      overlay.textContent = "?";
    } else {
      overlay.style.opacity = "0";
      overlay.textContent = "";
    }

    card.appendChild(overlay);
    mediaGrid.appendChild(card);
  });
}

function updateProgress() {
  progressText.textContent = `Étape ${currentIndex + 1} / ${totalSteps}`;
  stageName.textContent = `${currentIndex + 1}`;
  helpCount.textContent = totalHelpUsed;
  const progressValue = totalSteps > 1 ? (currentIndex / (totalSteps - 1)) * 100 : 100;
  progressFill.style.width = `${progressValue}%`;
  renderHelpGauge();
}

function renderHelpGauge() {
  helpGaugeText.textContent = `${currentHelpLevel} / ${maxHelpLevel}`;
  helpGaugeFill.style.width = `${(currentHelpLevel / maxHelpLevel) * 100}%`;
  helpGaugeFill.classList.toggle("empty", currentHelpLevel === 0);
}

function setButtonsState() {
  const solved = solvedStages[currentIndex];
  const hasMaxHelp = currentHelpLevel >= maxHelpLevel;
  helpBtn.disabled = solved || hasMaxHelp;
  if (solved) {
    submitBtn.textContent = "Suivant →";
    submitBtn.disabled = false;
  } else {
    submitBtn.textContent = "Valider";
    submitBtn.disabled = false;
  }
}

function renderStage() {
  const stage = data[currentIndex];
  renderStepper();
  updateProgress();
  renderMedia(stage);
  setButtonsState();
  feedbackText.textContent = "";
  guessInput.value = "";
  guessInput.disabled = solvedStages[currentIndex];
  if (!solvedStages[currentIndex]) {
    finalScreen.classList.add("hidden");
  }
}

function showSuccessMessage(stage) {
  feedbackText.textContent = `🎉 Bravo ! C'était bien ${stage.answer}.`;
  feedbackText.style.color = "#3a1525";
}

function startConfetti() {
  confettiRoot.innerHTML = "";
  for (let index = 0; index < 22; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const size = Math.random() * 10 + 8;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.background = index % 2 === 0 ? "#f4a8a2" : "#e88a82";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${Math.random() * 1 + 1.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiRoot.appendChild(piece);
  }
  window.setTimeout(() => { confettiRoot.innerHTML = ""; }, 1800);
}

function submitAnswer() {
  const solved = solvedStages[currentIndex];
  if (solved) { nextStage(); return; }
  const stage = data[currentIndex];
  const guess = guessInput.value.trim();

  const cheat = normalizeText(guess).match(/^etape\s+(\d+)$/);
  if (cheat) {
    const target = parseInt(cheat[1], 10) - 1;
    if (target >= 0 && target < totalSteps) {
      for (let i = 0; i < target; i++) solvedStages[i] = true;
      currentIndex = target;
      currentHelpLevel = helpByStage[currentIndex] || 0;
      renderStage();
    }
    return;
  }
  if (!guess) {
    feedbackText.textContent = "Écris un mot pour commencer.";
    feedbackText.style.color = "#8b6f72";
    return;
  }
  const score = similarityScore(guess, stage.answer);
  if (isCorrectAnswer(guess, stage.answer)) {
    solvedStages[currentIndex] = true;
    helpBtn.disabled = true;
    renderStage();
    showSuccessMessage(stage);
    startConfetti();
    return;
  }
  const percent = Math.round(score * 100);
  feedbackText.textContent = percent > 45
    ? `Presque ! Similarité ${percent} %`
    : `Ce n'est pas encore ça. (${percent} %)`;
  feedbackText.style.color = "#8b6f72";
}

function requestHelp() {
  if (solvedStages[currentIndex] || currentHelpLevel >= maxHelpLevel) return;
  currentHelpLevel += 1;
  helpByStage[currentIndex] = currentHelpLevel;
  totalHelpUsed += 1;
  renderStage();
}

function nextStage() {
  if (currentIndex >= totalSteps - 1) { showFinalScreen(); return; }
  currentIndex += 1;
  currentHelpLevel = helpByStage[currentIndex] || 0;
  renderStage();
}

function showFinalScreen() {
  finalHelpCount.textContent = totalHelpUsed;
  finalMessage.textContent = `Un score exceptionnel qui me fait t'aimer encore plus !`;
  finalScreen.classList.remove("hidden");
}

function restartGame() {
  currentIndex = 0;
  totalHelpUsed = 0;
  currentHelpLevel = 0;
  solvedStages.fill(false);
  helpByStage.fill(0);
  renderStage();
}

helpBtn.addEventListener("click", requestHelp);
submitBtn.addEventListener("click", submitAnswer);
restartBtn.addEventListener("click", restartGame);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitAnswer();
});

renderStage();
