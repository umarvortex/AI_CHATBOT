# AI Chatbot

A chatbot application that uses OpenAI's GPT-3.5 API to generate responses. This application consists of a frontend interface and a Node.js backend server that handles API requests.

## Features

- Clean, professional UI similar to ChatGPT
- Light/Dark mode toggle
- Chat history saved in localStorage
- Typing animation for bot responses
- Responsive design for desktop and mobile

## Setup Instructions

### Prerequisites

- Node.js (v14 or newer)
- npm (comes with Node.js)

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure environment variables**
   - The `.env` file contains your OpenAI API key
   - Make sure your API key is valid and has enough credits

4. **Start the server**
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```

5. **Access the application**
   - Open your browser and go to `http://localhost:3000`

## Project Structure

- `server.js` - Main backend application
- `public/` - Frontend files
  - `index.html` - HTML structure
  - `style.css` - CSS styling
  - `script.js` - Frontend JavaScript

## Security Notes

- The OpenAI API key is stored in the .env file and is used only by the backend
- Never expose your API key in the frontend code
- This approach protects your API key and avoids CORS issues

## Troubleshooting

- If you encounter an error, check the browser console and server logs
- Ensure your OpenAI API key is valid and has sufficient credits
- Make sure all dependencies are installed correctly 