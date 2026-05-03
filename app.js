const app = document.querySelector("#app");
const progressBar = document.querySelector("#progressBar");
const STORAGE_KEY = "chartComparisonStudyResults";

const colors = [
  "#116466",
  "#d79a28",
  "#7b4f9d",
  "#bf5b45",
  "#3f7cac",
  "#6c8f3d",
  "#c44e87",
  "#5b6770",
  "#e07a2f"
];

const categoryNames = [
  "Atlas",
  "Beacon",
  "Cedar",
  "Delta",
  "Ember",
  "Fable",
  "Grove",
  "Harbor",
  "Indigo"
];

const datasets = [
  { id: "simple-1", difficulty: "simple", values: [44, 33, 23] },
  { id: "simple-2", difficulty: "simple", values: [38, 35, 27] },
  { id: "simple-3", difficulty: "simple", values: [52, 26, 22] },
  { id: "simple-4", difficulty: "simple", values: [41, 31, 28] },
  { id: "simple-5", difficulty: "simple", values: [47, 29, 24] },
  { id: "medium-1", difficulty: "medium", values: [25, 21, 18, 15, 12, 9] },
  { id: "medium-2", difficulty: "medium", values: [23, 22, 18, 14, 13, 10] },
  { id: "medium-3", difficulty: "medium", values: [30, 20, 16, 14, 11, 9] },
  { id: "medium-4", difficulty: "medium", values: [24, 19, 18, 17, 13, 9] },
  { id: "medium-5", difficulty: "medium", values: [28, 19, 17, 15, 12, 9] },
  { id: "difficult-1", difficulty: "difficult", values: [18, 15, 13, 12, 11, 10, 8, 7, 6] },
  { id: "difficult-2", difficulty: "difficult", values: [17, 15, 14, 12, 10, 9, 9, 8, 6] },
  { id: "difficult-3", difficulty: "difficult", values: [19, 14, 13, 12, 10, 10, 9, 7, 6] },
  { id: "difficult-4", difficulty: "difficult", values: [16, 15, 13, 12, 11, 10, 9, 8, 6] },
  { id: "difficult-5", difficulty: "difficult", values: [18, 14, 13, 12, 11, 9, 9, 8, 6] }
];

const literacyQuestions = [
  {
    id: "lit-bar-largest",
    title: "Question 1 of 3",
    prompt: "Which category has the largest value?",
    type: "bar",
    data: [
      { label: "A", value: 22 },
      { label: "B", value: 41 },
      { label: "C", value: 35 },
      { label: "D", value: 18 }
    ],
    options: ["A", "B", "C", "D"],
    answer: "B"
  },
  {
    id: "lit-line-trend",
    title: "Question 2 of 3",
    prompt: "What overall pattern does this line chart show?",
    type: "line",
    data: [12, 17, 19, 24, 31, 35],
    options: ["Mostly increasing", "Mostly decreasing", "No change", "Cannot tell"],
    answer: "Mostly increasing"
  },
  {
    id: "lit-part-whole",
    title: "Question 3 of 3",
    prompt: "About how much of the total does Category A represent?",
    type: "pie",
    data: [
      { label: "A", value: 50 },
      { label: "B", value: 30 },
      { label: "C", value: 20 }
    ],
    options: ["About 10%", "About 25%", "About 50%", "About 80%"],
    answer: "About 50%"
  }
];

const state = {
  phase: "consent",
  literacyIndex: 0,
  trialIndex: 0,
  trials: [],
  datasetLabelOrders: {},
  participantId: createParticipantId(),
  literacyResponses: [],
  trialResponses: [],
  currentSelection: [],
  trialStartedAt: null
};

function createParticipantId() {
  return `p-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function cloneTemplate(id) {
  app.innerHTML = "";
  const template = document.querySelector(id);
  app.appendChild(template.content.cloneNode(true));
  app.focus();
}

function updateProgress() {
  const literacyTotal = literacyQuestions.length;
  const trialTotal = state.trials.length || 63;
  let done = 0;
  let total = 1 + literacyTotal + 1 + trialTotal + 1;

  if (state.phase !== "consent") done += 1;
  done += state.literacyResponses.length;
  if (["trial", "complete"].includes(state.phase)) done += 1;
  done += state.trialResponses.length;
  if (state.phase === "complete") done += 1;

  progressBar.style.width = `${Math.min(100, Math.round((done / total) * 100))}%`;
}

function showConsent() {
  state.phase = "consent";
  updateProgress();
  cloneTemplate("#consentTemplate");
  const check = document.querySelector("#consentCheck");
  const next = document.querySelector("#consentNext");
  check.addEventListener("change", () => {
    next.disabled = !check.checked;
  });
  next.addEventListener("click", showLiteracy);
}

function showLiteracy() {
  state.phase = "literacy";
  updateProgress();
  cloneTemplate("#literacyTemplate");
  const question = literacyQuestions[state.literacyIndex];
  document.querySelector("#literacyTitle").textContent = question.title;
  document.querySelector("#literacyPrompt").textContent = question.prompt;
  document.querySelector("#literacyCounter").textContent = `${state.literacyIndex + 1} / ${literacyQuestions.length}`;
  drawLiteracyChart(question);
  renderOptions(question);
}

function renderOptions(question) {
  const fieldset = document.querySelector("#literacyOptions");
  const next = document.querySelector("#literacyNext");
  fieldset.innerHTML = "";
  question.options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "option-tile";
    label.innerHTML = `<input type="radio" name="literacyAnswer" value="${option}"><span>${option}</span>`;
    fieldset.appendChild(label);
  });
  fieldset.addEventListener("change", () => {
    next.disabled = false;
  });
  next.addEventListener("click", () => {
    const selected = document.querySelector("input[name='literacyAnswer']:checked").value;
    state.literacyResponses.push({
      questionId: question.id,
      answer: selected,
      correctAnswer: question.answer,
      correct: selected === question.answer
    });
    state.literacyIndex += 1;
    if (state.literacyIndex < literacyQuestions.length) {
      showLiteracy();
    } else {
      showTutorial();
    }
  });
}

function showTutorial() {
  state.phase = "tutorial";
  updateProgress();
  cloneTemplate("#tutorialTemplate");
  const demoData = makeChartData([42, 33, 25], "sorted");
  drawPie("#tutorialPie", demoData, { width: 260, height: 220, showLegend: true });
  drawWaffle("#tutorialWaffle", demoData, { width: 290, height: 220, showLegend: true });

  const practice = makeChartData([31, 26, 18, 13, 12], "random", [2, 0, 4, 1, 3]);
  drawWaffle("#practiceChart", practice, { width: 720, height: 310, showLegend: true });
  const required = 3;
  const correct = getCorrectLabels(practice, required);
  state.currentSelection = [];
  renderRanker("#practiceRanker", practice, required, () => {
    document.querySelector("#practiceFeedback").textContent = "";
  });
  document.querySelector("#practiceCheck").addEventListener("click", () => {
    const feedback = document.querySelector("#practiceFeedback");
    if (state.currentSelection.length !== required) {
      feedback.className = "feedback bad";
      feedback.textContent = "Choose three categories before continuing.";
      return;
    }
    const isCorrect = arraysEqual(state.currentSelection, correct);
    feedback.className = `feedback ${isCorrect ? "good" : "bad"}`;
    feedback.textContent = isCorrect
      ? "Correct. You are ready for the main study."
      : `Try again. The correct order is ${correct.join(", ")}.`;
    document.querySelector("#tutorialNext").disabled = !isCorrect;
  });
  document.querySelector("#tutorialNext").addEventListener("click", () => {
    state.trials = buildTrials();
    state.trialIndex = 0;
    showTrial();
  });
}

function buildTrials() {
  state.datasetLabelOrders = createDatasetLabelOrders();
  const conditions = [
    { chartType: "pie", order: "sorted" },
    { chartType: "pie", order: "random" },
    { chartType: "waffle", order: "sorted" },
    { chartType: "waffle", order: "random" }
  ];
  const experimental = [];
  datasets.forEach((dataset) => {
    conditions.forEach((condition) => {
      experimental.push({
        id: `${dataset.id}-${condition.chartType}-${condition.order}`,
        trialType: "experimental",
        datasetId: dataset.id,
        difficulty: dataset.difficulty,
        chartType: condition.chartType,
        order: condition.order,
        data: makeChartData(dataset.values, condition.order, null, state.datasetLabelOrders[dataset.id])
      });
    });
  });

  const checkOneData = makeChartData([60, 25, 15], "sorted", null, [3, 6, 1]);
  const checkTwoData = makeChartData([45, 35, 20], "random", [2, 1, 0], [5, 2, 8]);
  const checkThreeData = makeChartData([20, 55, 25], "random", [0, 2, 1], [7, 4, 0]);
  const checks = [
    {
      id: "check-select-named-category",
      trialType: "engagement-check",
      difficulty: "check",
      chartType: "pie",
      order: "sorted",
      data: checkOneData,
      forcedAnswer: [checkOneData[0].label],
      prompt: `Engagement check: select ${checkOneData[0].label}.`
    },
    {
      id: "check-select-two-named-categories",
      trialType: "engagement-check",
      difficulty: "check",
      chartType: "waffle",
      order: "random",
      data: checkTwoData,
      forcedAnswer: [checkTwoData[1].label, checkTwoData[0].label],
      prompt: `Engagement check: select ${checkTwoData[1].label}, then ${checkTwoData[0].label}.`
    },
    {
      id: "check-largest",
      trialType: "engagement-check",
      difficulty: "check",
      chartType: "pie",
      order: "random",
      data: checkThreeData,
      forcedAnswer: [getCorrectLabels(checkThreeData, 1)[0]],
      prompt: "Engagement check: select the largest category."
    }
  ];

  const mixed = shuffle(experimental);
  checks.forEach((check, index) => {
    const insertAt = Math.floor(((index + 1) * mixed.length) / (checks.length + 1));
    mixed.splice(insertAt + index, 0, check);
  });
  return mixed;
}

function showTrial() {
  state.phase = "trial";
  updateProgress();
  cloneTemplate("#trialTemplate");
  const trial = state.trials[state.trialIndex];
  const required = getRequiredCount(trial);
  state.currentSelection = [];
  state.trialStartedAt = performance.now();

  document.querySelector("#trialTitle").textContent = `${capitalize(trial.chartType)} Chart`;
  document.querySelector("#trialCount").textContent = `${state.trialIndex + 1} / ${state.trials.length}`;
  document.querySelector("#trialPrompt").textContent = trial.prompt || getTrialPrompt(required);

  if (trial.chartType === "pie") {
    drawPie("#trialChart", trial.data, { width: 780, height: 400, showLegend: true });
  } else {
    drawWaffle("#trialChart", trial.data, { width: 780, height: 400, showLegend: true });
  }

  renderRanker("#trialRanker", trial.data, required, () => {
    document.querySelector("#trialNext").disabled = state.currentSelection.length !== required;
  });

  const slider = document.querySelector("#confidenceSlider");
  const confidenceValue = document.querySelector("#confidenceValue");
  slider.addEventListener("input", () => {
    confidenceValue.textContent = slider.value;
  });

  document.querySelector("#trialNext").addEventListener("click", submitTrial);
}

function submitTrial() {
  const trial = state.trials[state.trialIndex];
  const required = getRequiredCount(trial);
  const correctAnswer = trial.forcedAnswer || getCorrectLabels(trial.data, required);
  const responseTimeMs = Math.round(performance.now() - state.trialStartedAt);
  const score = scoreAnswer(state.currentSelection, correctAnswer, trial.data);

  state.trialResponses.push({
    trialId: trial.id,
    trialType: trial.trialType,
    datasetId: trial.datasetId || null,
    difficulty: trial.difficulty,
    chartType: trial.chartType,
    order: trial.order,
    categoryCount: trial.data.length,
    requiredSelections: required,
    values: trial.data.map(({ label, value, originalRank, displayRank }) => ({
      label,
      value,
      originalRank,
      displayRank
    })),
    answer: [...state.currentSelection],
    correctAnswer,
    exactCorrect: score.exactCorrect,
    partialScore: score.partialScore,
    responseTimeMs,
    confidence: Number(document.querySelector("#confidenceSlider").value)
  });

  state.trialIndex += 1;
  if (state.trialIndex < state.trials.length) {
    showTrial();
  } else {
    showComplete();
  }
}

function showComplete() {
  state.phase = "complete";
  saveCompletedResult();
  updateProgress();
  cloneTemplate("#completeTemplate");
  const experimental = state.trialResponses.filter((trial) => trial.trialType === "experimental");
  const exact = experimental.length
    ? experimental.filter((trial) => trial.exactCorrect).length / experimental.length
    : 0;
  const times = experimental.map((trial) => trial.responseTimeMs).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;

  document.querySelector("#summaryTrials").textContent = state.trialResponses.length;
  document.querySelector("#summaryAccuracy").textContent = `${Math.round(exact * 100)}%`;
  document.querySelector("#summaryTime").textContent = `${(median / 1000).toFixed(1)}s`;
  document.querySelector("#downloadJson").addEventListener("click", downloadJson);
  document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);
  document.querySelector("#restartStudy").addEventListener("click", () => window.location.reload());
}

function createDatasetLabelOrders() {
  return datasets.reduce((orders, dataset) => {
    orders[dataset.id] = shuffle(d3.range(categoryNames.length)).slice(0, dataset.values.length);
    return orders;
  }, {});
}

function makeChartData(values, order, fixedOrder, labelOrder) {
  const labels = labelOrder || d3.range(values.length);
  const ranked = values
    .map((value, index) => ({
      label: categoryNames[labels[index]],
      value,
      color: colors[labels[index]],
      originalIndex: index
    }))
    .sort((a, b) => b.value - a.value)
    .map((item, rank) => ({ ...item, originalRank: rank + 1 }));

  let display;
  if (order === "sorted") {
    display = [...ranked].sort((a, b) => b.value - a.value);
  } else if (fixedOrder) {
    const byIndex = new Map(ranked.map((item) => [item.originalIndex, item]));
    display = fixedOrder.map((index) => byIndex.get(index)).filter(Boolean);
  } else {
    display = shuffle(ranked);
    if (display.every((item, index) => item.originalRank === index + 1)) {
      display = display.slice(1).concat(display[0]);
    }
  }
  return display.map((item, displayRank) => ({ ...item, displayRank: displayRank + 1 }));
}

function getRequiredCount(trial) {
  if (trial.forcedAnswer) return trial.forcedAnswer.length;
  return trial.data.length === 3 ? 3 : 3;
}

function getTrialPrompt(required) {
  if (required === 1) return "Select the largest category.";
  return required === 3
    ? "Select the three largest categories in order from largest to smallest."
    : `Select ${required} categories in order.`;
}

function getCorrectLabels(data, required) {
  return [...data]
    .sort((a, b) => a.originalRank - b.originalRank)
    .slice(0, required)
    .map((item) => item.label);
}

function scoreAnswer(answer, correctAnswer, data) {
  const exactCorrect = arraysEqual(answer, correctAnswer);
  const rankByLabel = new Map(data.map((item) => [item.label, item.originalRank]));
  const idealRanks = correctAnswer.map((label) => rankByLabel.get(label));
  const selectedRanks = answer.map((label) => rankByLabel.get(label));
  const maxDistance = data.length * correctAnswer.length;
  const distance = selectedRanks.reduce((sum, rank, index) => {
    const ideal = idealRanks[index] ?? index + 1;
    return sum + Math.abs((rank ?? data.length + 1) - ideal);
  }, 0);
  const partialScore = Math.max(0, 1 - distance / maxDistance);
  return { exactCorrect, partialScore: Number(partialScore.toFixed(3)) };
}

function renderRanker(selector, data, required, onChange) {
  const container = document.querySelector(selector);
  container.innerHTML = "";
  data.forEach((item) => {
    const button = document.createElement("button");
    button.className = "rank-choice";
    button.type = "button";
    button.dataset.label = item.label;
    button.innerHTML = `<span>${item.label}</span><span class="rank-number"></span>`;
    button.addEventListener("click", () => {
      const label = button.dataset.label;
      const existing = state.currentSelection.indexOf(label);
      if (existing >= 0) {
        state.currentSelection.splice(existing, 1);
      } else if (state.currentSelection.length < required) {
        state.currentSelection.push(label);
      }
      updateRankButtons(container);
      onChange();
    });
    container.appendChild(button);
  });
  updateRankButtons(container);
}

function updateRankButtons(container) {
  container.querySelectorAll(".rank-choice").forEach((button) => {
    const rank = state.currentSelection.indexOf(button.dataset.label);
    const number = button.querySelector(".rank-number");
    button.classList.toggle("selected", rank >= 0);
    number.textContent = rank >= 0 ? rank + 1 : "";
  });
}

function drawPie(selector, data, options = {}) {
  const width = options.width || 720;
  const height = options.height || 360;
  const radius = Math.min(width * 0.42, height * 0.44);
  const svg = createSvg(selector, width, height);
  const group = svg.append("g").attr("transform", `translate(${width * 0.36}, ${height / 2})`);
  const pie = d3.pie().sort(null).value((d) => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const labelArc = d3.arc().innerRadius(radius * 0.62).outerRadius(radius * 0.62);

  group
    .selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => d.data.color)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  group
    .selectAll("text")
    .data(pie(data).filter((d) => d.data.value >= 9))
    .join("text")
    .attr("class", "chart-label")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .text((d) => `${d.data.value}%`);

  if (options.showLegend) drawLegend(svg, data, width * 0.68, 44);
}

function drawWaffle(selector, data, options = {}) {
  const width = options.width || 720;
  const height = options.height || 360;
  const svg = createSvg(selector, width, height);
  const cells = [];
  data.forEach((item) => {
    const rounded = Math.round(item.value);
    for (let i = 0; i < rounded; i += 1) cells.push(item);
  });
  while (cells.length < 100) cells.push(data[data.length - 1]);
  cells.length = 100;

  const cellSize = Math.min((width * 0.54) / 10, (height * 0.74) / 10);
  const gridWidth = cellSize * 10;
  const startX = width * 0.08;
  const startY = (height - gridWidth) / 2;

  svg
    .append("g")
    .selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", (_, i) => startX + (i % 10) * cellSize)
    .attr("y", (_, i) => startY + Math.floor(i / 10) * cellSize)
    .attr("width", cellSize - 2)
    .attr("height", cellSize - 2)
    .attr("rx", 2)
    .attr("fill", (d) => d.color);

  if (options.showLegend) drawLegend(svg, data, width * 0.68, 44);
}

function drawLegend(svg, data, x, y) {
  const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${x}, ${y})`);
  const rows = legend
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (_, i) => `translate(0, ${i * 28})`);

  rows.append("rect").attr("width", 16).attr("height", 16).attr("rx", 3).attr("fill", (d) => d.color);
  rows
    .append("text")
    .attr("x", 24)
    .attr("y", 13)
    .text((d) => `${d.label}`);
}

function drawLiteracyChart(question) {
  const selector = "#literacyChart";
  if (question.type === "pie") {
    drawPie(selector, question.data.map((d, i) => ({ ...d, color: colors[i] })), {
      width: 680,
      height: 300,
      showLegend: true
    });
    return;
  }

  const width = 680;
  const height = 300;
  const svg = createSvg(selector, width, height);
  const margin = { top: 24, right: 30, bottom: 42, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const group = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  if (question.type === "bar") {
    const x = d3.scaleBand().domain(question.data.map((d) => d.label)).range([0, innerWidth]).padding(0.25);
    const y = d3.scaleLinear().domain([0, 50]).range([innerHeight, 0]);
    group
      .selectAll("rect")
      .data(question.data)
      .join("rect")
      .attr("x", (d) => x(d.label))
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.value))
      .attr("fill", colors[0]);
    group.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x));
    group.append("g").call(d3.axisLeft(y).ticks(5));
  }

  if (question.type === "line") {
    const points = question.data.map((value, index) => ({ index, value }));
    const x = d3.scaleLinear().domain([0, points.length - 1]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 40]).range([innerHeight, 0]);
    const line = d3.line().x((d) => x(d.index)).y((d) => y(d.value));
    group.append("path").datum(points).attr("fill", "none").attr("stroke", colors[0]).attr("stroke-width", 3).attr("d", line);
    group.selectAll("circle").data(points).join("circle").attr("cx", (d) => x(d.index)).attr("cy", (d) => y(d.value)).attr("r", 5).attr("fill", colors[1]);
    group.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat((d) => d + 1));
    group.append("g").call(d3.axisLeft(y).ticks(5));
  }
}

function createSvg(selector, width, height) {
  const container = d3.select(selector);
  container.selectAll("*").remove();
  return container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("width", "100%")
    .attr("height", "auto")
    .style("max-width", `${width}px`);
}

function downloadJson() {
  const payload = buildResultPayload();
  downloadFile(`chart-study-${state.participantId}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function buildResultPayload() {
  return {
    participantId: state.participantId,
    exportedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    datasetLabelOrders: state.datasetLabelOrders,
    literacyResponses: state.literacyResponses,
    trialResponses: state.trialResponses
  };
}

function saveCompletedResult() {
  const payload = buildResultPayload();
  const existing = getStoredResults().filter((result) => result.participantId !== payload.participantId);
  existing.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  sendRemoteResult(payload);
}

function getStoredResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function sendRemoteResult(payload) {
  const endpoint = window.STUDY_CONFIG?.responseEndpoint;
  if (!endpoint) return;

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  }).catch(() => {
    console.warn("Remote response submission failed. The response remains saved locally.");
  });
}

function downloadCsv() {
  const rows = state.trialResponses.map((trial) => ({
    participantId: state.participantId,
    trialId: trial.trialId,
    trialType: trial.trialType,
    datasetId: trial.datasetId,
    difficulty: trial.difficulty,
    chartType: trial.chartType,
    order: trial.order,
    categoryCount: trial.categoryCount,
    answer: trial.answer.join("|"),
    correctAnswer: trial.correctAnswer.join("|"),
    exactCorrect: trial.exactCorrect,
    partialScore: trial.partialScore,
    responseTimeMs: trial.responseTimeMs,
    confidence: trial.confidence
  }));
  const headers = Object.keys(rows[0] || { participantId: "" });
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
  downloadFile(`chart-study-${state.participantId}.csv`, csv, "text/csv");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

showConsent();
