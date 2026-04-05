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

module.exports = { tools, SYSTEM_PROMPT };
