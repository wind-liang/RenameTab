/**
 * Tab Renamer Extension - Popup Logic
 * 
 * This script handles all the functionality for the popup UI, 
 * including rule creation, rule management, and parameter handling.
 */

// DOM Elements
const patternInput = document.getElementById('pattern-input');
const titleInput = document.getElementById('title-input');
const ruleTypeRadios = document.querySelectorAll('input[name="rule-type"]');
const paramsSection = document.getElementById('params-section');
const paramsList = document.getElementById('params-list');
const saveButton = document.getElementById('save-btn');
const cancelButton = document.getElementById('cancel-btn');
const rulesList = document.getElementById('rules-list');

// Global variables
let currentTab = null;
let currentUrl = null;
let urlObject = null;
let urlParams = new Map();
let editingRuleIndex = -1; // 标记当前正在编辑的规则索引

/**
 * Initialize the popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Get the current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  currentUrl = currentTab.url;
  
  // Parse the URL
  urlObject = new URL(currentUrl);
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize the rule type selection
  handleRuleTypeChange();
  
  // Parse URL parameters if they exist
  parseUrlParameters();
  
  // Load existing rules
  loadRules();
  
  // Check if current URL matches any existing rule
  checkForMatchingRules();
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Rule type change
  ruleTypeRadios.forEach(radio => {
    radio.addEventListener('change', handleRuleTypeChange);
  });
  
  // Save button
  saveButton.addEventListener('click', saveRule);
  
  // Cancel button
  cancelButton.addEventListener('click', () => {
    if (editingRuleIndex !== -1) {
      // 如果在编辑模式，取消时重置表单
      resetForm();
    } else {
      window.close();
    }
  });
}

/**
 * Reset the form and exit edit mode
 */
function resetForm() {
  editingRuleIndex = -1;
  titleInput.value = '';
  saveButton.textContent = '保存规则';
  cancelButton.textContent = '取消';
  
  // 重置URL和参数
  handleRuleTypeChange();
}

/**
 * Handle rule type radio button change
 */
function handleRuleTypeChange() {
  // Get selected rule type
  const selectedRuleType = document.querySelector('input[name="rule-type"]:checked').value;
  
  // Update pattern input based on rule type
  switch (selectedRuleType) {
    case 'domain':
      patternInput.value = urlObject.hostname;
      paramsSection.style.display = 'none';
      break;
    case 'path':
      patternInput.value = urlObject.hostname + urlObject.pathname;
      paramsSection.style.display = 'none';
      break;
    case 'params':
      patternInput.value = urlObject.hostname + urlObject.pathname;
      parseUrlParameters();
      paramsSection.style.display = 'block';
      break;
  }
}

/**
 * Parse URL parameters from the current URL
 */
function parseUrlParameters() {
  // Clear existing parameters
  paramsList.innerHTML = '';
  urlParams.clear();
  
  // Parse search parameters
  const searchParams = new URLSearchParams(urlObject.search);
  
  searchParams.forEach((value, key) => {
    urlParams.set(key, value);
    addParameterToUI(key, value);
  });
  
  // Parse hash parameters if they exist
  if (urlObject.hash && urlObject.hash.length > 1) {
    // Remove the # symbol
    const hashString = urlObject.hash.substring(1);
    
    // Check if the hash contains key-value pairs
    if (hashString.includes('=')) {
      const hashParams = new URLSearchParams(hashString);
      hashParams.forEach((value, key) => {
        urlParams.set(`hash_${key}`, value);
        addParameterToUI(`hash_${key}`, value, true);
      });
    }
  }
}

/**
 * Add a parameter to the UI
 */
function addParameterToUI(key, value, isHash = false) {
  const paramItem = document.createElement('div');
  paramItem.className = 'param-item';
  
  const keyElement = document.createElement('div');
  keyElement.className = 'param-key';
  keyElement.textContent = isHash ? `#${key.replace('hash_', '')}` : key;
  
  const valueContainer = document.createElement('div');
  valueContainer.className = 'param-value-container';
  
  const valueInput = document.createElement('input');
  valueInput.className = 'param-value';
  valueInput.value = isRegexString(value) ? value.slice(1, value.lastIndexOf('/')) : value;
  valueInput.setAttribute('data-key', key);
  valueInput.addEventListener('input', (e) => {
    updateParamValue(key, e.target.value, regexCheckbox.checked);
  });
  
  // Create checkbox for regex
  const regexLabel = document.createElement('label');
  regexLabel.className = 'regex-label';
  
  const regexCheckbox = document.createElement('input');
  regexCheckbox.type = 'checkbox';
  regexCheckbox.className = 'regex-checkbox';
  regexCheckbox.checked = isRegexString(value);
  regexCheckbox.addEventListener('change', (e) => {
    updateParamValue(key, valueInput.value, e.target.checked);
  });
  
  regexLabel.appendChild(regexCheckbox);
  regexLabel.appendChild(document.createTextNode('正则'));
  
  valueContainer.appendChild(valueInput);
  valueContainer.appendChild(regexLabel);
  
  paramItem.appendChild(keyElement);
  paramItem.appendChild(valueContainer);
  paramsList.appendChild(paramItem);
}

/**
 * Update parameter value in the urlParams Map
 */
function updateParamValue(key, value, isRegex) {
  if (isRegex) {
    // Store as regex format: /pattern/
    // Default to case-insensitive if they don't specify flags
    const hasFlags = value.includes('/') && value.lastIndexOf('/') > 0;
    const val = hasFlags ? value : `/${value}/i`;
    urlParams.set(key, val);
  } else {
    urlParams.set(key, value);
  }
}

/**
 * Save a new rule or update an existing one
 */
async function saveRule() {
  // Get the selected rule type
  const ruleType = document.querySelector('input[name="rule-type"]:checked').value;
  
  // Get the custom title
  const customTitle = titleInput.value.trim();
  
  // Validate inputs
  if (!customTitle) {
    alert('请输入自定义标题');
    return;
  }
  
  // Create rule object
  const rule = {
    type: ruleType,
    pattern: patternInput.value,
    title: customTitle,
    createdAt: Date.now()
  };
  
  // Add parameters if rule type is 'params'
  if (ruleType === 'params') {
    rule.params = {};
    urlParams.forEach((value, key) => {
      rule.params[key] = value;
    });
  }
  
  // Get existing rules
  const { rules = [] } = await chrome.storage.local.get('rules');
  
  if (editingRuleIndex !== -1) {
    // 更新现有规则
    rules[editingRuleIndex] = rule;
    
    // 保存规则后重置编辑状态
    editingRuleIndex = -1;
    saveButton.textContent = '保存规则';
    cancelButton.textContent = '取消';
  } else {
    // 添加新规则
    rules.push(rule);
  }
  
  // Save to storage
  await chrome.storage.local.set({ rules });
  
  // Reload rules list
  loadRules();
  
  // Clear inputs
  titleInput.value = '';
  
  // Apply the rule to the current tab
  applyRuleToCurrentTab(rule);
}

/**
 * Load existing rules from storage
 */
async function loadRules() {
  // Clear existing rules list
  rulesList.innerHTML = '';
  
  // Get rules from storage
  const { rules = [] } = await chrome.storage.local.get('rules');
  
  // Display rules
  if (rules.length === 0) {
    const noRules = document.createElement('div');
    noRules.textContent = '暂无规则';
    noRules.style.padding = '10px';
    noRules.style.color = '#666';
    rulesList.appendChild(noRules);
    return;
  }
  
  rules.forEach((rule, index) => {
    addRuleToUI(rule, index);
  });
}

/**
 * Add a rule to the UI
 */
function addRuleToUI(rule, index) {
  const ruleItem = document.createElement('div');
  ruleItem.className = 'rule-item';
  
  const ruleInfo = document.createElement('div');
  ruleInfo.className = 'rule-info';
  
  const rulePattern = document.createElement('div');
  rulePattern.className = 'rule-pattern';
  rulePattern.textContent = rule.pattern;
  
  const ruleTitle = document.createElement('div');
  ruleTitle.className = 'rule-title';
  ruleTitle.textContent = `标题: ${rule.title}`;
  
  const ruleActions = document.createElement('div');
  ruleActions.className = 'rule-actions';
  
  const editButton = document.createElement('button');
  editButton.className = 'edit-btn';
  editButton.textContent = '✎';
  editButton.title = '编辑规则';
  editButton.addEventListener('click', () => editRule(index));
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-btn';
  deleteButton.textContent = '×';
  deleteButton.title = '删除规则';
  deleteButton.addEventListener('click', () => deleteRule(index));
  
  ruleInfo.appendChild(rulePattern);
  ruleInfo.appendChild(ruleTitle);
  ruleItem.appendChild(ruleInfo);
  
  ruleActions.appendChild(editButton);
  ruleActions.appendChild(deleteButton);
  ruleItem.appendChild(ruleActions);
  
  rulesList.appendChild(ruleItem);
}

/**
 * Delete a rule
 */
async function deleteRule(index) {
  // Get rules from storage
  const { rules = [] } = await chrome.storage.local.get('rules');
  
  // Remove the rule
  rules.splice(index, 1);
  
  // Save to storage
  await chrome.storage.local.set({ rules });
  
  // Reload rules list
  loadRules();
  
  // Reset the current tab's title if it was using this rule
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTitle' });
  });
}

/**
 * Check if the current URL matches any existing rule
 */
async function checkForMatchingRules() {
  const { rules = [] } = await chrome.storage.local.get('rules');
  
  // Highlight matching rules in the UI
  rules.forEach((rule, index) => {
    if (doesUrlMatchRule(currentUrl, rule)) {
      const ruleItems = rulesList.querySelectorAll('.rule-item');
      if (ruleItems[index]) {
        ruleItems[index].style.backgroundColor = '#e8f0fe';
      }
    }
  });
}

/**
 * Apply a rule to the current tab
 */
function applyRuleToCurrentTab(rule) {
  chrome.tabs.sendMessage(currentTab.id, {
    action: 'applyRule',
    rule: rule
  });
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
 * Edit a rule
 */
async function editRule(index) {
  // 获取规则
  const { rules = [] } = await chrome.storage.local.get('rules');
  const rule = rules[index];
  
  if (!rule) return;
  
  // 设置编辑模式
  editingRuleIndex = index;
  
  // 根据规则类型选择相应的单选按钮
  document.querySelector(`input[name="rule-type"][value="${rule.type}"]`).checked = true;
  
  // 设置URL模式和标题
  patternInput.value = rule.pattern;
  titleInput.value = rule.title;
  
  // 如果是参数规则，加载参数
  if (rule.type === 'params') {
    // 清空当前参数列表
    paramsList.innerHTML = '';
    urlParams.clear();
    
    // 添加规则中的参数
    if (rule.params) {
      Object.entries(rule.params).forEach(([key, value]) => {
        const isHash = key.startsWith('hash_');
        urlParams.set(key, value);
        addParameterToUI(key, value, isHash);
      });
    }
    
    // 显示参数部分
    paramsSection.style.display = 'block';
  } else {
    paramsSection.style.display = 'none';
  }
  
  // 更改按钮文本
  saveButton.textContent = '更新规则';
  cancelButton.textContent = '取消编辑';
} 