function chunkText(text, chunkSize = 500, overlap = 50) {
  // If the text is smaller than one chunk, just return it as-is
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    // Grab a slice of text
    let end = start + chunkSize;

    // Don't cut in the middle of a word — find the nearest space
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());

    // Move forward, but step BACK by overlap amount
    start = end - overlap;
  }

  return chunks;
}

module.exports = { chunkText };
