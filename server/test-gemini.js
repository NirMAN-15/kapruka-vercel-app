const fetch = require('node-fetch');
require('dotenv').config();

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: "Search for cakes" }] },
      { role: "model", parts: [{ functionCall: { name: "kapruka_search_products", args: { query: "cakes" } } }] },
      { role: "function", parts: [{ functionResponse: { name: "kapruka_search_products", response: { result: "found cakes" } } }] }
    ],
    tools: [{
      functionDeclarations: [
        {
          name: "kapruka_search_products",
          description: "Search for products",
          parameters: { type: "object", properties: { query: { type: "string" } } }
        }
      ]
    }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
