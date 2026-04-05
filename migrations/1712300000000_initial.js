exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector');

  pgm.createTable('documents', {
    id: 'id',
    file_name: { type: 'text', notNull: true },
    file_type: { type: 'text' },
    pages: { type: 'integer' },
    uploaded_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.createTable('chunks', {
    id: 'id',
    document_id: { type: 'integer', references: 'documents' },
    chunk_index: { type: 'integer' },
    content: { type: 'text' },
    embedding: { type: 'vector(384)' }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('chunks');
  pgm.dropTable('documents');
};
