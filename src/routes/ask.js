const express = require('express');
const router = express.Router();
const { chatWithTools } = require('../services/llm');
const { tools, SYSTEM_PROMPT } = require('../tools/definitions');
const { executeTool } = require('../tools/executor');

router.post('/', async (req, res) => {
  const { question } = req.body;

  try {
    const result = await chatWithTools(SYSTEM_PROMPT, question, tools, executeTool);

    console.log(`[${result.provider}] Total cost: $${result.cost.toFixed(4)}`);

    res.json({
      answer: result.answer,
      cost: `$${result.cost.toFixed(4)}`,
      provider: result.provider
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
