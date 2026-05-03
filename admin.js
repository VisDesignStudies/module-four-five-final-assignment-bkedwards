const STORAGE_KEY = "chartComparisonStudyResults";

const participantCount = document.querySelector("#participantCount");
const trialCount = document.querySelector("#trialCount");
const accuracyRate = document.querySelector("#accuracyRate");
const conditionRows = document.querySelector("#conditionRows");
const participantRows = document.querySelector("#participantRows");

function getStoredResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

async function renderAdmin() {
  const results = await getAllResults();
  const experimental = results.flatMap((result) =>
    result.trialResponses.filter((trial) => trial.trialType === "experimental")
  );

  participantCount.textContent = results.length;
  trialCount.textContent = experimental.length;
  accuracyRate.textContent = formatPercent(mean(experimental.map((trial) => trial.exactCorrect ? 1 : 0)));

  renderConditionRows(experimental);
  renderParticipantRows(results);
}

function renderConditionRows(trials) {
  const groups = groupBy(trials, (trial) => `${trial.chartType} / ${trial.order} / ${trial.difficulty}`);
  const rows = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([condition, items]) => {
      const accuracy = mean(items.map((trial) => trial.exactCorrect ? 1 : 0));
      const rt = median(items.map((trial) => trial.responseTimeMs));
      const confidence = mean(items.map((trial) => trial.confidence));
      return `<tr>
        <td>${condition}</td>
        <td>${items.length}</td>
        <td>${formatPercent(accuracy)}</td>
        <td>${formatSeconds(rt)}</td>
        <td>${confidence ? confidence.toFixed(1) : "0.0"}</td>
      </tr>`;
    });

  conditionRows.innerHTML = rows.join("") || `<tr><td colspan="5">No results yet.</td></tr>`;
}

function renderParticipantRows(results) {
  const rows = results.map((result) => {
    const experimental = result.trialResponses.filter((trial) => trial.trialType === "experimental");
    const accuracy = mean(experimental.map((trial) => trial.exactCorrect ? 1 : 0));
    const rt = median(experimental.map((trial) => trial.responseTimeMs));
    return `<tr>
      <td>${result.participantId}</td>
      <td>${new Date(result.completedAt || result.exportedAt).toLocaleString()}</td>
      <td>${formatPercent(accuracy)}</td>
      <td>${formatSeconds(rt)}</td>
    </tr>`;
  });

  participantRows.innerHTML = rows.join("") || `<tr><td colspan="4">No participants yet.</td></tr>`;
}

function exportAllJson() {
  getAllResults().then((results) => {
    downloadFile("chart-study-all-results.json", JSON.stringify(results, null, 2), "application/json");
  });
}

function exportAllCsv() {
  getAllResults().then((results) => {
    const rows = results.flatMap((result) =>
      result.trialResponses.map((trial) => ({
        participantId: result.participantId,
        completedAt: result.completedAt,
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
      }))
    );
    const headers = Object.keys(rows[0] || { participantId: "" });
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
    ].join("\n");
    downloadFile("chart-study-all-results.csv", csv, "text/csv");
  });
}

function clearResults() {
  const confirmed = window.confirm("Clear all locally stored study results from this browser?");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  renderAdmin();
}

async function getAllResults() {
  const localResults = getStoredResults();
  const remoteRows = await getRemoteRows();
  const remoteResults = rowsToResults(remoteRows);
  const byParticipant = new Map();

  localResults.forEach((result) => byParticipant.set(result.participantId, result));
  remoteResults.forEach((result) => byParticipant.set(result.participantId, result));

  return [...byParticipant.values()];
}

async function getRemoteRows() {
  const csvUrl = window.STUDY_CONFIG?.adminCsvUrl;
  if (!csvUrl) return [];

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);
    return parseCsv(await response.text());
  } catch (error) {
    console.warn("Could not load remote CSV. Showing local fallback results.", error);
    return [];
  }
}

function rowsToResults(rows) {
  const rowsByParticipant = groupBy(rows, (row) => row.participantId);
  return Object.entries(rowsByParticipant).map(([participantId, participantRows]) => ({
    participantId,
    completedAt: participantRows[0].completedAt,
    exportedAt: participantRows[0].completedAt,
    literacyResponses: [],
    trialResponses: participantRows.map((row) => ({
      trialId: row.trialId,
      trialType: row.trialType,
      datasetId: row.datasetId || null,
      difficulty: row.difficulty,
      chartType: row.chartType,
      order: row.order,
      categoryCount: Number(row.categoryCount),
      answer: splitList(row.answer),
      correctAnswer: splitList(row.correctAnswer),
      exactCorrect: row.exactCorrect === "true" || row.exactCorrect === true,
      partialScore: Number(row.partialScore),
      responseTimeMs: Number(row.responseTimeMs),
      confidence: Number(row.confidence),
      values: parseJsonCell(row.valuesJson, [])
    }))
  }));
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some((value) => value !== ""))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function splitList(value) {
  return value ? String(value).split("|").filter(Boolean) : [];
}

function parseJsonCell(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(Number(value)));
  return clean.length ? clean.reduce((sum, value) => sum + Number(value), 0) / clean.length : 0;
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(Number(value))).sort((a, b) => a - b);
  if (!clean.length) return 0;
  return clean[Math.floor(clean.length / 2)];
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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

document.querySelector("#exportAllJson").addEventListener("click", exportAllJson);
document.querySelector("#exportAllCsv").addEventListener("click", exportAllCsv);
document.querySelector("#clearResults").addEventListener("click", clearResults);

renderAdmin();
