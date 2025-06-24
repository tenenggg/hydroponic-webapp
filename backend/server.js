require('dotenv').config();
const express = require('express');  // Import Express framework
// Express is used to create the server and handle HTTP requests and responses
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const fs = require('fs');

const app = express(); // Initialize Express app

// security mechanism to allow only requests from your frontend
// This is important to prevent unauthorized access to your backend API
app.use(cors({
  origin: 'https://automated-hydroponic-monitoring-o8eti.ondigitalocean.app', // Allow requests from your deployed frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Parse JSON request bodies

// Add request logging middleware
// This will log each request with timestamp, method, and URL
// Useful for debugging and monitoring
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize Supabase client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Supabase client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
}

// Initialize Telegram Bot without polling
let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    console.log('✅ Telegram bot initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error);
  }
}

// Add cleanup on server shutdown
// Handle graceful shutdown for both SIGTERM and SIGINT
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  if (bot) {
    bot.stopPolling();
    console.log('Telegram bot polling stopped');
  }
  process.exit(0);
});


process.on('SIGINT', () => {
  console.log('SIGINT received. Cleaning up...');
  if (bot) {
    bot.stopPolling();
    console.log('Telegram bot polling stopped');
  }
  process.exit(0);
});

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let lastSeenId = null;

// Function to check sensor data and send notifications (adapted for real-time)
async function sendSensorAlerts(row) {
  try {
    // Ensure we only process new data (simple check for now, can be improved with event types)
    if (row.id === lastSeenId) { //skip if this is the same row as last time
      return;
    }
    lastSeenId = row.id;

    // Skip if no pump is triggered ,only send alerts if at least one pump is activated
    // avoid spamming alerts
    if (!row.pump1 && !row.pump2 && !row.pump3 && !row.pump4) {
      return;
    }

    // Get selected plant ID from system_config
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('selected_plant_id')
      .limit(1)
      .single();

    if (configError || !configData?.selected_plant_id) {
      console.warn('⚠️ Could not fetch selected plant ID for alert:', configError);
      return;
    }

    const plantId = configData.selected_plant_id;

    // Get plant name from plant_profiles or multiplant_profile
    let plantName = 'Unknown Plant';
    const { data: plantData, error: plantError } = await supabase
      .from('plant_profiles')
      .select('name')
      .eq('id', plantId)
      .single();

    if (plantError) {
      // Try multiplant_profile if not found in plant_profiles
      const { data: multiplantData, error: multiplantError } = await supabase
        .from('multiplant_profile')
        .select('name')
        .eq('id', plantId)
        .single();

      if (!multiplantError && multiplantData) {
        plantName = multiplantData.name;
      }
    } else if (plantData) {
      plantName = plantData.name;
    }

    // Build and send message
    let message = '';

    if (row.pump1) {
      message += `⚠️ EC too low! Add Solution A+B.\n🚰 Pump 1 activated\n📊 EC: ${row.ec}\n🌱 Plant: ${plantName}\n\n`;
    }
    if (row.pump2) {
      message += `⚠️ EC too high! Add water.\n🚰 Pump 2 activated\n📊 EC: ${row.ec}\n🌱 Plant: ${plantName}\n\n`;
    }
    if (row.pump3) {
      message += `⚠️ pH too low! Add alkali.\n🚰 Pump 3 activated\n📊 pH: ${row.ph}\n🌱 Plant: ${plantName}\n\n`;
    }
    if (row.pump4) {
      message += `⚠️ pH too high! Add acid.\n🚰 Pump 4 activated\n📊 pH: ${row.ph}\n🌱 Plant: ${plantName}\n\n`;
    }

    if (message) {
      await bot.sendMessage(TELEGRAM_CHAT_ID, message);
      console.log('✅ Alert sent!', row);
    }

  } catch (err) {
    console.error('❌ Unexpected error during sensor alert:', err);
  }
}

// Supabase Realtime Subscription for sensor_data
// This will listen for new sensor data and trigger alerts
// instant alerts(miliseconds) when a pump is activated
// This is more efficient than polling every 5 seconds
// as it only sends alerts when there is a change in the sensor data
if (supabase) {
  supabase
    .channel('sensor_data_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sensor_data' },
      (payload) => {
        console.log('Realtime change received:', payload);
        sendSensorAlerts(payload.new);
      }
    )
    .subscribe();
  console.log('✅ Subscribed to sensor_data changes.');
}

// Telegram Bot Commands
if (bot) {
  bot.onText(/\/start/, async (msg) => {
    try {
      await bot.sendMessage(msg.chat.id, "Welcome to Hydroponic Monitoring Bot! This bot can show you the current values of Electrical Conductivity (EC), pH Level, Water Temperature and will send you alerts when any of the pump is activated. Oh, and it can also show you the optimised level for all plant profiles.");
      console.log('✅ /start command processed for chat:', msg.chat.id);
    } catch (error) {
      console.error('❌ Error processing /start command:', error);
    }
  });

  bot.onText(/\/ph/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('ph')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) {
        await bot.sendMessage(msg.chat.id, "Could not fetch pH value.");
      } else {
        await bot.sendMessage(msg.chat.id, `Current pH value: ${data[0].ph}`);
      }
      console.log('✅ /ph command processed for chat:', msg.chat.id);
    } catch (error) {
      console.error('❌ Error processing /ph command:', error);
      try {
        await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your request.");
      } catch (sendError) {
        console.error('❌ Error sending error message:', sendError);
      }
    }
  });

  bot.onText(/\/ec/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('ec')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) {
        await bot.sendMessage(msg.chat.id, "Could not fetch EC value.");
      } else {
        await bot.sendMessage(msg.chat.id, `Current EC value: ${data[0].ec}`);
      }
      console.log('✅ /ec command processed for chat:', msg.chat.id);
    } catch (error) {
      console.error('❌ Error processing /ec command:', error);
      try {
        await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your request.");
      } catch (sendError) {
        console.error('❌ Error sending error message:', sendError);
      }
    }
  });

  bot.onText(/\/temp/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('water_temperature')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) {
        await bot.sendMessage(msg.chat.id, "Could not fetch water temperature.");
      } else {
        await bot.sendMessage(msg.chat.id, `Current water temperature: ${data[0].water_temperature}°C`);
      }
      console.log('✅ /temp command processed for chat:', msg.chat.id);
    } catch (error) {
      console.error('❌ Error processing /temp command:', error);
      try {
        await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your request.");
      } catch (sendError) {
        console.error('❌ Error sending error message:', sendError);
      }
    }
  });

  bot.onText(/\/plant/, async (msg) => {
    try {
      const { data: plantProfiles, error } = await supabase
        .from('plant_profiles')
        .select('name, ph_min, ph_max, ec_min, ec_max');
      if (error || !plantProfiles || plantProfiles.length === 0) {
        await bot.sendMessage(msg.chat.id, "Could not fetch plant profiles.");
        return;
      }
      let message = "Plant Profiles and Optimum Ranges:\n\n";
      plantProfiles.forEach(plant => {
        message += `🌱 ${plant.name}\n`;
        message += `  pH: ${plant.ph_min} - ${plant.ph_max}\n`;
        message += `  EC: ${plant.ec_min} - ${plant.ec_max}\n\n`;
      });
      await bot.sendMessage(msg.chat.id, message);
      console.log('✅ /plant command processed for chat:', msg.chat.id);
    } catch (error) {
      console.error('❌ Error processing /plant command:', error);
      try {
        await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your request.");
      } catch (sendError) {
        console.error('❌ Error sending error message:', sendError);
      }
    }
  });

  // General message handler for unknown commands
  bot.on('message', async (msg) => {
    // Only respond to text messages that aren't commands
    if (msg.text && !msg.text.startsWith('/')) {
      try {
        const helpMessage = `🤖 Hydroponic Monitoring Bot Commands:

/start - Welcome message
/ph - Get current pH value
/ec - Get current EC value
/temp - Get current water temperature
/plant - Show plant profiles and optimum ranges

Send any of these commands to get started!`;
        
        await bot.sendMessage(msg.chat.id, helpMessage);
        console.log('✅ Help message sent for chat:', msg.chat.id);
      } catch (error) {
        console.error('❌ Error sending help message:', error);
      }
    }
  });

  console.log('✅ Bot command handlers set up successfully');
} else {
  console.warn('⚠️ Bot not initialized, skipping command handlers');
}

// Webhook endpoint for Telegram
app.post('/webhook', (req, res) => {
  console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2)); 
  
  if (!bot) {
    console.error('❌ Bot not initialized, cannot process webhook');
    return res.sendStatus(500);
  }
  
  try { 
    bot.processUpdate(req.body); // Process the incoming update and trigger any relevant handlers
    console.log('✅ Update processed successfully'); // Log successful processing
    res.sendStatus(200); 
  } catch (error) {
    console.error('❌ Error processing update:', error);
    res.sendStatus(500);
  }
});

// Function to set webhook
// This function sets the webhook URL for the Telegram bot
// It first deletes any existing webhook, then sets the new one
// This is useful for ensuring the bot always has the correct webhook URL
async function setWebhook() {
  if (!bot) {
    console.error('❌ Bot not initialized, cannot set webhook');
    return;
  }
  
  try {
    // First, delete any existing webhook
    await bot.deleteWebHook();
    console.log('✅ Existing webhook deleted');
    
    const webhookUrl = `https://automated-hydroponic-monitoring-o8eti.ondigitalocean.app/hydroponic-webapp-backend/webhook`;
    await bot.setWebHook(webhookUrl);
    console.log('✅ Webhook set successfully:', webhookUrl);
  } catch (error) {
    console.error('❌ Failed to set webhook:', error);
  }
}

// User CRUD Operations
// Create user
app.post('/api/users', async (req, res) => {
  console.log('Creating user:', req.body);
  const { email, password, role } = req.body;
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
    });
    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email,
        role,
      }]);
    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    console.log('User created successfully:', authData.user.id);
    res.json({ user: authData.user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.details || 'Unknown error occurred'
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => { // Fetch all users from profiles table
  console.log('Fetching all users');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data.length} users`);
    res.json(data);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.details || 'Unknown error occurred'
    });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => { // Update user by ID
  const { id } = req.params;
  const { email, password, role } = req.body;
  console.log(`Updating user ${id}:`, req.body);
  
  try {
    // Update auth user
    const updateData = { email };
    if (password) updateData.password = password;
    
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(id, updateData);
    if (authError) {
      console.error('Auth update error:', authError);
      throw authError;
    }

    // Update profile
    const { error: profileError } = await supabase  
      .from('profiles')
      .update({ email, role })
      .eq('id', id);
    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
    }

    console.log('User updated successfully:', id);
    res.json({ user: authData.user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.details || 'Unknown error occurred'
    });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {  // Delete user by ID
  const { id } = req.params;
  console.log(`Deleting user ${id}`);
  
  try {
    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error('Auth delete error:', authError);
      throw authError;
    }

    // Delete from profiles
    const { error: profileError } = await supabase  
      .from('profiles')
      .delete()
      .eq('id', id);
    if (profileError) {
      console.error('Profile delete error:', profileError);
      throw profileError;
    }

    console.log('User deleted successfully:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.details || 'Unknown error occurred'
    });
  }
});

// Plant CRUD Operations
// Create plant
app.post('/api/plants', async (req, res) => {  // Create new plant profile
  try {
    const { error } = await supabase
      .from('plant_profiles')
      .insert([req.body]);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all plants (including multiplant)
app.get('/api/plants', async (req, res) => {
  try {
    // Get regular plants
    const { data: plants, error: plantsError } = await supabase
      .from('plant_profiles')
      .select('*');
    
    if (plantsError) throw plantsError;

    // Get multiplant profile
    const { data: multiplant, error: multiplantError } = await supabase
      .from('multiplant_profile')
      .select('*');

    if (multiplantError) throw multiplantError;

    // Combine both sets of data
    const allPlants = [...(plants || []), ...(multiplant || [])];
    res.json(allPlants);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update plant
app.put('/api/plants/:id', async (req, res) => {  // Update plant profile by ID
  const { id } = req.params;
  try {
    // Try updating in plant_profiles first
    let { error: plantError } = await supabase
      .from('plant_profiles')
      .update(req.body)
      .eq('id', id);

    if (plantError) {
      // If not found in plant_profiles, try multiplant_profile
      const { error: multiplantError } = await supabase
        .from('multiplant_profile')
        .update(req.body)
        .eq('id', id);

      if (multiplantError) throw multiplantError;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete plant
app.delete('/api/plants/:id', async (req, res) => {  // Delete plant profile by ID
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('plant_profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sensor Data Operations
app.delete('/api/sensor-data', async (req, res) => {  // Delete multiple sensor data records by IDs
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'An array of row IDs must be provided.' });
  }

  try {
    const { error } = await supabase
      .from('sensor_data')
      .delete()
      .in('id', ids);

    if (error) throw error;

    res.json({ success: true, message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sensor data.', details: error.message });
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {  // Health check endpoint to verify server is running
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint to manually set webhook
app.post('/api/set-webhook', async (req, res) => {  // Endpoint to manually set the webhook and test it
  try {
    await setWebhook();
    res.json({ success: true, message: 'Webhook set successfully' });
  } catch (error) {
    console.error('Error setting webhook:', error);2
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to check if bot is working
app.get('/api/bot-status', async (req, res) => { // Endpoint to check if the bot is working
  try {
    // Try to get bot info to verify it's working
    const botInfo = await bot.getMe();
    res.json({ 
      success: true, 
      botInfo,
      message: 'Bot is working correctly'
    });
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000
// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
  console.log('Telegram Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured');
  
  // Set the webhook only after the server has started listening
  setWebhook();
});
