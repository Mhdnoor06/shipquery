const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { parseDocument } = require('./parser');
const { chunkText } = require('./chunker');
const { embed } = require('./embedder');
const { pool, saveDocument, saveChunk, searchChunks, searchByCustomer, searchByMBL, listDocuments } = require('./db');
const { chatWithTools } = require('./llm');
const promClient = require('prom-client');
const { connectSheet, disconnectSheet, getConnectedSheets, searchSheetByCustomer, searchSheetByMBL, searchSheetByStatus, getAllShipments, formatRows, previewSheet } = require('./sheets');
require('dotenv').config();

// Prometheus metrics
promClient.collectDefaultMetrics();
const httpRequestCount = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// multer saves uploaded files to "uploads" folder
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Track request metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestCount.inc({ method: req.method, route, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route }, duration);
  });
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Health check — monitors app + database status
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      database: 'connected',
      timestamp: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Tool definitions — the "menu" of actions the LLM can take
const tools = [
  {
    name: 'search_documents',
    description: 'Search uploaded documents using semantic similarity. Use this when the user asks a question about the content of shipping documents like invoices, AWBs, packing lists.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query to find relevant document chunks' }
      },
      required: ['query']
    }
  },
  {
    name: 'search_by_customer',
    description: 'Find all documents and shipments for a specific customer. Use when the user asks about a customer by name.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'The customer name to search for' }
      },
      required: ['customer_name']
    }
  },
  {
    name: 'search_by_mbl',
    description: 'Find all documents linked to a specific MBL (Master Bill of Lading) or HBL number. Use when the user mentions an MBL or shipment reference number.',
    input_schema: {
      type: 'object',
      properties: {
        mbl_number: { type: 'string', description: 'The MBL or HBL number to search for' }
      },
      required: ['mbl_number']
    }
  },
  {
    name: 'list_documents',
    description: 'List all uploaded documents in the system. Use when the user wants to see what documents are available or asks about document count.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'search_shipments_by_customer',
    description: 'Search the live shipment tracker (Google Sheet) for shipments of a specific customer. Returns real-time data including status, costs, and tracking info.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'The customer name to search for' }
      },
      required: ['customer_name']
    }
  },
  {
    name: 'search_shipments_by_mbl',
    description: 'Search the live shipment tracker by MBL number. Returns real-time shipment details.',
    input_schema: {
      type: 'object',
      properties: {
        mbl_number: { type: 'string', description: 'The MBL number to search for' }
      },
      required: ['mbl_number']
    }
  },
  {
    name: 'search_shipments_by_status',
    description: 'Search the live shipment tracker by shipment status. Use when user asks about shipments that are in transit, booked, delivered, etc.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'The status to filter by, e.g. In Transit, Booked, Delivered, Customs Clearance, Documentation' }
      },
      required: ['status']
    }
  },
  {
    name: 'list_all_shipments',
    description: 'Get all shipments from the live tracker. Use when user wants an overview of all active shipments or asks for a summary.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

// Execute a tool call and return the result
async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'search_documents': {
      const queryEmbedding = await embed(toolInput.query);
      const chunks = await searchChunks(queryEmbedding, 3);
      return chunks.map(c => `[${c.file_name}] ${c.content}`).join('\n\n---\n\n');
    }
    case 'search_by_customer': {
      const results = await searchByCustomer(toolInput.customer_name);
      if (results.length === 0) return 'No documents found for this customer.';
      return results.map(r => `[${r.file_name}] ${r.content}`).join('\n\n---\n\n');
    }
    case 'search_by_mbl': {
      const results = await searchByMBL(toolInput.mbl_number);
      if (results.length === 0) return 'No documents found for this MBL number.';
      return results.map(r => `[${r.file_name}] ${r.content}`).join('\n\n---\n\n');
    }
    case 'list_documents': {
      const docs = await listDocuments();
      if (docs.length === 0) return 'No documents have been uploaded yet.';
      return docs.map(d => `- ${d.file_name} (${d.pages} pages, ${d.chunk_count} chunks, uploaded: ${d.uploaded_at})`).join('\n');
    }
    case 'search_shipments_by_customer': {
      const rows = await searchSheetByCustomer(toolInput.customer_name);
      return '[Live Tracker]\n' + formatRows(rows);
    }
    case 'search_shipments_by_mbl': {
      const rows = await searchSheetByMBL(toolInput.mbl_number);
      return '[Live Tracker]\n' + formatRows(rows);
    }
    case 'search_shipments_by_status': {
      const rows = await searchSheetByStatus(toolInput.status);
      return '[Live Tracker]\n' + formatRows(rows);
    }
    case 'list_all_shipments': {
      const rows = await getAllShipments();
      return '[Live Tracker]\n' + formatRows(rows);
    }
  }
}

const SYSTEM_PROMPT = `You are a shipping data assistant for a cargo logistics company.
You help employees find information about shipments, customers, invoices, and cargo documents.
You have access to two data sources:
1. Uploaded documents (PDFs — invoices, AWBs, packing lists) stored in the database
2. A live shipment tracker (Google Sheet) with real-time shipment status and details
Use the appropriate tools to look up information before answering.
For shipment status, tracking, and live data — use the shipment tracker tools.
For document-specific details (invoice amounts, packing details) — use the document search tools.
Always mention whether your data came from uploaded documents or the live tracker.
If no relevant data is found, say so clearly.

Formatting rules:
- Use markdown tables when presenting structured data (shipment details, costs, item lists, packing info)
- Use bold for key values like amounts, MBL numbers, and customer names
- Keep responses concise and well-organized
- When showing costs, always include the currency`;

// RAG endpoint with tool calling — uses Gemini (primary) or Claude (fallback)
app.post('/ask', async (req, res) => {
  const { question } = req.body;

  try {
    const result = await chatWithTools(SYSTEM_PROMPT, question, tools, executeTool);

    console.log(`[${result.provider}] Total cost: $${result.cost.toFixed(4)}`);

    res.json({
      answer: result.answer,
      cost: `$${result.cost.toFixed(4)}`,
      provider: result.provider
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== Google Sheets connection endpoints =====

// Get service account email
app.get('/sheet/config', (req, res) => {
  let email;
  if (process.env.GOOGLE_CREDENTIALS) {
    const creds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString());
    email = creds.client_email;
  } else {
    const creds = require('./google-credentials.json');
    email = creds.client_email;
  }
  res.json({ serviceEmail: email });
});

// Get all connected sheets
app.get('/sheet/list', async (req, res) => {
  const sheets = await getConnectedSheets();
  res.json({ sheets });
});

// Connect a new sheet
app.post('/sheet/connect', async (req, res) => {
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
app.delete('/sheet/:id', async (req, res) => {
  await disconnectSheet(req.params.id);
  res.json({ success: true });
});

// Preview sheet data
app.get('/sheet/:sheetId/preview', async (req, res) => {
  try {
    const data = await previewSheet(req.params.sheetId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload a document: parse → chunk → embed → store in DB
app.post('/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await parseDocument(req.file.path, req.file.originalname);

    const docId = await saveDocument(
      result.metadata.fileName,
      result.metadata.fileType,
      result.metadata.pages
    );

    const chunks = chunkText(result.text, 500, 50);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i]);
      await saveChunk(docId, i, chunks[i], embedding);
    }

    res.json({
      message: 'Document processed and stored',
      documentId: docId,
      chunksCreated: chunks.length,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ShipQuery backend running on port ${PORT}`);
  console.log(`Primary LLM: ${process.env.PRIMARY_LLM || 'gemini'}`);
});
