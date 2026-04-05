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
  },
  {
    name: 'update_shipment',
    description: 'Update one or more fields in the live shipment tracker. Use when the user wants to change shipment data. Each value should go in its correct column — never combine values (e.g. put "30000" in Freight Cost and "SAR" in Currency as separate updates, not "30000 SAR" in one field).',
    input_schema: {
      type: 'object',
      properties: {
        search_column: { type: 'string', description: 'The column to search in to find the row (e.g. "MBL Number", "Job Ref")' },
        search_value: { type: 'string', description: 'The value to match in the search column' },
        updates: {
          type: 'object',
          description: 'Key-value pairs of columns to update. Keys must match exact column names. Example: {"Status": "Delivered", "Notes": "Cleared customs"}'
        }
      },
      required: ['search_column', 'search_value', 'updates']
    }
  },
  {
    name: 'add_shipment',
    description: 'Add a new shipment row to the live tracker. Use when the user wants to log a new shipment. Ask for at least: Job Ref, Customer, MBL Number, and Status.',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Key-value pairs matching sheet columns. Available columns: Job Ref, Date, Customer, Shipper, MBL Number, Carrier, Origin, Destination, Pieces, Weight (KG), Freight Cost, Currency, Status, Notes'
        }
      },
      required: ['data']
    }
  }
];

const SYSTEM_PROMPT = `You are a shipping data assistant for a cargo logistics company.
You help employees find information about shipments, customers, invoices, and cargo documents.
You have access to two data sources:
1. Uploaded documents (PDFs — invoices, AWBs, packing lists) stored in the database
2. A live shipment tracker (Google Sheet) with real-time shipment status and details

You can both READ and WRITE to the live tracker:
- Search, filter, and summarize shipment data
- Update existing shipment fields (status, costs, notes, etc.)
- Add new shipment entries

When updating data, always confirm what you changed and show the updated values.
When adding a shipment, ask for missing required fields before adding.
For document-specific details (invoice amounts, packing details) — use the document search tools.
Always mention whether your data came from uploaded documents or the live tracker.
If no relevant data is found, say so clearly.

Formatting rules:
- Use markdown tables when presenting structured data (shipment details, costs, item lists, packing info)
- Use bold for key values like amounts, MBL numbers, and customer names
- Keep responses concise and well-organized
- When showing costs, always include the currency`;

module.exports = { tools, SYSTEM_PROMPT };
