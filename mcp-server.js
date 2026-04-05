const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { searchChunks, searchByCustomer, searchByMBL, listDocuments } = require('./src/services/documents');
const { embed } = require('./src/services/embedder');

const server = new McpServer({
  name: 'shipquery',
  version: '1.0.0'
});

// Tool 1: Semantic search across documents
server.tool(
  'search_documents',
  'Search uploaded shipping documents using semantic similarity. Use for questions about document content like freight costs, shipment details, etc.',
  { query: z.string().describe('The search query') },
  async ({ query }) => {
    const queryEmbedding = await embed(query);
    const chunks = await searchChunks(queryEmbedding, 3);
    const text = chunks.map(c => `[${c.file_name}] ${c.content}`).join('\n\n---\n\n');
    return { content: [{ type: 'text', text: text || 'No results found.' }] };
  }
);

// Tool 2: Search by customer name
server.tool(
  'search_by_customer',
  'Find all documents and shipment data for a specific customer by name.',
  { customer_name: z.string().describe('The customer name to search for') },
  async ({ customer_name }) => {
    const results = await searchByCustomer(customer_name);
    const text = results.map(r => `[${r.file_name}] ${r.content}`).join('\n\n---\n\n');
    return { content: [{ type: 'text', text: text || 'No documents found for this customer.' }] };
  }
);

// Tool 3: Search by MBL number
server.tool(
  'search_by_mbl',
  'Find all documents linked to a specific MBL or HBL number.',
  { mbl_number: z.string().describe('The MBL or HBL number') },
  async ({ mbl_number }) => {
    const results = await searchByMBL(mbl_number);
    const text = results.map(r => `[${r.file_name}] ${r.content}`).join('\n\n---\n\n');
    return { content: [{ type: 'text', text: text || 'No documents found for this MBL number.' }] };
  }
);

// Tool 4: List all documents
server.tool(
  'list_documents',
  'List all uploaded documents in the system with their details.',
  {},
  async () => {
    const docs = await listDocuments();
    const text = docs.map(d =>
      `- ${d.file_name} (${d.pages} pages, ${d.chunk_count} chunks, uploaded: ${d.uploaded_at})`
    ).join('\n');
    return { content: [{ type: 'text', text: text || 'No documents uploaded yet.' }] };
  }
);

// Start the MCP server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ShipQuery MCP Server running on stdio');
}

main().catch(console.error);
