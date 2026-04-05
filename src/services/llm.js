const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

// Initialize clients
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY
});
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';

// Provider priority: try in this order
const PROVIDER_ORDER = (process.env.PRIMARY_LLM || 'openrouter,gemini,claude').split(',');

// ========== COST TRACKING ==========

function calculateCost(provider, inputTokens, outputTokens) {
  const rates = {
    openrouter: { input: 0, output: 0 },           // free tier
    mistral: { input: 0.10, output: 0.30 },        // per million tokens (free tier available)
    gemini: { input: 0.10, output: 0.40 },          // per million tokens
    claude: { input: 3.00, output: 15.00 }           // per million tokens
  };
  const r = rates[provider] || rates.claude;
  const total = (inputTokens / 1_000_000) * r.input + (outputTokens / 1_000_000) * r.output;
  return total;
}

// ========== OPENROUTER (OpenAI-compatible) ==========

function toolsToOpenAI(claudeTools) {
  return claudeTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}

async function chatWithToolsOpenRouter(systemPrompt, question, tools, executeTool) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question }
  ];
  let totalCost = 0;

  let response = await openrouter.chat.completions.create({
    model: OPENROUTER_MODEL,
    messages,
    tools: toolsToOpenAI(tools)
  });

  if (!response.choices?.[0]) throw new Error('OpenRouter returned empty response');
  totalCost += calculateCost('openrouter', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);

  // Tool calling loop — handles multiple parallel tool calls
  while (response.choices[0]?.message?.tool_calls?.length > 0) {
    const assistantMsg = response.choices[0].message;
    messages.push(assistantMsg);

    for (const toolCall of assistantMsg.tool_calls) {
      console.log(`[OpenRouter] Tool called: ${toolCall.function.name}(${toolCall.function.arguments})`);

      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult || 'No results found.'
      });
    }

    response = await openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      tools: toolsToOpenAI(tools)
    });

    if (!response.choices?.[0]) throw new Error('OpenRouter returned empty response after tool call');
    totalCost += calculateCost('openrouter', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
  }

  const answer = response.choices[0]?.message?.content || 'No answer generated.';
  console.log(`[Cost] OpenRouter total: $${totalCost.toFixed(4)}`);

  return { answer, cost: totalCost, provider: 'openrouter' };
}

// ========== GEMINI ==========

function toolsToGemini(claudeTools) {
  return [{
    functionDeclarations: claudeTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }))
  }];
}

async function chatWithToolsGemini(systemPrompt, question, tools, executeTool) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    tools: toolsToGemini(tools)
  });

  const chat = model.startChat();
  let response = await chat.sendMessage(question);
  let totalCost = 0;
  const usage = response.response.usageMetadata;
  totalCost += calculateCost('gemini', usage.promptTokenCount, usage.candidatesTokenCount);

  let functionCalls = response.response.functionCalls();
  while (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    console.log(`[Gemini] Tool called: ${call.name}(${JSON.stringify(call.args)})`);

    const toolResult = await executeTool(call.name, call.args);

    response = await chat.sendMessage([{
      functionResponse: { name: call.name, response: { result: toolResult } }
    }]);

    const usage2 = response.response.usageMetadata;
    totalCost += calculateCost('gemini', usage2.promptTokenCount, usage2.candidatesTokenCount);
    functionCalls = response.response.functionCalls();
  }

  const answer = response.response.text();
  console.log(`[Cost] Gemini total: $${totalCost.toFixed(4)}`);

  return { answer, cost: totalCost, provider: 'gemini' };
}

// ========== CLAUDE ==========

async function chatWithToolsClaude(systemPrompt, question, tools, executeTool) {
  const messages = [{ role: 'user', content: question }];
  let totalCost = 0;

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages
  });

  totalCost += calculateCost('claude', response.usage.input_tokens, response.usage.output_tokens);

  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(block => block.type === 'tool_use');
    console.log(`[Claude] Tool called: ${toolUseBlock.name}(${JSON.stringify(toolUseBlock.input)})`);

    const toolResult = await executeTool(toolUseBlock.name, toolUseBlock.input);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }]
    });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages
    });

    totalCost += calculateCost('claude', response.usage.input_tokens, response.usage.output_tokens);
  }

  const textBlock = response.content.find(block => block.type === 'text');
  console.log(`[Cost] Claude total: $${totalCost.toFixed(4)}`);

  return { answer: textBlock?.text || 'No answer generated.', cost: totalCost, provider: 'claude' };
}

// ========== MISTRAL CHAT ==========

async function chatWithToolsMistral(systemPrompt, question, tools, executeTool) {
  const mistralTools = tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema }
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question }
  ];
  let totalCost = 0;

  let response = await mistral.chat.complete({
    model: 'mistral-small-latest',
    messages,
    tools: mistralTools
  });

  totalCost += calculateCost('mistral', response.usage?.promptTokens || 0, response.usage?.completionTokens || 0);

  while (response.choices[0]?.message?.toolCalls?.length > 0) {
    const assistantMsg = response.choices[0].message;
    messages.push({ role: 'assistant', content: '', toolCalls: assistantMsg.toolCalls });

    for (const toolCall of assistantMsg.toolCalls) {
      console.log(`[Mistral] Tool called: ${toolCall.function.name}(${toolCall.function.arguments})`);

      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, args);

      messages.push({
        role: 'tool',
        name: toolCall.function.name,
        content: toolResult || 'No results found.',
        toolCallId: toolCall.id
      });
    }

    response = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages,
      tools: mistralTools
    });

    totalCost += calculateCost('mistral', response.usage?.promptTokens || 0, response.usage?.completionTokens || 0);
  }

  const answer = response.choices[0]?.message?.content || 'No answer generated.';
  console.log(`[Cost] Mistral total: $${totalCost.toFixed(4)}`);

  return { answer, cost: totalCost, provider: 'mistral' };
}

// ========== MAIN: TRY PROVIDERS IN ORDER ==========

const providers = {
  openrouter: chatWithToolsOpenRouter,
  mistral: chatWithToolsMistral,
  gemini: chatWithToolsGemini,
  claude: chatWithToolsClaude
};

async function chatWithTools(systemPrompt, question, tools, executeTool) {
  for (const name of PROVIDER_ORDER) {
    try {
      console.log(`[LLM] Trying ${name}...`);
      return await providers[name](systemPrompt, question, tools, executeTool);
    } catch (error) {
      console.error(`[LLM] ${name} failed: ${error.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// ========== OCR ==========

async function ocrWithOpenRouter(fileBuffer) {
  const base64 = fileBuffer.toString('base64');
  // Use a vision-capable free model
  const response = await openrouter.chat.completions.create({
    model: 'google/gemma-3-27b-it:free',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
        { type: 'text', text: `Extract ALL text from this shipping document exactly as it appears. Include every field, number, name, address, and detail. Preserve the structure. Extract both English and Arabic text. Do not summarize or skip anything.` }
      ]
    }]
  });
  return response.choices[0]?.message?.content;
}

async function ocrWithGemini(fileBuffer) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: fileBuffer.toString('base64') } },
    { text: `Extract ALL text from this shipping document exactly as it appears. Include every field, number, name, address, and detail. Preserve the structure. Extract both English and Arabic text. Do not summarize or skip anything.` }
  ]);
  const usage = result.response.usageMetadata;
  console.log(`[Cost] Gemini OCR: $${calculateCost('gemini', usage.promptTokenCount, usage.candidatesTokenCount).toFixed(4)}`);
  return result.response.text();
}

async function ocrWithClaude(fileBuffer) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') } },
        { type: 'text', text: `Extract ALL text from this shipping document exactly as it appears. Include every field, number, name, address, and detail. Preserve the structure. Extract both English and Arabic text. Do not summarize or skip anything.` }
      ]
    }]
  });
  console.log(`[Cost] Claude OCR: $${calculateCost('claude', response.usage.input_tokens, response.usage.output_tokens).toFixed(4)}`);
  return response.content[0].text;
}

async function ocrWithMistral(fileBuffer) {
  const base64 = fileBuffer.toString('base64');
  const result = await mistral.ocr.process({
    model: 'mistral-ocr-latest',
    document: { type: 'document_url', documentUrl: `data:application/pdf;base64,${base64}` }
  });
  const text = result.pages.map(p => p.markdown).join('\n\n');
  console.log(`[OCR] Mistral: ${result.pages.length} pages, ${text.length} chars`);
  return text;
}

// OCR provider order: Mistral first (free, best for documents), then fallbacks
const ocrProviders = {
  mistral: ocrWithMistral,
  gemini: ocrWithGemini,
  openrouter: ocrWithOpenRouter,
  claude: ocrWithClaude
};

const OCR_ORDER = ['mistral', 'gemini', 'openrouter', 'claude'];

async function ocr(fileBuffer) {
  for (const name of OCR_ORDER) {
    try {
      console.log(`[OCR] Trying ${name}...`);
      return await ocrProviders[name](fileBuffer);
    } catch (error) {
      console.error(`[OCR] ${name} failed: ${error.message}`);
    }
  }
  throw new Error('All OCR providers failed');
}

module.exports = { chatWithTools, ocr };
