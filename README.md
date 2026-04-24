# XScope - The Ultimate Twitter & Crypto Intelligence Extension

XScope is a premium browser extension designed for crypto traders, researchers, and social media analysts. It provides deep narrative analysis, KOL tracking, and real-time token insights by bridging X (Twitter) with modern AI platforms and on-chain data.

## 🚀 Key Features

### 1. Narrative & Social Intelligence
- **Project Narrative Analysis**: Instantly summarize the main narrative, timeline, and key events of any search query or token address.
- **KOL Deep-Dive**: Quickly fetch and analyze user profiles, including recent tweets and basic info.
- **Relationship Tracking**: Fetch follower/following lists using advanced v1.1 API integration to bypass GraphQL limitations.
- **Smart Data Export**: Export analyzed tweets and project data as clean, structured JSON files for further research.

### 2. Multi-Platform AI Synergy
- **One-Click Automation**: Automatically inject analyzed context and custom prompts into **Gemini**, **ChatGPT**, and **Claude**.
- **Custom AI Endpoints**: Connect your own OpenAI-compatible API (e.g., GPT-4o, Claude 3.5) for private, high-speed analysis.
- **Smart Prompt Templates**: Fully customizable global AI prompt templates to tailor the analysis to your specific needs.

### 3. Integrated Trading Workflow
- **Real-time Token Insights**: Integrated with **Dexscreener** to provide live price, market cap, liquidity, and social links for any contract address.
- **Native Platform Support**: Injected interface and analysis tools on top-tier trading platforms:
  - **GMGN.ai**, **BullX (neo.bullx.io)**, **Axiom.trade**, **xxyy.io**
  - **Binance Web3**, **OKX Web3**, **Photon**, **Dexscreener**
- **Floating UI**: A draggable, sleek floating button allows you to access the analysis panel instantly on any supported site without switching tabs.

### 4. Premium User Experience
- **Sleek Sidepanel**: Utilizes the modern Chrome Side Panel API for a non-intrusive, multitasking experience.
- **Multi-tasking Support**: Parallel search execution (Main Search vs. Silent Background fetching).
- **Internationalization (i18n)**: Native support for English, Simplified Chinese (简体中文), Spanish, German, Japanese, and Korean.
- **Developer Mode Fallback**: Dynamic Query ID resolution ensures the extension stays functional even when Twitter updates its internal API.

## 🛠 Tech Stack

- **Framework**: Chrome Extension Manifesto V3 (MV3).
- **UI**: Vanilla HTML5/CSS3 with a premium dark-mode aesthetic.
- **Logic**: Asynchronous JavaScript (ES6+), Chrome Storage API, Messaging API.
- **Services**: 
  - **Dexscreener API** for token metadata.
  - **X (Twitter) GraphQL & REST v1.1** for social data.
  - **OpenAI-Compatible APIs** for custom intelligence.

## 📺 Visual Previews

### Native Terminal Integration
XScope seamlessly injects AI-driven narrative intelligence directly into your favorite trading dashboards.

| GMGN.ai Integration | Photon Integration |
| :---: | :---: |
| ![GMGN Preview](assets/gmgn.png) | ![Photon Preview](assets/photon.png) |

### Advanced Narrative Intelligence
While the built-in system uses efficient models, you can export structured data to unthrottled web-based versions like **Gemini 1.5 Pro** for deeper reasoning.

| Gemini Enhanced Analysis |
| :---: |
| ![Gemini Analysis](assets/gemini.png) |

## 📦 Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `/bird` directory.

## ⚙️ Configuration & Tips

XScope is designed to be flexible. You can access the **Global Settings** by clicking the **Gear icon** inside the popup, or simply **click the XScope LOGO** in the top-left corner for instant access.

- **Max Fetch Count**: Adjust how many tweets to fetch per search (default: 50, recommended ≤ 100 for stability).
- **AI Customization**: Bind your own **API Key** and customize the **System Prompt** to tailor the narrative analysis to your specific trading strategies.
- **Floating Button**: Toggle the visibility of the on-page floating analysis button.

## 🛡️ Technical Requirement & Privacy

- **Safe Search**: XScope performs scans by utilizing your **active browser session cookies** on X.com. This ensures high-speed, secure data fetching without requiring your password.
- **Login Required**: You MUST be logged into your account on **X.com** in this browser to enable search functionality.
- **Cross-Platform**: Supported sites include GMGN, BullX, Axiom, xxyy, Binance Web3, OKX Web3, Photon, ChatGPT, Claude, and Gemini.

---
*XScope: Empowering the next generation of crypto-native intelligence.*
