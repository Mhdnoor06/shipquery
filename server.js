require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`ShipQuery backend running on port ${PORT}`);
  console.log(`Primary LLM: ${process.env.PRIMARY_LLM || 'openrouter'}`);
});
