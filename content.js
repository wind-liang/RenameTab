/**
 * Tab Renamer Extension - Content Script
 * 
 * This script runs in the context of web pages and is responsible for:
 * 1. Changing the page title based on matching rules
 * 2. Responding to messages from the popup
 * 3. Persisting custom titles even after page refresh
 */

// Store the original title to revert if needed
let originalTitle = document.title;

// Keep track of the current applied rule
let currentAppliedRule = null;

/**
 * Set up message listener for communication with popup and background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    // Apply a new rule to the current page
    case 'applyRule':
      applyRule(message.rule);
      break;
      
    // Reset the title to the original
    case 'resetTitle':
      resetTitle();
      break;
      
    // Check if URL matches a rule
    case 'checkUrl':
      const matches = doesUrlMatchRule(window.location.href, message.rule);
      sendResponse({ matches });
      break;
  }
  
  // Allow for async response
  return true;
});

/**
 * Apply a rule to change the current page title
 */
function applyRule(rule) {
  // Store the rule that's being applied
  currentAppliedRule = rule;
  
  // Change the page title
  document.title = rule.title;
  
  // Store the rule ID in sessionStorage to persist across page refreshes
  sessionStorage.setItem('tabRenamerRule', JSON.stringify(rule));
}

/**
 * Reset the page title to its original value
 */
function resetTitle() {
  document.title = originalTitle;
  currentAppliedRule = null;
  sessionStorage.removeItem('tabRenamerRule');
}

/**
 * Check if a URL matches a rule
 */
function doesUrlMatchRule(url, rule) {
  const urlObj = new URL(url);
  
  switch (rule.type) {
    case 'domain':
      return urlObj.hostname === rule.pattern;
      
    case 'path':
      return urlObj.hostname + urlObj.pathname === rule.pattern;
      
    case 'params':
      // First check hostname and pathname
      if (urlObj.hostname + urlObj.pathname !== rule.pattern) {
        return false;
      }
      
      // Then check parameters
      const searchParams = new URLSearchParams(urlObj.search);
      const hashParams = urlObj.hash && urlObj.hash.length > 1 && urlObj.hash.includes('=') 
        ? new URLSearchParams(urlObj.hash.substring(1)) 
        : new Map();
      
      // Check if all rule parameters match URL parameters
      for (const [key, value] of Object.entries(rule.params)) {
        if (key.startsWith('hash_')) {
          const actualKey = key.replace('hash_', '');
          if (!hashParams.has(actualKey)) return false;
          
          // If value is regex, check if the URL param matches
          if (isRegexString(value)) {
            const regex = stringToRegex(value);
            if (!regex.test(hashParams.get(actualKey))) return false;
          } else if (hashParams.get(actualKey) !== value) {
            return false;
          }
        } else {
          if (!searchParams.has(key)) return false;
          
          // If value is regex, check if the URL param matches
          if (isRegexString(value)) {
            const regex = stringToRegex(value);
            if (!regex.test(searchParams.get(key))) return false;
          } else if (searchParams.get(key) !== value) {
            return false;
          }
        }
      }
      
      return true;
      
    default:
      return false;
  }
}

/**
 * Check if a string is a regex pattern
 */
function isRegexString(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('/') && str.lastIndexOf('/') > 0;
}

/**
 * Convert a string to a RegExp object
 */
function stringToRegex(str) {
  if (typeof str !== 'string') return new RegExp('.*');
  
  try {
    const lastSlashIndex = str.lastIndexOf('/');
    if (lastSlashIndex <= 0) return new RegExp(str);
    
    const pattern = str.slice(1, lastSlashIndex);
    const flags = str.slice(lastSlashIndex + 1);
    return new RegExp(pattern, flags);
  } catch (e) {
    console.error('Error creating regex from string:', e);
    return new RegExp('.*');
  }
}

/**
 * Initialize the content script when page loads
 */
function init() {
  // Save original title
  originalTitle = document.title;
  
  // Check for stored rule in session storage
  const storedRule = sessionStorage.getItem('tabRenamerRule');
  
  if (storedRule) {
    try {
      const rule = JSON.parse(storedRule);
      
      // Verify the rule still matches the current URL
      if (doesUrlMatchRule(window.location.href, rule)) {
        applyRule(rule);
      } else {
        // URL has changed and no longer matches the rule
        resetTitle();
      }
    } catch (e) {
      console.error('Error parsing stored rule:', e);
      resetTitle();
    }
  } else {
    // No stored rule, check if any existing rules match this URL
    chrome.storage.local.get('rules', ({ rules = [] }) => {
      for (const rule of rules) {
        if (doesUrlMatchRule(window.location.href, rule)) {
          applyRule(rule);
          break;
        }
      }
    });
  }
}

// Initialize when the page loads
init();

// Reapply title in case of SPA navigation or dynamic title changes
const titleObserver = new MutationObserver((mutations) => {
  if (!currentAppliedRule) return;
  
  for (const mutation of mutations) {
    if (mutation.target.nodeName === 'TITLE' && 
        document.title !== currentAppliedRule.title) {
      // Title has changed, reapply our custom title
      document.title = currentAppliedRule.title;
    }
  }
});

// Start observing the document title for changes
titleObserver.observe(document.querySelector('head > title') || document.querySelector('head'), 
  { subtree: true, characterData: true, childList: true }); 