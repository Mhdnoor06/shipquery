const express = require('express');
const multer = require('multer');
const router = express.Router();
const { parseDocument } = require('../services/parser');
const { chunkText } = require('../services/chunker');
const { embed } = require('../services/embedder');
const { saveDocument, saveChunk } = require('../services/documents');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('document'), async (req, res) => {
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

module.exports = router;
