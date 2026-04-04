const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parsePDF(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(fileBuffer);
  return parsed.text;
}

async function main() {
  const rawText = await parsePDF('./INV_2606947.pdf');

  console.log('=== RAW TEXT (what the parser gives us) ===');
  console.log(rawText.substring(0, 300));
  console.log('\n\n');

  // Now let's send BOTH versions to Claude and ask the same question
  // to see the difference in answer quality
  const Anthropic = require('@anthropic-ai/sdk');
  require('dotenv').config();

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Test 1: Send raw messy text
  console.log('=== ASKING CLAUDE WITH RAW TEXT ===');
  const response1 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Here is a shipping document:\n\n${rawText}\n\nWhat is the freight cost, who is the shipper, and what is the MBL number?`
    }]
  });
  console.log(response1.content[0].text);
}

main();
