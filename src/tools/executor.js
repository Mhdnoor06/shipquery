const { embed } = require('../services/embedder');
const { searchChunks, searchByCustomer, searchByMBL, listDocuments } = require('../services/documents');
const { searchSheetByCustomer, searchSheetByMBL, searchSheetByStatus, getAllShipments, formatRows, updateSheetRow, addSheetRow } = require('../services/sheets');

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
    case 'update_shipment': {
      return await updateSheetRow(toolInput.search_column, toolInput.search_value, toolInput.updates);
    }
    case 'add_shipment': {
      return await addSheetRow(toolInput.data);
    }
  }
}

module.exports = { executeTool };
