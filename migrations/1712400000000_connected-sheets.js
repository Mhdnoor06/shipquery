exports.up = (pgm) => {
  pgm.createTable('connected_sheets', {
    id: 'id',
    sheet_id: { type: 'text', unique: true, notNull: true },
    name: { type: 'text' },
    sheet_name: { type: 'text' },
    headers: { type: 'text[]' },
    connected_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('connected_sheets');
};
