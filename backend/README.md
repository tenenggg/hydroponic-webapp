# Hydroponic Monitoring System Backend

This is the backend server for the Hydroponic Monitoring System. It provides both REST API endpoints for the web application and Telegram bot functionality for monitoring and alerts.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Server Configuration
PORT=5000
```

3. Start the server:
- For development (with auto-reload):
```bash
npm run dev
```
- For production:
```bash
npm start
```

## Features

### REST API Endpoints
- User Management (CRUD operations)
- Plant Profile Management (CRUD operations)

### Telegram Bot Commands
- `/start` - Welcome message and bot information
- `/ph` - Get current pH value
- `/ec` - Get current EC value
- `/temp` - Get current water temperature
- `/plant` - List all plant profiles and their optimal ranges

### Automatic Monitoring
- Monitors sensor data every second
- Sends alerts when pumps are activated
- Includes plant-specific information in alerts

## Project Structure
```
backend/
├── server.js          # Main server file
├── package.json       # Project dependencies
├── .env              # Environment variables (create from .env.example)
└── README.md         # This file
``` 