## Accessibility Extension – Setup Instructions

### Prerequisites
- **Node.js**: v18 or later
- **Package manager**: `npm` (bundled with Node.js)

### 1. Install dependencies
From the project root:

```bash
npm install
```

### 2. Build for production

```bash
npm run build
```

The optimized production build will be output to the `dist` directory.

### 3. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist` folder.
4. Ensure the extension is enabled.

### 4. Use the Accessibility panel

1. Open any website in Chrome.
2. Open **Developer Tools** (e.g. `F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
3. Navigate to the **Accessibility Minimal** tab.
4. Run the checks to see:
   - Total **passed** accessibility tests  
   - Total **violations**  
   - Detailed lists of violations, grouped in dropdowns with the specific elements that failed

