# Chart Comparison Study

This is a static GitHub Pages-compatible study site. It can run locally with only
`index.html`, but multi-computer collection needs a write endpoint because GitHub
Pages cannot append directly to a CSV file in the repository.

## Multi-Computer Collection

The simplest setup is Google Sheets plus Google Apps Script:

1. Create a Google Sheet for responses.
2. Open Extensions -> Apps Script.
3. Paste the contents of `google-apps-script.js` into Apps Script.
4. Deploy as a Web App.
5. Set access to allow anyone with the link to submit.
6. Copy the Web App URL into `config.js` as `responseEndpoint`.

Completed participants will be posted to the sheet.

## Admin CSV

To let the admin page read a central CSV, publish the response sheet as CSV and
paste that URL into `config.js` as `adminCsvUrl`. The admin dashboard reads that
central CSV.

The admin page is available at `admin.html` or `/admin/`.
