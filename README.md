# Tab Renamer Browser Extension

This browser extension allows you to rename browser tabs based on URLs, making it easier to identify and organize tabs.

## Features

- Rename tabs based on domain, path, or URL parameters
- Supports regex pattern matching for URL parameters
- Each parameter has a regex checkbox for easy pattern matching
- Rules persist across page refreshes
- Easy management of saved rules
- Automatic title update for matching URLs

## Rule Types

The extension supports three types of rules:

1. **By Domain** - Matches any URL on the specified domain
2. **By Domain + Path** - Matches URLs with the specified domain and path
3. **By Domain + Path + Parameters** - Matches URLs with specific domain, path, and parameters

## Parameter Matching

For the "Domain + Path + Parameters" rule type, you can:

- Match exact parameter values
- Use regex patterns for parameter values by checking the "Regex" checkbox
- Match hash parameters (those after the `#` in the URL)

### Regex Examples

- `/\\d+/` - Match any numeric value
- `/user\\d+/i` - Match "user" followed by numbers (case insensitive)
- `/^(admin|editor)$/` - Match exactly "admin" or "editor"

## Installation

### Chrome/Edge

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" and select the `manifest.json` file

## Usage

1. Navigate to a website you want to create a rule for
2. Click on the extension icon
3. Select a rule type (Domain, Path, or Parameters)
4. Customize the URL pattern if needed
5. Enter your custom title
6. For parameter rules, you can modify parameter values or use regex
7. Click "Save Rule"

## Editing Existing Rules

All your saved rules appear at the bottom of the extension popup. You can:

- Click the "×" button to delete a rule
- Create a new rule to replace an existing one (rules with matching patterns will be highlighted)

## Notes

- The extension uses local storage to save rules, so they are persistent across browser sessions
- Rules with parameter regex will be evaluated at runtime to determine matches

## License

MIT 