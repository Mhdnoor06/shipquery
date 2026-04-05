const { pool } = require('../config/database');

async function saveDocument(fileName, fileType, pages) {
  const result = await pool.query(
    'INSERT INTO documents (file_name, file_type, pages) VALUES ($1, $2, $3) RETURNING id',
    [fileName, fileType, pages]
  );
  return result.rows[0].id;
}

async function saveChunk(documentId, chunkIndex, content, embedding) {
  await pool.query(
    'INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4)',
    [documentId, chunkIndex, content, `[${embedding.join(',')}]`]
  );
}

async function searchChunks(questionEmbedding, limit = 3) {
  const result = await pool.query(
    `SELECT c.content, c.chunk_index, d.file_name,
            c.embedding <=> $1 AS distance
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     ORDER BY c.embedding <=> $1
     LIMIT $2`,
    [`[${questionEmbedding.join(',')}]`, limit]
  );
  return result.rows;
}

async function searchByCustomer(customerName) {
  const result = await pool.query(
    `SELECT DISTINCT d.id, d.file_name, d.pages, d.uploaded_at, c.content
     FROM documents d
     JOIN chunks c ON c.document_id = d.id
     WHERE LOWER(c.content) LIKE LOWER($1)
     ORDER BY d.uploaded_at DESC`,
    [`%${customerName}%`]
  );
  return result.rows;
}

async function searchByMBL(mblNumber) {
  const result = await pool.query(
    `SELECT DISTINCT d.id, d.file_name, d.pages, d.uploaded_at, c.content
     FROM documents d
     JOIN chunks c ON c.document_id = d.id
     WHERE c.content LIKE $1
     ORDER BY d.uploaded_at DESC`,
    [`%${mblNumber}%`]
  );
  return result.rows;
}

async function listDocuments() {
  const result = await pool.query(
    `SELECT d.id, d.file_name, d.pages, d.uploaded_at,
            COUNT(c.id) AS chunk_count
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     GROUP BY d.id
     ORDER BY d.uploaded_at DESC`
  );
  return result.rows;
}

module.exports = { saveDocument, saveChunk, searchChunks, searchByCustomer, searchByMBL, listDocuments };
