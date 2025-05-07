const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Starting server...');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('Middleware configured...');

// API Endpoint for chat completions
app.post('/api/chat', async (req, res) => {
  console.log('Received chat request');
  
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('API Key is missing');
      return res.status(500).json({ error: 'API key configuration is missing' });
    }

    console.log('Using API key:', apiKey.substring(0, 10) + '...');

    // OpenRouter API call
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
          'X-Title': 'AI Chatbot'
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo', // Using GPT-3.5 Turbo through OpenRouter
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      console.log('OpenRouter response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error response:', errorText);
        
        // Try to parse error as JSON
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          errorJson = { error: errorText };
        }
        
        throw new Error(JSON.stringify(errorJson));
      }

      const data = await response.json();
      console.log('Successful response from OpenRouter');
      
      res.json(data);
      
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      throw new Error(`API request failed: ${fetchError.message}`);
    }
    
  } catch (error) {
    console.error('API Error:', error.message);
    
    let errorDetails;
    try {
      errorDetails = JSON.parse(error.message);
    } catch {
      errorDetails = { message: error.message };
    }
    
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: errorDetails
    });
  }
});

// Serve the index.html file for all other routes
app.get('*', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 

// 🔁 Self-ping to keep Replit app awake
const http = require('http');
setInterval(() => {
  http.get('https://1e7cbecd-64d1-4812-be9c-fc83dbb0bdfd-00-2vtgub1nkxxde.sisko.replit.dev');
}, 240000); // every 4 minutes (4 x 60 x 1000 ms)