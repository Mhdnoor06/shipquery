const { google } = require('googleapis');
const { pool } = require('../config/database');
require('dotenv').config();

let sheetsClient = null;

async function getSheets() {
  if (!sheetsClient) {
    let auth;
    if (process.env.GOOGLE_CREDENTIALS) {
      // Deployed: credentials from environment variable (base64 encoded JSON)
      const creds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString());
      auth = new google.auth.GoogleAuth({
        credentials: creds,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else {
      // Local: credentials from file
      auth = new google.auth.GoogleAuth({
        keyFile: './google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

// ===== Persistence =====

async function connectSheet(sheetId) {
  const sheets = await getSheets();

  // Check if already connected
  const existing = await pool.query('SELECT * FROM connected_sheets WHERE sheet_id = $1', [sheetId]);
  if (existing.rows.length > 0) return existing.rows[0];

  // Get spreadsheet metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const title = meta.data.properties.title;
  const sheetName = meta.data.sheets[0]?.properties?.title || 'Sheet1';

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z1`
  });
  const headers = result.data.values?.[0] || [];

  // Save to database
  const inserted = await pool.query(
    'INSERT INTO connected_sheets (sheet_id, name, sheet_name, headers) VALUES ($1, $2, $3, $4) RETURNING *',
    [sheetId, title, sheetName, headers]
  );

  return inserted.rows[0];
}

async function disconnectSheet(id) {
  await pool.query('DELETE FROM connected_sheets WHERE id = $1', [id]);
}

async function getConnectedSheets() {
  const result = await pool.query('SELECT * FROM connected_sheets ORDER BY connected_at DESC');
  return result.rows;
}

// ===== Data Reading =====

async function getSheetData(sheetId) {
  const sheets = await getSheets();

  // Get sheet name from DB
  const entry = await pool.query('SELECT sheet_name FROM connected_sheets WHERE sheet_id = $1', [sheetId]);
  const sheetName = entry.rows[0]?.sheet_name || 'Sheet1';

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`
  });

  const rows = result.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function getAllSheetData() {
  const connectedSheets = await getConnectedSheets();
  const allData = [];

  for (const entry of connectedSheets) {
    try {
      const rows = await getSheetData(entry.sheet_id);
      rows.forEach(row => {
        row._source = entry.name;
        allData.push(row);
      });
    } catch (e) {
      console.error(`Error reading sheet "${entry.name}":`, e.message);
    }
  }
  return allData;
}

// ===== Search Functions =====

async function searchSheetByCustomer(customerName) {
  const allData = await getAllSheetData();
  return allData.filter(row =>
    Object.values(row).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(customerName.toLowerCase())
    )
  );
}

async function searchSheetByMBL(mblNumber) {
  const allData = await getAllSheetData();
  return allData.filter(row =>
    Object.values(row).some(val =>
      typeof val === 'string' && val.includes(mblNumber)
    )
  );
}

async function searchSheetByStatus(status) {
  const allData = await getAllSheetData();
  return allData.filter(row =>
    Object.values(row).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(status.toLowerCase())
    )
  );
}

async function getAllShipments() {
  return await getAllSheetData();
}

function formatRows(rows) {
  if (rows.length === 0) return 'No matching data found in connected sheets.';
  return rows.map(row => {
    const source = row._source ? `[Sheet: ${row._source}] ` : '';
    const fields = Object.entries(row)
      .filter(([k]) => k !== '_source')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    return source + fields;
  }).join('\n\n');
}

async function previewSheet(sheetId) {
  const rows = await getSheetData(sheetId);
  return { rows: rows.slice(0, 5), total: rows.length };
}

// ===== Write Functions =====

// Update one or more fields in a row matched by a search value
async function updateSheetRow(searchColumn, searchValue, updates) {
  const sheets = await getSheets();
  const connectedSheets = await getConnectedSheets();

  for (const entry of connectedSheets) {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: entry.sheet_id,
      range: `${entry.sheet_name}!A:Z`
    });

    const rows = result.data.values;
    if (!rows || rows.length < 2) continue;

    const headers = rows[0];
    const searchColIdx = headers.indexOf(searchColumn);
    if (searchColIdx === -1) continue;

    // Validate all update columns exist
    const invalidCols = Object.keys(updates).filter(col => !headers.includes(col));
    if (invalidCols.length > 0) {
      return `Column(s) not found: ${invalidCols.join(', ')}. Available columns: ${headers.join(', ')}`;
    }

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][searchColIdx] && rows[i][searchColIdx].includes(searchValue)) {
        // Found the row — update each field
        const updated = [];
        for (const [col, val] of Object.entries(updates)) {
          const colIdx = headers.indexOf(col);
          const colLetter = String.fromCharCode(65 + colIdx);
          const cellRange = `${entry.sheet_name}!${colLetter}${i + 1}`;

          await sheets.spreadsheets.values.update({
            spreadsheetId: entry.sheet_id,
            range: cellRange,
            valueInputOption: 'RAW',
            requestBody: { values: [[val]] }
          });

          console.log(`[Sheet] Updated ${cellRange} = "${val}" in "${entry.name}"`);
          updated.push(`${col}: "${val}"`);
        }

        return `Updated ${updated.join(', ')} for row where ${searchColumn} = "${searchValue}" in sheet "${entry.name}"`;
      }
    }
  }

  return `No row found where ${searchColumn} contains "${searchValue}"`;
}

// Add a new row to the first connected sheet
async function addSheetRow(rowData) {
  const sheets = await getSheets();
  const connectedSheets = await getConnectedSheets();

  if (connectedSheets.length === 0) return 'No sheets connected. Please connect a Google Sheet first.';

  const entry = connectedSheets[0];
  const headers = entry.headers;

  // Build row values in correct column order
  const rowValues = headers.map(h => rowData[h] || '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: entry.sheet_id,
    range: `${entry.sheet_name}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowValues] }
  });

  console.log(`[Sheet] Added new row to "${entry.name}"`);
  return `Added new row to sheet "${entry.name}": ${headers.map((h, i) => `${h}: ${rowValues[i] || '(empty)'}`).join(', ')}`;
}

module.exports = {
  connectSheet, disconnectSheet, getConnectedSheets,
  searchSheetByCustomer, searchSheetByMBL, searchSheetByStatus,
  getAllShipments, formatRows, previewSheet,
  updateSheetRow, addSheetRow
};
