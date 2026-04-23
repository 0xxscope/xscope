# XScope - Twitter Intelligence Extension

XScope is a powerful browser extension designed to help cryto traders and social media analysts deep-dive into project narratives and KOL identities directly within X (Twitter), Gemini, ChatGPT, and Claude.

## Features

- **Project Narrative Analysis**: Instantly summarize the main narrative, timeline, and key events of any search query or token address.
- **Multi-Platform AI Automation**: Automatically inject prompts and analyzed data into **Gemini**, **ChatGPT**, and **Claude** with one click.
- **Real-time Token Insights**: Integrated with Dexscreener to provide live token info (Price, MC, FDV, Liquidity, Social Links) for any contract address.
- **KOL lookup**: Quickly view recent tweets and basic info for any user encountered in the interface.
- **Flexible Data Export**: Export analyzed tweets and project data as clean JSON files.
- **Smart i18n System**: Native support for **English**, **Simplified Chinese**, **Spanish**, **German**, **Japanese**, and **Korean**.
- **Customizable Experience**: 
  - Adjustable tweet crawl limits (Default: 50).
  - Customizable global AI prompt template.
  - Sidepanel and Popup support for multi-tasking.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS (Premium Dark Mode UI), JavaScript.
- **Communication**: Chrome Extension API (Message Passing, Storage).
- **External APIs**: Dexscreener (Token Info), Twitter search endpoints.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `/bird` directory.

## Configuration

Click the **Gear icon** in the extension to access System Settings:
- **Max Crawl Count**: Set how many tweets to fetch per search.
- **AI Prompt Template**: Define your own summary instructions for the AI.
- **Language**: Switch between supported languages.

## Note
This extension relies on being logged into X.com for tweet fetching. Some advanced analysis features may require the backend service to be running at `http://localhost:3002`.

---
*Built for the next generation of crypto-native intelligence.*
