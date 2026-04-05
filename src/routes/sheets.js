const express = require('express');
const router = express.Router();
const { connectSheet, disconnectSheet, getConnectedSheets, previewSheet } = require('../services/sheets');

// Get service account email
router.get('/config', (req, res) => {
  let email;
  if (process.env.GOOGLE_CREDENTIALS) {
    const creds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString());
    email = creds.client_email;
  } else {
    const creds = require('../../google-credentials.json');
    email = creds.client_email;
  }
  res.json({ serviceEmail: email });
});

// List connected sheets
router.get('/list', async (req, res) => {
  const sheets = await getConnectedSheets();
  res.json({ sheets });
});

// Connect a new sheet
router.post('/connect', async (req, res) => {
  const { sheetUrl } = req.body;

  let sheetId = sheetUrl;
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) sheetId = match[1];

  if (!sheetId || sheetId.length < 10) {
    return res.status(400).json({ error: 'Invalid Google Sheet URL or ID' });
  }

  try {
    const entry = await connectSheet(sheetId);
    res.json(entry);
  } catch (error) {
    const msg = error.message.includes('not found')
      ? 'Sheet not found. Check the URL and make sure you shared it with the service email.'
      : error.message.includes('permission') || error.message.includes('denied')
      ? 'Permission denied. Share the sheet with the service email address (Viewer access).'
      : `Connection failed: ${error.message}`;
    res.status(400).json({ error: msg });
  }
});

// Disconnect a sheet
router.delete('/:id', async (req, res) => {
  await disconnectSheet(req.params.id);
  res.json({ success: true });
});

// Preview sheet data
router.get('/:sheetId/preview', async (req, res) => {
  try {
    const data = await previewSheet(req.params.sheetId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
