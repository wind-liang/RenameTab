/**
 * Tab Renamer Extension - Background Script
 * 
 * This background script handles:
 * 1. Applying rules when navigating to new pages or refreshing
 * 2. Communication between the popup and content scripts
 * 3. Managing tab updates
 */

/**
 * Listen for tab updates
 * This will catch navigation events and page reloads
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// URLs, extension pages, etc.
    if (!tab.url.startsWith('http')) return;
    
    // Get all saved rules
    chrome.storage.local.get('rules', ({ rules = [] }) => {
      // Try to find a matching rule
      const matchingRule = findMatchingRule(tab.url, rules);
      
      // If a matching rule is found, apply it
      if (matchingRule) {
        applyRuleToTab(tabId, matchingRule);
      }
    });
  }
});

/**
 * Find a rule that matches the given URL
 */
function findMatchingRule(url, rules) {
  try {
    const urlObj = new URL(url);
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'domain':
          if (urlObj.hostname === rule.pattern) {
            return rule;
          }
          break;
          
        case 'path':
          if (urlObj.hostname + urlObj.pathname === rule.pattern) {
            return rule;
          }
          break;
          
        case 'params':
          // First, check if hostname and pathname match
          if (urlObj.hostname + urlObj.pathname !== rule.pattern) {
            continue;
          }
          
          // Then, have the content script check the parameters
          // (This is handled separately in the content script)
          return rule;
      }
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  
  return null;
}

/**
 * Apply a rule to a specific tab
 */
function applyRuleToTab(tabId, rule) {
  try {
    // For domain and path rules, we can directly apply
    if (rule.type === 'domain' || rule.type === 'path') {
      chrome.tabs.sendMessage(tabId, {
        action: 'applyRule',
        rule: rule
      });
    } else if (rule.type === 'params') {
      // For param rules, we need to check if parameters match first
      // Send the rule to the content script to check
      chrome.tabs.sendMessage(tabId, {
        action: 'checkUrl',
        rule: rule
      }, (response) => {
        // If the URL matches, apply the rule
        if (response && response.matches) {
          chrome.tabs.sendMessage(tabId, {
            action: 'applyRule',
            rule: rule
          });
        }
      });
    }
  } catch (e) {
    console.error('Error applying rule to tab:', e);
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
 * Initialize the extension
 */
function init() {
  // You could add additional initialization logic here if needed
  console.log('Tab Renamer extension initialized.');
}

// Run initialization
init(); 