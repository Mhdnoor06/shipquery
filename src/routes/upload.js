const express = require('express');
const multer = require('multer');
const router = express.Router();
const { parseDocument } = require('../services/parser');
const { chunkText } = require('../services/chunker');
const { embed } = require('../services/embedder');
const { documentExists, saveDocument, saveChunk } = require('../services/documents');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    if (await documentExists(req.file.originalname)) {
      console.log(`[Upload] Rejected duplicate: ${req.file.originalname}`);
      return res.status(409).json({ error: `"${req.file.originalname}" is already uploaded.` });
    }

    console.log(`[Upload] Processing: ${req.file.originalname}`);
    const result = await parseDocument(req.file.path, req.file.originalname);

    const docId = await saveDocument(
      result.metadata.fileName,
      result.metadata.fileType,
      result.metadata.pages
    );

    const chunks = chunkText(result.text, 500, 50);
    console.log(`[Upload] Embedding ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i]);
      await saveChunk(docId, i, chunks[i], embedding);
    }

    console.log(`[Upload] Done: ${result.metadata.fileName} → ${chunks.length} chunks stored`);
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

module.exports = router;
