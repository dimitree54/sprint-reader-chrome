#!/usr/bin/env node

/**
 * Simple utility to show the current extension ID and required Kinde callback URL
 *
 * Usage:
 * 1. Load your extension in Chrome
 * 2. Open chrome://extensions
 * 3. Find your extension and copy the ID
 * 4. Run: node scripts/show-extension-id.mjs <your-extension-id>
 */

const [,, extensionId] = process.argv;

if (!extensionId) {
  console.log(`
🔍 HOW TO GET YOUR EXTENSION ID:

1. Open Chrome and go to: chrome://extensions
2. Enable "Developer mode" (top right toggle)
3. Find "10x your reading speed" extension
4. Copy the ID (looks like: cpgcobbgobpoogfnggbfeepicamemlak)
5. Run: node scripts/show-extension-id.mjs <your-id>

Example:
  node scripts/show-extension-id.mjs cpgcobbgobpoogfnggbfeepicamemlak
`);
  process.exit(1);
}

// Validate extension ID format
if (!/^[a-p]{32}$/.test(extensionId)) {
  console.error('❌ Invalid extension ID format. Should be 32 characters (a-p only)');
  console.log('Example: cpgcobbgobpoogfnggbfeepicamemlak');
  process.exit(1);
}

const callbackUrl = `https://${extensionId}.chromiumapp.org/`;

console.log(`
${'='.repeat(70)}
🔐 KINDE CALLBACK URL CONFIGURATION
${'='.repeat(70)}

📋 Extension ID: ${extensionId}

🔗 Add this URL to Kinde "Allowed callback URLs":
   ${callbackUrl}

📋 Steps in Kinde Dashboard:
   1. Login to your Kinde Dashboard
   2. Go to Settings → Applications → [Your App]
   3. Find "Allowed callback URLs" section
   4. Add: ${callbackUrl}
   5. Save the configuration

✅ Once added, your Kinde authentication should work!

${'='.repeat(70)}
`);