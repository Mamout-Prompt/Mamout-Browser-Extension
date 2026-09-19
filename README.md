# Mamout (Browser Extension)

**Mamout** is a professional prompt management browser extension built with modern Web technologies (React, TypeScript, Manifest V3). It allows users to create, organize, and quickly compile complex prompt templates directly within their browser popup or sidebar.

The core strength of Mamout is its custom template engine, which transforms static text into dynamic forms using a simple tag-based syntax, no need to manually rewrite prompts every time a detail changes.

## Key Features

- **Dynamic Template Engine** — Define variables within your prompts using a custom `<INPUT>` tag system.
- **AI-Powered Templatization Wizard** — 3-step wizard that automatically converts raw text into dynamic templates via an LLM meta-prompt assistant.
- **Interactive Viewer & Live Preview** — Dynamic forms generate on the fly with real-time preview updates as you edit raw template code.
- **Auto-Save Drafts & State Persistence** — Creation drafts and active UI states are automatically saved via `chrome.storage.local`, ensuring you never lose your work when closing the extension popup.
- **Advanced Search** — Quickly locate prompts by title, description, or template content.
- **Material 3 Design Tokens** — Modern UI styled with CSS variables inspired by Material Design 3 guidelines.
- **Offline First** — Full local persistence using IndexedDB (via Dexie.js); your prompts remain accessible without an internet connection.

## Technology Stack

| Category | Technology |
|---|---|
| Language | TypeScript |
| UI Library | React |
| Extension Framework | Chrome Extension Manifest V3 |
| Database | IndexedDB (Dexie.js) |
| Reactive Streams | RxJS |
| State Persistence | Chrome Storage API / `localStorage` fallback |
| Styling | Custom CSS3 (Material Design 3 Tokens) |

## Template Syntax

Mamout uses a tag-based syntax to mark dynamic parts of a prompt. The `<INPUT>` tag defines fields that are rendered as interactive UI components when viewing a prompt.

### Syntax Example

```html
Act as a <INPUT type="smallText">Expert Translator</INPUT>.
Translate the following text to <INPUT type="options" values="Italian, French, Spanish">Italian</INPUT>:
<INPUT type="text">Your text here...</INPUT>

```

### Supported Attributes

| Attribute | Description |
| --- | --- |
| `type` | UI component to render. Supported values: `text` (multiline), `smallText` (single-line input), `options` (dropdown menu). |
| `values` | Required for `type="options"`. Comma-separated list of available choices. |
| *(inner content)* | Text between the opening and closing tags is used as the default/fallback value. |

## AI Integration

Mamout includes a `TemplatizePromptUseCase` to easily transform standard text into dynamic templates:

1. **Copy Meta-Prompt**: Wraps your raw text into a specialized prompt for Large Language Models (ChatGPT, Claude, Gemini).
2. **LLM Analysis**: The LLM identifies dynamic variables and returns a structured JSON output.
3. **Automated Conversion**: Mamout parses the JSON response and automatically injects the appropriate `<INPUT>` tags into your raw template.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/?utm_source=gemini) (v18 or higher)
* `npm` or `yarn`
* Google Chrome, Brave, Microsoft Edge, or any Chromium-based browser

### Installation & Loading

1. **Clone the repository:**
```bash
git clone [https://github.com/YourUsername/Mamout-Extension.git](https://github.com/YourUsername/Mamout-Extension.git)
cd Mamout-Extension

```


2. **Install dependencies:**
```bash
npm install

```


3. **Build the extension:**
```bash
npm run build

```


4. **Load into Browser:**
* Open Chrome and navigate to `chrome://extensions/`.
* Enable **Developer mode** (toggle switch in the top-right corner).
* Click **Load unpacked** and select the generated `dist` (or `build`) folder.



## Contributing

Contributions are welcome! Please open an issue to discuss proposed changes before submitting a pull request.

## License

This project is licensed under the GNU AGPL-3.0 License — see the [LICENSE](https://www.google.com/search?q=LICENSE&utm_source=gemini) file for details.
