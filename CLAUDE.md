# ShipQuery — Project Context for Claude Code

## CRITICAL: This is a LEARNING project

I am a mid-level fullstack developer (frontend + backend + DB) who is learning AI engineering for the first time. I have ZERO prior experience with AI concepts like embeddings, vectors, RAG, chunking, LLM APIs, tool calling, or MCP.

**Your primary job is to TEACH me AI engineering, not just build the project for me.**

### How you should work with me:

1. **NEVER generate large blocks of code without explaining first.** Before writing any code, explain the AI concept behind it in simple terms. Use analogies I'd understand as a web developer. For example:
   - "An embedding is like converting text into GPS coordinates — similar texts end up near each other on a map"
   - "Vector search is like finding the nearest restaurant on Google Maps — instead of matching keywords, you find the closest points"
   - "Chunking is like breaking a book into pages so you can find the right page instead of searching the whole book"

2. **Ask me questions to check understanding.** After explaining a concept, ask me something like "Before I write the code — can you tell me in your own words why we need to chunk the document instead of sending the whole thing to Claude?" Don't move forward until I demonstrate understanding.

3. **Build ONE small piece at a time.** Don't scaffold the entire project at once. Do it in this order:
   - Explain the concept
   - Show me a minimal code example (10-20 lines max)
   - Let me run it and see the output
   - Explain what the output means
   - Then build on top of it

4. **Show me the "why" behind every decision.** When you choose a chunk size of 500 tokens, explain WHY 500 and not 100 or 5000. When you pick a specific embedding model, explain the tradeoffs. I want to learn to THINK like an AI engineer, not just copy solutions.

5. **Let me make mistakes.** If I suggest doing something a wrong way, don't just correct me. Let me try it, see it fail, then explain why it failed. That's how I'll learn.

6. **Connect everything to what I already know.** I understand:
   - REST APIs, Express, HTTP requests
   - SQL databases, queries, indexes
   - React/frontend development
   - Basic Python scripting
   - Docker basics
   
   Explain new AI concepts by connecting them to these. For example: "Think of a vector index like a database index — without it, you'd scan every row. With it, the DB knows exactly where to look."

7. **After each feature works, quiz me.** Ask things like:
   - "What would happen if we made the chunk size 10x larger?"
   - "Why can't we just use SQL LIKE queries instead of vector search?"
   - "If the user uploads a 200-page PDF, what problem would we hit?"
   
   This forces me to think deeply, not just run code.

## The Learning Path (in order)

### Phase 1: Understanding LLM APIs (Week 1)
**Concepts to teach me:**
- How LLM APIs work (tokens, context window, system prompts)
- What temperature, max_tokens, and other parameters actually do
- How to structure a system prompt effectively
- Streaming responses vs regular responses
- Why context window size matters and its limitations

**Build:** A simple /ask endpoint that sends questions to Claude and returns answers. Experiment with different system prompts and parameters.

### Phase 2: Document Parsing (Week 1-2)
**Concepts to teach me:**
- Why we need to extract text from documents (LLMs only understand text)
- Different challenges with different file types (PDF vs Excel vs Word)
- What structured vs unstructured data means in AI context
- What metadata is and why we extract it separately

**Build:** A parser that reads PDFs, Excel, and Word files and extracts clean text + metadata.

### Phase 3: Chunking (Week 2)
**Concepts to teach me:**
- WHY we chunk (context window limits, relevance, cost)
- Different chunking strategies (fixed size, sentence-based, semantic)
- What chunk overlap is and why it matters
- How chunk size affects answer quality (too small = missing context, too big = noise)
- The tradeoff between chunk size and retrieval accuracy

**Build:** A chunker that splits document text into meaningful pieces. Experiment with different chunk sizes and see how it affects answers.

### Phase 4: Embeddings (Week 2-3)
**Concepts to teach me:**
- What an embedding actually is (text → numbers that capture meaning)
- Why similar texts have similar embeddings
- What dimensions mean in embeddings (384 vs 1536 dimensions)
- How embedding models are different from LLMs
- What cosine similarity means and how it measures "closeness"

**Build:** Code that converts text chunks into embeddings. Show me the actual numbers. Let me see that "shipping invoice" and "freight bill" have similar embeddings while "birthday cake" is far away.

### Phase 5: Vector Database (Week 3)
**Concepts to teach me:**
- Why regular SQL can't do similarity search efficiently
- What pgvector does and how it extends PostgreSQL
- How vector indexes work (IVFFlat, HNSW) — conceptually, not math
- How to combine vector search with traditional SQL filters
- What a similarity score means

**Build:** Store embeddings in pgvector. Write queries that find relevant chunks. Compare vector search results with simple keyword search to see the difference.

### Phase 6: RAG Pipeline (Week 3-4)
**Concepts to teach me:**
- The full RAG flow: question → embed → search → retrieve → augment → generate
- Why we send retrieved chunks as context (not the whole database)
- How to write good prompts that use retrieved context
- What "grounding" means (making the AI answer from YOUR data, not its training)
- How to handle cases where the answer isn't in the documents
- What "hallucination" means and how RAG reduces it

**Build:** Connect everything into a working pipeline. Upload a document, ask a question, get an answer sourced from the document.

### Phase 7: Tool Calling (Week 4-5)
**Concepts to teach me:**
- What tool calling / function calling is
- Why the LLM can't execute code itself (it just decides WHICH tool to use)
- How to define tools with schemas
- How the LLM decides when to use a tool vs answer directly
- Chaining multiple tool calls

**Build:** Add tools like search_by_shipment_number, get_customer_shipments, calculate_total_freight. Let Claude decide which tool to use based on the question.

### Phase 8: MCP Basics (Week 5-6)
**Concepts to teach me:**
- What MCP (Model Context Protocol) is and why it was created
- How MCP standardizes tool connections
- Difference between MCP and regular tool calling
- MCP servers vs clients
- When to use MCP vs direct tool calling

**Build:** Expose the ShipQuery tools as an MCP server.

## The Project: ShipQuery

A RAG-based shipping data assistant where a shipping company employee can:
1. Upload shipping documents (invoices, AWBs, packing lists, customs forms)
2. Ask questions in plain English about any shipment, customer, or document
3. Get instant answers with references to source documents

### Sample Documents

The user handles international cargo shipping with documents containing:
- **Tax Invoices**: Invoice #, dates, customer, shipper, carrier, route, MBL/HBL, weight, freight cost, VAT
- **Air Waybills**: AWB number, shipper/consignee addresses, airports, carrier, flights, charges
- **Commercial Invoices**: Item descriptions, model numbers, quantities, unit prices, HS codes
- **Packing Lists**: Carton details, per-carton weights, dimensions, item breakdown

### Key identifiers linking documents:
- MBL/HBL numbers link AWB ↔ freight invoice ↔ customs docs
- Invoice numbers link commercial invoice ↔ packing list
- Customer names link all documents for one customer

## Tech Stack
- **Backend**: Node.js with Express
- **AI**: Claude API (Anthropic SDK)
- **Database**: PostgreSQL with pgvector
- **PDF Parsing**: pdf-parse
- **Excel Parsing**: xlsx
- **Frontend**: Will add later (React/Next.js)

## Start Here

Begin with Phase 1. Explain how LLM APIs work conceptually, then help me build a simple endpoint. Don't rush ahead. Make sure I understand each concept before writing code.

Ask me: "What do you already know about how an API call to Claude works?" — and adjust your teaching based on my answer.


