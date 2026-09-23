# Mamout (Browser Extension)

**Mamout** is a professional prompt management browser extension for chromium based browsers, built with modern Web technologies (React, TypeScript, Manifest V3). It allows users to create, organize, and use complex prompt templates through an interactive, dynamic interface.

The core strength of Mamout is its custom template engine, which transforms static text into dynamic forms using a simple tag-based syntax — no need to manually rewrite prompts every time a detail changes.

## Key Features

- **Dynamic Template Engine** — Define variables within your prompts using a custom `<INPUT>` tag system.
- **AI-Powered Templatization** — Automatically convert raw text into dynamic templates via an LLM-based analysis module.
- **Interactive Prompt Viewer** — Automatically generates UI components for template variables, with real-time prompt compilation and preview.
- **Advanced Search** — Quickly locate prompts by title, description, or template content.
- **Real-Time Device Sync** — Client-side WebSocket integration that connects seamlessly to the Mamout server app over the local network, synchronizing prompts bidirectionally using timestamp-based (`lastModified`) conflict resolution.
- **Material 3 Design Tokens** — Modern UI styled with CSS variables inspired by Material Design 3 guidelines.
- **Offline First** — Full local persistence using IndexedDB (via Dexie.js); your prompts remain accessible without an internet connection.

## Technology Stack

| Category | Technology |
|---|---|
| Language | TypeScript |
| UI Library | React |
| Database | IndexedDB (Dexie.js) |
| Real-Time Sync | Native WebSockets Client + Dexie.js Reconciliation |
| State Persistence | Chrome Storage API / `localStorage` fallback |
| Styling | Custom CSS3 (Material Design 3 Tokens) |

## Template Syntax

Mamout uses a tag-based system to mark the dynamic parts of a prompt. The `<INPUT>` tag defines fields that are rendered as UI components when the prompt is viewed.

### Syntax Example

```html
Act as a <INPUT type="small_text">Expert Translator</INPUT>.
Translate the following text to <INPUT type="options" values="Italian, French, Spanish">Italian</INPUT>
```

### Supported Attributes

| Attribute | Description |
|---|---|
| `type` | UI component to render. Supported values: `small_text`, `text`, `options`. |
| `values` | Required for `type="options"`. Comma-separated list of available choices. |
| *(inner content)* | Text between the opening and closing tags is used as the field's default/fallback value. |

## AI Integration

Mamout includes a `TemplatizePromptUseCase` designed to interface with Large Language Models. It uses a marker-based positioning system (`|N|`) so an LLM can identify insertion and edit points without altering the original text structure — ensuring high precision when converting existing prompts into dynamic Mamout templates while avoiding truncation issues.

## Real-Time Synchronization

The Mamout browser extension includes a built-in client-side WebSocket module that connects to the Mamout mobile app server over Wi-Fi / local network for instant, bi-directional prompt alignment.

### Key Highlights

- **Client-Side WebSocket Integration** — Manages persistent WebSocket client connections (`SyncClient.ts`) to the host address configured by the user in the extension UI.
- **Automated Real-Time Broadcasts** — Automatically transmits updated local prompts to the server upon creation, modification, or deletion actions in the extension.
- **Conflict Resolution** — Reconciles incoming prompt payloads into local IndexedDB storage using atomic Dexie transactions and `lastModified` timestamp comparisons.
- **Connection Management UI** — Features a Material 3 `SyncModal` and top-bar status indicators for configuring server IP/port addresses, displaying active connection states, and toggling sync operations.

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* `npm` or `pnpm`
* Google Chrome, Brave, Microsoft Edge, or any Chromium-based browser

### Installation & Loading

1. Clone the repository:
  ```bash
  git clone https://github.com/Mamout-Prompt/Mamout-Browser-Extension
  ```
2. Install dependencies:
  ```bash
  npm install
  ```
3. **Build the extension:**
  ```bash
  npm run build
  ```
4. **Load into Browser:**
* Open Chrome and navigate to `/extensions/`.
* Enable **Developer mode** (toggle switch in the top-right corner).
* Click **Load unpacked** and select the generated `dist` (or `build`) folder.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## License

This project is licensed under the GNU AGPL-3.0 License — see the [LICENSE](LICENSE) file for details.
