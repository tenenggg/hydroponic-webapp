# 🌱 IoT-Enabled Web-Based Automated Hydroponic System

A full-stack IoT hydroponic solution for **real-time monitoring** and **automated control** of pH, EC, and water temperature, built using **ESP32**, **Supabase**, **ReactJS**, and **Telegram Bot API**. Designed for small to medium-scale hydroponic farms to improve resource efficiency, yield consistency, and ease of management.

![GitHub repo size](https://img.shields.io/github/repo-size/tenenggg/IoT-Enabled-Web-Based-Automated-Hydroponic-System)
![GitHub last commit](https://img.shields.io/github/last-commit/tenenggg/IoT-Enabled-Web-Based-Automated-Hydroponic-System)
![License](https://img.shields.io/github/license/tenenggg/IoT-Enabled-Web-Based-Automated-Hydroponic-System)

---

## 🚀 Features

- **Real-time monitoring** of pH, EC, and water temperature (ESP32)
- **Automated pump dosing** based on plant profiles (pH/EC thresholds)
- **React dashboard** with charts (ApexCharts) and admin/user pages
- **Supabase backend** for realtime DB, auth, and storage
- **Telegram Bot** for alerts and live commands
- **Sensor calibration** with persistent EEPROM storage
- **Database triggers** for automation & alert deduplication

---

## 🧠 System Architecture

![System Architecture](system_architecture_diagram.png)

**High-level flow**:
1. ESP32 reads sensors every 10s → computes pH/EC/temp.  
2. ESP32 fetches `selected_plant_id` from `system_config`.  
3. ESP32 fetches thresholds from `plant_profiles` (or `multiplant_profiles`).  
4. If values out of range → trigger relevant pump(s) for **3s**.  
5. ESP32 inserts reading + pump status into `sensor_data`.  
6. Supabase triggers backend notifications → Telegram bot alerts users.

---

## 🔧 Hardware Requirements

| Component                  | Notes                                      |
|----------------------------|--------------------------------------------|
| ESP32 Dev Board            | Wi-Fi MCU                                  |
| DS18B20                    | Water temperature sensor                   |
| Analog pH sensor module    | pH measurement and calibration             |
| Analog EC sensor module    | Electrical Conductivity (EC)               |
| 4-channel Relay Module     | Switches pumps (active LOW typical)        |
| Peristaltic Pumps (×4)     | pH up / pH down / nutrient A / nutrient B  |
| Power supply               | For pumps and ESP32 (separate rails advised)|

---

## 🛠️ Software Stack

- **Firmware:** Arduino IDE (C++), libraries: WiFi, HTTPClient, ArduinoJson, ESPSupabase, DallasTemperature, DFRobot_ESP_PH, DFRobot_ESP_EC, EEPROM  
- **Backend:** Node.js + Express, supabase-js, webhook-based Telegram Bot  
- **Frontend:** ReactJS, TailwindCSS, ApexCharts  
- **DB:** Supabase (Postgres w/ RLS & Realtime)

---

## ⚙️ Setup (copy-paste friendly)

### 1) ESP32 Firmware
- Install Arduino IDE and libraries:
  ~~~bash
  # Install via Library Manager or add manually
  WiFi.h, HTTPClient.h, ArduinoJson, ESPSupabase,
  OneWire, DallasTemperature, DFRobot_ESP_PH, DFRobot_ESP_EC, EEPROM
  ~~~
- Edit firmware constants (Wi-Fi, Supabase URL/Key) **in your local .ino** (do NOT commit service keys to git).
- Compile & flash to ESP32.

### 2) Supabase
- Create tables (example):
  - `sensor_data` (water_temperature, ph, ec, pump1..pump4, plant_id, plant_name, created_at)
  - `plant_profiles` (id, name, ph_min, ph_max, ec_min, ec_max)
  - `multiplant_profiles` (id, name, ph_min, ph_max, ec_min, ec_max)
  - `system_config` (id, selected_plant_id, updated_at)
  - `profiles` (users)
- Enable Row Level Security (RLS) and create appropriate policies.
- Use database triggers for automation (e.g., alert dedup, timestamps).

### 3) Node.js Backend & Telegram Bot
- Install deps:
  ~~~bash
  npm install express node-telegram-bot-api supabase-js cors dotenv
  ~~~
- Create `.env` (example):
  ~~~env
  SUPABASE_URL=https://your-supabase-url.supabase.co
  SUPABASE_KEY=your_service_role_key   # KEEP SECRET: do NOT push to public repo
  TELEGRAM_TOKEN=your_telegram_bot_token
  FRONTEND_URL=https://your-frontend.example.com
  ~~~
- Deploy (DigitalOcean, Render, Heroku, etc.) and set your Telegram webhook to `https://<your-server>/webhook`.

### 4) React Frontend
- Install & run:
  ~~~bash
  npm install
  npm start
  ~~~
- Create `.env` in frontend:
  ~~~env
  REACT_APP_SUPABASE_URL=https://your-supabase-url.supabase.co
  REACT_APP_SUPABASE_ANON_KEY=your_anon_key
  ~~~
- Build & host the frontend.

---

## 📜 ESP32 Firmware Operation (concise)

1. Initialize Wi-Fi, sensors (DS18B20, pH, EC), EEPROM, and relay pins (all OFF).  
2. Every **10 seconds**: read temperature, pH voltage, EC voltage → compute compensated pH & EC.  
3. GET `selected_plant_id` from `system_config`.  
4. GET profile thresholds from `plant_profiles` or `multiplant_profiles`.  
5. If values outside thresholds → turn pump on (digitalWrite LOW for active LOW relays), delay 3s, then turn off. Track pump flags.  
6. POST JSON to `sensor_data` containing temperature, pH, EC, pump flags, plant_id, and plant_name.  
7. Run calibration routines when needed and persist calibration in EEPROM.

---

## 🤖 Pump Logic (3s pulses)

| Condition     | Pump        |
|---------------|-------------|
| EC < ec_min   | Pump 1      |
| EC > ec_max   | Pump 2      |
| pH < ph_min   | Pump 3      |
| pH > ph_max   | Pump 4      |

---

## ⚠️ Security & Best Practices

- **Never** commit service-role keys or Wi-Fi passwords to a public repo. Put them in `.env` and add `.env` to `.gitignore`.  
- Use Supabase **service_role** key only on backend (server-side). Frontend should only use `anon` key.  
- Protect API endpoints with CORS and validate inputs.

---

## 🔧 Troubleshooting

- If sensor readings unstable → re-calibrate pH/EC, check wiring and sensor warm-up times.  
- If pumps never trigger → verify relay logic (active LOW vs active HIGH).  
- If backend alerts duplicate → check alert dedup logic (lastSeenId / timestamp guard).

---

## Appendix — Short firmware excerpt

<details>
<summary>ESP32 firmware excerpt (safe placeholders)</summary>

~~~cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPSupabase.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "DFRobot_ESP_PH.h"
#include "DFRobot_ESP_EC.h"
#include <EEPROM.h>

// === WiFi and Supabase ===
const char* ssid = "anwaribrahimpmke-10";
const char* password = "jangannn";
const char* supabaseUrl = "https://nshoxougnzhvtxvyyskq.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zaG94b3VnbnpodnR4dnl5c2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MDAzOTAsImV4cCI6MjA1Nzk3NjM5MH0.bktULAQH8aTFeW9TVUWbW-XyLOEn1VV0befxl9Mnonk";

int pump1Pin = 16;
int pump2Pin = 17;
int pump3Pin = 18;
int pump4Pin = 19;

Supabase supabase;

// === Sensor Pins and Constants ===
#define ONE_WIRE_BUS 23
#define PH_PIN 35
#define EC_PIN 34
#define ESPADC 4095.0
#define ESPVOLTAGE 3300

// === assigning each libraru into an object ===0
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
DFRobot_ESP_PH phSensor;
DFRobot_ESP_EC ecSensor;

float temperature = 25.0;
float phVoltage = 0.0, ecVoltage = 0.0;
float phValue = 0.0, ecValue = 0.0;

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to Wi-Fi...");
  }
  Serial.println("Wi-Fi connected!");

  supabase.begin(supabaseUrl, supabaseKey);

  EEPROM.begin(64);
  tempSensor.begin();
  phSensor.begin();
  ecSensor.begin();

  Serial.println("Sensors initialized.");

 // Set relay pins as output
  pinMode(pump1Pin, OUTPUT);
  pinMode(pump2Pin, OUTPUT);
  pinMode(pump3Pin, OUTPUT);
  pinMode(pump4Pin, OUTPUT);
  
  // Make sure all pumps are OFF at start
  digitalWrite(pump1Pin, HIGH); // HIGH = OFF for active LOW relay
  digitalWrite(pump2Pin, HIGH);
  digitalWrite(pump3Pin, HIGH);
  digitalWrite(pump4Pin, HIGH);
}

unsigned long lastSendTime = 0;

void loop() {

    if (millis() - lastSendTime >= 10000) {
    
    lastSendTime = millis();


  // === Read Temperature ===
  tempSensor.requestTemperatures();
  temperature = tempSensor.getTempCByIndex(0);
  if (temperature == DEVICE_DISCONNECTED_C || isnan(temperature)) {
    Serial.println("Error: DS18B20 not connected!");
    temperature = 25.0;
  }

  // === Read Voltages ===
  phVoltage = analogRead(PH_PIN) / ESPADC * ESPVOLTAGE;
  ecVoltage = analogRead(EC_PIN) * (3300.0 / 4095.0); //millivolts

  // === Compute Sensor Values ===
  phValue = phSensor.readPH(phVoltage, temperature);
  ecValue = ecSensor.readEC(ecVoltage , temperature);

  Serial.printf("📟 Temp: %.1f°C | pH: %.2f | EC: %.2f\n", temperature, phValue, ecValue);



  // === Supabase: Get selected plant ID ===
  HTTPClient http;
  http.begin("https://nshoxougnzhvtxvyyskq.supabase.co/rest/v1/system_config?select=selected_plant_id&limit=1");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  int httpCode = http.GET();

  String selectedPlantId = "";
  if (httpCode == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    if (doc.size() > 0) {
      selectedPlantId = String((const char*)doc[0]["selected_plant_id"]);
    }
  }
  http.end();

  if (selectedPlantId == "") {
    Serial.println("❌ Could not get plant ID.");
    delay(5000);
    return;
  }

String plantName = "";
float phMin = 0, phMax = 0, ecMin = 0, ecMax = 0;
bool profileFound = false;

// First try plant_profiles
http.begin("https://nshoxougnzhvtxvyyskq.supabase.co/rest/v1/plant_profiles?id=eq." + selectedPlantId + "&select=name,ph_min,ph_max,ec_min,ec_max");
http.addHeader("apikey", supabaseKey);
http.addHeader("Authorization", "Bearer " + String(supabaseKey));
httpCode = http.GET();

DynamicJsonDocument doc(1024);

if (httpCode == 200) { {
  deserializeJson(doc, http.getString());
  if (doc.size() > 0) {
    plantName = doc[0]["name"].as<String>();
    phMin = doc[0]["ph_min"];
    phMax = doc[0]["ph_max"];
    ecMin = doc[0]["ec_min"];
    ecMax = doc[0]["ec_max"];
    profileFound = true;
  }
}

if (!profileFound) {
  // Try multiplant_profile
  http.begin("https://nshoxougnzhvtxvyyskq.supabase.co/rest/v1/multiplant_profile?id=eq." + selectedPlantId + "&select=name,ph_min,ph_max,ec_min,ec_max");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  httpCode = http.GET();

  DynamicJsonDocument doc2(1024);
  if (httpCode == 200) {
    deserializeJson(doc2, http.getString());
    if (doc2.size() > 0) {
      plantName = doc2[0]["name"].as<String>();
      phMin = doc2[0]["ph_min"];
      phMax = doc2[0]["ph_max"];
      ecMin = doc2[0]["ec_min"];
      ecMax = doc2[0]["ec_max"];
      profileFound = true;
    }
  }
}
    
   // === Initialize pump flags ===
    bool pump1 = false;
    bool pump2 = false;
    bool pump3 = false;
    bool pump4 = false;

  // === Pump control logic ===
  if (ecValue < ecMin) {
    Serial.println("🚰 Pump 1 ON - EC too LOW");
    digitalWrite(pump1Pin, LOW);
    delay(3000);
    digitalWrite(pump1Pin, HIGH);
    pump1 = true;
  }

  if (ecValue > ecMax) {
    Serial.println("🚰 Pump 2 ON - EC too HIGH");
    digitalWrite(pump2Pin, LOW);
    delay(3000);
    digitalWrite(pump2Pin, HIGH);
    pump2 = true;
  }

  if (phValue < phMin) {
    Serial.println("🚰 Pump 3 ON - PH too LOW");
    digitalWrite(pump3Pin, LOW);
    delay(3000);
    digitalWrite(pump3Pin, HIGH);
    pump3 = true;
  }

  if (phValue > phMax) {
    Serial.println("🚰 Pump 4 ON - PH too HIGH");
    digitalWrite(pump4Pin, LOW);
    delay(3000);
    digitalWrite(pump4Pin, HIGH);
    pump4 = true;
  }
    String jsonData = "{"
  "\"water_temperature\": " + String(temperature, 1) +
  ", \"ph\": " + String(phValue, 2) +
  ", \"ec\": " + String(ecValue, 2) +
  ", \"pump1\": " + String(pump1 ? "true" : "false") +
  ", \"pump2\": " + String(pump2 ? "true" : "false") +
  ", \"pump3\": " + String(pump3 ? "true" : "false") +
  ", \"pump4\": " + String(pump4 ? "true" : "false") +
  ", \"plant_id\": \"" + selectedPlantId + "\"" +
  ", \"plant_name\": \"" + plantName + "\"" +
"}";


    int res2 = supabase.insert("sensor_data", jsonData, false);
    Serial.println(res2 == 200 || res2 == 201 ? "✅ Data -> sensor_data" : "❌ sensor_data insert failed");


    Serial.printf("🌱 %s | pH: [%.1f - %.1f], EC: [%.1f - %.1f]\n", plantName.c_str(), phMin, phMax, ecMin, ecMax);
  } else {
    Serial.print("❌ Plant profile fetch failed. Code: ");
    Serial.println(httpCode);
  }


// Calibration routine
    phSensor.calibration(phVoltage, temperature);
    ecSensor.calibration(ecVoltage, temperature);
  http.end();

  }
}

~~~

</details>

---

## License
MIT — see `LICENSE` file.


