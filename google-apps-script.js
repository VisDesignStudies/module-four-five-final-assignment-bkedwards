const SHEET_NAME = "Responses";

function doPost(e) {
  const sheet = getSheet();
  const payload = JSON.parse(e.postData.contents);
  const rows = payload.trialResponses.map((trial) => [
    payload.participantId,
    payload.completedAt,
    trial.trialId,
    trial.trialType,
    trial.datasetId,
    trial.difficulty,
    trial.chartType,
    trial.order,
    trial.categoryCount,
    trial.answer.join("|"),
    trial.correctAnswer.join("|"),
    trial.exactCorrect,
    trial.partialScore,
    trial.responseTimeMs,
    trial.confidence,
    JSON.stringify(trial.values)
  ]);

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "participantId",
      "completedAt",
      "trialId",
      "trialType",
      "datasetId",
      "difficulty",
      "chartType",
      "order",
      "categoryCount",
      "answer",
      "correctAnswer",
      "exactCorrect",
      "partialScore",
      "responseTimeMs",
      "confidence",
      "valuesJson"
    ]);
  }

  return sheet;
}
