const OpenAI = require('openai');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

// Initialize clients — two keys each for fallback
const openrouter1 = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
const openrouter2 = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY_2 });
const mistral1 = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const mistral2 = new Mistral({ apiKey: process.env.MISTRAL_API_KEY_2 });

const OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';

// ========== COST TRACKING ==========

function calculateCost(provider, inputTokens, outputTokens) {
  const rates = {
    openrouter: { input: 0, output: 0 },
    mistral: { input: 0.10, output: 0.30 }
  };
  const r = rates[provider] || { input: 0, output: 0 };
  return (inputTokens / 1_000_000) * r.input + (outputTokens / 1_000_000) * r.output;
}

// ========== OPENROUTER CHAT ==========

function toolsToOpenAI(tools) {
  return tools.map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.input_schema }
  }));
}

async function chatWithToolsOpenRouter(client, label, systemPrompt, question, tools, executeTool, history) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: question }
  ];
  let totalCost = 0;

  let response = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    messages,
    tools: toolsToOpenAI(tools)
  });

  if (!response.choices?.[0]) throw new Error('Empty response');
  totalCost += calculateCost('openrouter', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);

  while (response.choices[0]?.message?.tool_calls?.length > 0) {
    const assistantMsg = response.choices[0].message;
    messages.push(assistantMsg);

    for (const toolCall of assistantMsg.tool_calls) {
      console.log(`[${label}] Tool called: ${toolCall.function.name}(${toolCall.function.arguments})`);
      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, args);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult || 'No results found.' });
    }

    response = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      tools: toolsToOpenAI(tools)
    });

    if (!response.choices?.[0]) throw new Error('Empty response after tool call');
    totalCost += calculateCost('openrouter', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
  }

  const answer = response.choices[0]?.message?.content || 'No answer generated.';
  console.log(`[Cost] ${label} total: $${totalCost.toFixed(4)}`);
  return { answer, cost: totalCost, provider: label };
}

// ========== MISTRAL CHAT ==========

async function chatWithToolsMistral(client, label, systemPrompt, question, tools, executeTool, history) {
  const mistralTools = tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema }
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: question }
  ];
  let totalCost = 0;

  let response = await client.chat.complete({
    model: 'mistral-small-latest',
    messages,
    tools: mistralTools
  });

  totalCost += calculateCost('mistral', response.usage?.promptTokens || 0, response.usage?.completionTokens || 0);

  while (response.choices[0]?.message?.toolCalls?.length > 0) {
    const assistantMsg = response.choices[0].message;
    messages.push({ role: 'assistant', content: '', toolCalls: assistantMsg.toolCalls });

    for (const toolCall of assistantMsg.toolCalls) {
      console.log(`[${label}] Tool called: ${toolCall.function.name}(${toolCall.function.arguments})`);
      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, args);
      messages.push({ role: 'tool', name: toolCall.function.name, content: toolResult || 'No results found.', toolCallId: toolCall.id });
    }

    response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages,
      tools: mistralTools
    });

    totalCost += calculateCost('mistral', response.usage?.promptTokens || 0, response.usage?.completionTokens || 0);
  }

  const answer = response.choices[0]?.message?.content || 'No answer generated.';
  console.log(`[Cost] ${label} total: $${totalCost.toFixed(4)}`);
  return { answer, cost: totalCost, provider: label };
}

// ========== MAIN: TRY ALL 4 KEYS IN ORDER ==========

const CHAT_PROVIDERS = [
  { name: 'openrouter-1', fn: (sp, q, t, e, h) => chatWithToolsOpenRouter(openrouter1, 'openrouter-1', sp, q, t, e, h) },
  { name: 'mistral-1',    fn: (sp, q, t, e, h) => chatWithToolsMistral(mistral1, 'mistral-1', sp, q, t, e, h) },
  { name: 'openrouter-2', fn: (sp, q, t, e, h) => chatWithToolsOpenRouter(openrouter2, 'openrouter-2', sp, q, t, e, h) },
  { name: 'mistral-2',    fn: (sp, q, t, e, h) => chatWithToolsMistral(mistral2, 'mistral-2', sp, q, t, e, h) },
];

async function chatWithTools(systemPrompt, question, tools, executeTool, history) {
  for (const provider of CHAT_PROVIDERS) {
    try {
      console.log(`[LLM] Trying ${provider.name}...`);
      return await provider.fn(systemPrompt, question, tools, executeTool, history);
    } catch (error) {
      console.error(`[LLM] ${provider.name} failed: ${error.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// ========== OCR: MISTRAL PRIMARY ==========

async function ocrWithMistral(client, label, fileBuffer) {
  const base64 = fileBuffer.toString('base64');
  const result = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: { type: 'document_url', documentUrl: `data:application/pdf;base64,${base64}` }
  });
  const text = result.pages.map(p => p.markdown).join('\n\n');
  console.log(`[OCR] ${label}: ${result.pages.length} pages, ${text.length} chars`);
  return text;
}

const OCR_PROVIDERS = [
  { name: 'mistral-ocr-1', fn: (buf) => ocrWithMistral(mistral1, 'mistral-ocr-1', buf) },
  { name: 'mistral-ocr-2', fn: (buf) => ocrWithMistral(mistral2, 'mistral-ocr-2', buf) },
];

async function ocr(fileBuffer) {
  for (const provider of OCR_PROVIDERS) {
    try {
      console.log(`[OCR] Trying ${provider.name}...`);
      return await provider.fn(fileBuffer);
    } catch (error) {
      console.error(`[OCR] ${provider.name} failed: ${error.message}`);
    }
  }
  throw new Error('All OCR providers failed');
}

module.exports = { chatWithTools, ocr };
