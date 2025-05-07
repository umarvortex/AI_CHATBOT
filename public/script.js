// Constants
const API_ENDPOINT = '/api/chat';
const LOCAL_STORAGE_KEY = 'ai_chatbot_history';

// For local development using different port
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const themeToggle = document.getElementById('theme-toggle');
const newChatButton = document.getElementById('new-chat-button');
const exportChatButton = document.getElementById('export-chat');

// Chat history
let chatHistory = [];
let clipboardContent = ''; // Store clipboard content

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load chat history from localStorage
    loadChatHistory();
    
    // Add welcome message if chat is empty
    if (chatHistory.length === 0) {
        addBotMessage("Hello! I'm your AI assistant developed by Umar Vortex. How can I help you today?");
    }
    
    // Event listeners
    sendButton.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    
    // Add character counter
    userInput.addEventListener('input', () => {
        // Auto-resize textarea
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight < 120) ? 
            userInput.scrollHeight + 'px' : '120px';
            
        // Update character count
        updateCharacterCount();
    });
    
    // Theme toggle
   
    
    // New chat button
    newChatButton.addEventListener('click', clearChat);
    
    // Export chat button
    exportChatButton.addEventListener('click', exportChat);
    
    // Create character counter element
    createCharacterCounter();
    
    // Add clear clipboard button to header
    addClearClipboardButton();
    
    // Load saved theme preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Focus on input field
    userInput.focus();
    
    // Set up scroll observer to detect when user is reading older messages
    setupScrollObserver();
});

// Add clear clipboard button to header
function addClearClipboardButton() {
    const clearClipBtn = document.createElement('button');
    clearClipBtn.id = 'clear-clipboard-button';
    clearClipBtn.className = 'btn';
    clearClipBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Clipboard';
    clearClipBtn.title = "Clear the clipboard content";
    clearClipBtn.addEventListener('click', clearClipboard);
    
    // Insert before export chat button
    const headerActions = document.querySelector('.header-actions');
    headerActions.insertBefore(clearClipBtn, exportChatButton);
    
    // Initially disable the button
    clearClipBtn.disabled = true;
    clearClipBtn.style.opacity = '0.5';
}

// Clear clipboard content
function clearClipboard() {
    clipboardContent = '';
    const clearClipBtn = document.getElementById('clear-clipboard-button');
    clearClipBtn.disabled = true;
    clearClipBtn.style.opacity = '0.5';
    showToast("Clipboard cleared");
}

// Create character counter
function createCharacterCounter() {
    const counterDiv = document.createElement('div');
    counterDiv.className = 'char-counter';
    counterDiv.id = 'char-counter';
    counterDiv.textContent = '0';
    
    // Insert before send button
    userInput.parentNode.insertBefore(counterDiv, sendButton);
    
    // Initial count
    updateCharacterCount();
}

// Update character count
function updateCharacterCount() {
    const counter = document.getElementById('char-counter');
    if (counter) {
        const count = userInput.value.length;
        counter.textContent = count;
        
        // Highlight if getting long
        if (count > 1000) {
            counter.classList.add('char-counter-warning');
        } else {
            counter.classList.remove('char-counter-warning');
        }
    }
}

// Handle sending a message
function handleSend() {
    const message = userInput.value.trim();
    
    if (message === '') return;
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    updateCharacterCount();
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to API
    sendToAPI(message);
}

// Add a user message to the chat
function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    
    // Add message content
    messageElement.textContent = message;
    
    // Add message timestamp
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampElement = document.createElement('div');
    timestampElement.classList.add('message-timestamp');
    timestampElement.textContent = timestamp;
    messageElement.appendChild(timestampElement);
    
    // Add copy button
    const actionDiv = document.createElement('div');
    actionDiv.classList.add('message-actions');
    
    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-btn');
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = "Copy message";
    copyButton.addEventListener('click', () => copyToClipboard(message));
    
    actionDiv.appendChild(copyButton);
    messageElement.appendChild(actionDiv);
    
    // Add to chat
    chatMessages.appendChild(messageElement);
    
    // Add to history with timestamp
    chatHistory.push({ 
        role: 'user', 
        content: message,
        timestamp: timestamp 
    });
    saveChat();
    
    // Scroll to bottom
    scrollToBottom();
}

// Process message text to handle markdown, code, etc.
function processMessageText(text) {
    // For now, just escape HTML and respect line breaks
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Convert line breaks to <br>
    return escaped.replace(/\n/g, '<br>');
}

// Simulate typing effect for bot messages
function simulateTyping(message, messageElement, typingIndicator) {
    return new Promise((resolve) => {
        // Remove any existing message content
        const existingContent = messageElement.querySelector('.message-content');
        if (existingContent) {
            existingContent.remove();
        }
        
        // Create message content container
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageElement.appendChild(messageContent);
        
        // Process the message text
        const processedMessage = processMessageText(message);
        
        // Create a temporary div to convert HTML to text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedMessage;
        const textContent = tempDiv.textContent || tempDiv.innerText;
        
        // Display full message immediately but hide it (for debugging/backup)
        const fullMessage = document.createElement('div');
        fullMessage.innerHTML = processedMessage;
        fullMessage.style.display = 'none';
        messageContent.appendChild(fullMessage);
        
        // Split into lines for typing effect
        const lines = textContent.split('\n');
        
        // Create a container for the typed content
        const typedContent = document.createElement('div');
        messageContent.appendChild(typedContent);
        
        let currentLineIndex = 0;
        let currentCharIndex = 0;
        let currentLine = '';
        
        // Function to type the next character
        const typeNextChar = () => {
            // Check if we've finished all lines
            if (currentLineIndex >= lines.length) {
                // We're done - show the full formatted message
                typedContent.remove();
                fullMessage.style.display = 'block';
                typingIndicator.remove();
                resolve();
                return;
            }
            
            // Get current line
            const line = lines[currentLineIndex];
            
            // Check if we need to start a new line
            if (currentCharIndex === 0) {
                currentLine = document.createElement('p');
                typedContent.appendChild(currentLine);
            }
            
            // Add the next character
            if (currentCharIndex < line.length) {
                // Type the next character of this line
                const char = line.charAt(currentCharIndex);
                currentLine.textContent += char;
                currentCharIndex++;
                
                // Continue with a random delay
                const delay = Math.floor(Math.random() * 10) + 15; // 15-25ms delay
                setTimeout(typeNextChar, delay);
            } else {
                // End of line - move to next line
                currentLineIndex++;
                currentCharIndex = 0;
                
                // Small pause between lines
                setTimeout(typeNextChar, 200);
            }
        };
        
        // Start the typing animation
        typeNextChar();
    });
}

// Add timestamp to message
function addTimestamp(messageElement) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampElement = document.createElement('div');
    timestampElement.classList.add('message-timestamp');
    timestampElement.textContent = timestamp;
    messageElement.appendChild(timestampElement);
    
    // Also add to chat history for the last message
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.timestamp = timestamp;
        saveChat();
    }
}

// Add message actions (copy, speech buttons)
function addMessageActions(messageElement) {
    // Create action buttons container
    const actionDiv = document.createElement('div');
    actionDiv.classList.add('message-actions');
    
    // Add speech button
    const speechButton = document.createElement('button');
    speechButton.classList.add('speech-btn');
    speechButton.innerHTML = '<i class="fas fa-volume-up"></i>';
    speechButton.title = "Read aloud";
    
    // Get message text
    const messageContent = messageElement.querySelector('.message-content');
    const messageText = messageContent ? messageContent.textContent : messageElement.textContent;
    
    speechButton.addEventListener('click', () => speakText(messageText));
    
    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-btn');
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = "Copy message";
    copyButton.addEventListener('click', () => copyToClipboard(messageText));
    
    // Add buttons to action div
    actionDiv.appendChild(speechButton);
    actionDiv.appendChild(copyButton);
    
    // Add actions to message
    messageElement.appendChild(actionDiv);
}

// Add a new bot message to the chat
function addBotMessage(message, typing = true) {
    return new Promise(async (resolve) => {
        // Make sure we have a valid message
        if (!message || typeof message !== 'string') {
            console.error('Invalid message:', message);
            message = "Sorry, I couldn't generate a response.";
        }
        
        // Create the message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message bot-message';
        
        // First add an empty container for the message
        chatMessages.appendChild(messageElement);
        
        // Force scroll to bottom when adding a new message
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (typing) {
            // Add the typing indicator inside this message
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            
            // Create three dots for the typing animation
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                typingIndicator.appendChild(dot);
            }
            
            messageElement.appendChild(typingIndicator);
            
            // Scroll to show the typing indicator
            scrollToBottom(true);
            
            try {
                // Simulate typing and gradually reveal the message
                await simulateTyping(message, messageElement, typingIndicator);
                
                // After typing is done
                addMessageActions(messageElement);
                addTimestamp(messageElement);
                messageElement.classList.add('new-message');
                
                // Force scroll to the new message again after content is added
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // If user had scrolled up, pulse the new message indicator
                if (window.userScrolledUp) {
                    pulseNewMessageIndicator();
                }
                
                resolve(messageElement);
            } catch (error) {
                console.error('Error in typing animation:', error);
                // Fallback to immediate display
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.innerHTML = processMessageText(message);
                messageElement.innerHTML = '';  // Clear any existing content
                messageElement.appendChild(messageContent);
                
                addMessageActions(messageElement);
                addTimestamp(messageElement);
                scrollToBottom(true);
                resolve(messageElement);
            }
        } else {
            // Add message content immediately without typing effect
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = processMessageText(message);
            messageElement.appendChild(messageContent);
            
            // Add actions and timestamp
            addMessageActions(messageElement);
            addTimestamp(messageElement);
            messageElement.classList.add('new-message');
            
            // Scroll to the new message
            scrollToBottom(true);
            
            // If user had scrolled up, pulse the new message indicator
            if (window.userScrolledUp) {
                pulseNewMessageIndicator();
            }
            
            resolve(messageElement);
        }
    });
}

// Show typing indicator
function showTypingIndicator() {
    const typingElement = document.createElement('div');
    typingElement.classList.add('typing-indicator');
    typingElement.id = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('typing-dot');
        typingElement.appendChild(dot);
    }
    
    chatMessages.appendChild(typingElement);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send message to API via our backend
async function sendToAPI(message) {
    try {
        // Remove any existing typing indicator first
        removeTypingIndicator();
        
        // Add a new typing indicator
        showTypingIndicator();
        
        // Create messages array for API - exclude timestamps
        const messages = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        // API request configuration with correct server URL
        const response = await fetch(`${SERVER_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messages
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get response');
        }
        
        const data = await response.json();
        
        // Make sure we have valid response data
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from API');
        }
        
        const botReply = data.choices[0].message.content.trim();
        
        // Play sound when message received
        playMessageSound();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Save the message to chat history first with a timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        chatHistory.push({ 
            role: 'assistant', 
            content: botReply,
            timestamp: timestamp 
        });
        saveChat();
        
        // Now display the message
        await addBotMessage(botReply);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Make sure typing indicator is removed
        removeTypingIndicator();
        
        // Save error message to history
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const errorMsg = "I'm sorry, I encountered an error. Please try again later.";
        
        chatHistory.push({ 
            role: 'assistant', 
            content: errorMsg,
            timestamp: timestamp 
        });
        saveChat();
        
        // Show error message
        await addBotMessage(errorMsg, false);
    }
}

// Play notification sound when message received
function playMessageSound() {
    try {
        const audio = new Audio();
        audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAAATGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKDMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQEcQAAAAAAAAGwe+JxPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAANGAZAGAAAAAGYuQQQQ8P///////////////MBLq19IAAAAAAAAAAAAAAAAAAAAABIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAAAAAAA==';
        audio.volume = 0.2;
        audio.play().catch(e => console.log('Auto-play prevented'));
    } catch (e) {
        console.log('Sound play error:', e);
    }
}

// Save chat to localStorage
function saveChat() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
}

// Load chat from localStorage
function loadChatHistory() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    
    if (saved) {
        chatHistory = JSON.parse(saved);
        
        // Render saved messages
        chatHistory.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(msg.role === 'user' ? 'user-message' : 'bot-message');
            
            // Add message content with proper formatting
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.innerHTML = processMessageText(msg.content);
            messageElement.appendChild(messageContent);
            
            // Add timestamp if available
            if (msg.timestamp) {
                const timestampElement = document.createElement('div');
                timestampElement.classList.add('message-timestamp');
                timestampElement.textContent = msg.timestamp;
                messageElement.appendChild(timestampElement);
            }
            
            // Add actions buttons 
            const actionDiv = document.createElement('div');
            actionDiv.classList.add('message-actions');
            
            // Copy button 
            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-btn');
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = "Copy message";
            copyButton.addEventListener('click', () => copyToClipboard(msg.content));
            
            // Add speech button for bot messages only
            if (msg.role === 'assistant') {
                const speechButton = document.createElement('button');
                speechButton.classList.add('speech-btn');
                speechButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                speechButton.title = "Read aloud";
                speechButton.addEventListener('click', () => speakText(msg.content));
                actionDiv.appendChild(speechButton);
            }
            
            actionDiv.appendChild(copyButton);
            messageElement.appendChild(actionDiv);
            
            chatMessages.appendChild(messageElement);
        });
        
        scrollToBottom();
    }
}

// Read text aloud using the browser's speech synthesis
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        // Clean up the text - remove HTML tags and decode entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const cleanText = tempDiv.textContent || tempDiv.innerText || text;
        
        // Create utterance with the cleaned text
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang.includes('en-US') && voice.name.includes('Female')
        ) || voices.find(voice => 
            voice.lang.includes('en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Show speaking indicator
        showToast("Speaking...");
        
        // Handle very long texts by chunking
        if (cleanText.length > 200) {
            // Split into sentences
            const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
            let currentIndex = 0;
            
            // Function to speak the next chunk
            const speakNextChunk = () => {
                if (currentIndex < sentences.length) {
                    const chunk = sentences[currentIndex];
                    const chunkUtterance = new SpeechSynthesisUtterance(chunk);
                    chunkUtterance.rate = utterance.rate;
                    chunkUtterance.pitch = utterance.pitch;
                    chunkUtterance.voice = utterance.voice;
                    
                    chunkUtterance.onend = () => {
                        currentIndex++;
                        speakNextChunk();
                    };
                    
                    window.speechSynthesis.speak(chunkUtterance);
                }
            };
            
            speakNextChunk();
        } else {
            // Speak the entire text at once for shorter messages
            window.speechSynthesis.speak(utterance);
        }
    } else {
        showToast("Speech synthesis not supported in your browser");
    }
}

// Clear chat history
function clearChat() {
    // Add confirmation for better UX
    if (chatHistory.length > 1 && !confirm("Are you sure you want to start a new chat? This will clear your current conversation.")) {
        return;
    }
    
    chatHistory = [];
    chatMessages.innerHTML = '';
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    addBotMessage("Hello! I'm your AI assistant powered by OpenRouter. How can I help you today?");
    
    // Focus on input
    userInput.focus();
}

// Toggle dark/light theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update icon
    themeToggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
    
    // Save preference
    localStorage.setItem('darkMode', isDarkMode);
}

// Scroll to the bottom of the chat
function scrollToBottom(immediate = false) {
    const chatMessages = document.getElementById('chat-messages');
    
    if (immediate) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return;
    }

    // Calculate if we're already close to the bottom
    const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
    const scrollThreshold = chatMessages.scrollHeight - 100; // Smaller threshold (100px)
    const isNearBottom = scrollPosition >= scrollThreshold;

    // If we're near the bottom, scroll smoothly
    if (isNearBottom) {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
        hideNewMessageIndicator();
        window.userScrolledUp = false;
    } else {
        // If we're far from bottom, show the new message indicator
        showNewMessageIndicator();
        window.userScrolledUp = true;
    }
    
    // Backup method to ensure scrolling works in all browsers
    setTimeout(() => {
        if (isNearBottom) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }, 100);
}

function showNewMessageIndicator() {
    const indicator = document.querySelector('.new-message-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

function hideNewMessageIndicator() {
    const indicator = document.querySelector('.new-message-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function pulseNewMessageIndicator() {
    const indicator = document.querySelector('.new-message-indicator');
    if (indicator) {
        indicator.classList.add('pulse-animation');
        indicator.style.display = 'flex';
        
        // Remove the animation class after animation completes
        setTimeout(() => {
            indicator.classList.remove('pulse-animation');
        }, 3000);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Store in our variable
    clipboardContent = text;
    
    // Copy to system clipboard
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard!");
        
        // Enable clear clipboard button
        const clearClipBtn = document.getElementById('clear-clipboard-button');
        if (clearClipBtn) {
            clearClipBtn.disabled = false;
            clearClipBtn.style.opacity = '1';
        }
    }).catch(() => {
        showToast("Failed to copy. Please try again.");
    });
}

// Setup scroll observer to detect when user scrolls away from bottom
function setupScrollObserver() {
    // Create a visual indicator for new messages
    const newMessageIndicator = document.createElement('div');
    newMessageIndicator.className = 'new-message-indicator';
    newMessageIndicator.innerHTML = '<i class="fas fa-arrow-down"></i> New message';
    newMessageIndicator.style.display = 'none';
    document.querySelector('.chat-container').appendChild(newMessageIndicator);
    
    // Click on indicator scrolls to bottom
    newMessageIndicator.addEventListener('click', () => {
        scrollToBottom(true);
        newMessageIndicator.style.display = 'none';
    });
    
    // Track if user has scrolled away from bottom
    let userScrolledUp = false;
    
    // Listen for scroll events
    chatMessages.addEventListener('scroll', () => {
        const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100;
        
        if (isAtBottom) {
            userScrolledUp = false;
            newMessageIndicator.style.display = 'none';
        } else {
            userScrolledUp = true;
        }
    });
    
    // Store reference to indicator for use in scrollToBottom
    window.newMessageIndicator = newMessageIndicator;
    window.userScrolledUp = userScrolledUp;
}

// Export chat as a text file
function exportChat() {
    if (chatHistory.length === 0) {
        showToast("No chat to export");
        return;
    }
    
    let chatText = "# AI Chat Export\n";
    chatText += `# Date: ${new Date().toLocaleDateString()}\n\n`;
    
    chatHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'AI';
        const time = msg.timestamp || '';
        chatText += `${role} (${time}):\n${msg.content}\n\n`;
    });
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    
    showToast("Chat exported successfully!");
}

// Show toast message
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
} 