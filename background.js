// 存储标签页的原始标题
const originalTitles = {};

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 只在页面加载完成或标题变更时处理
  if (changeInfo.status === 'complete' || changeInfo.title) {
    processTab(tabId, tab);
  }
});

// 监听来自其他部分的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 规则更新消息（来自popup）
  if (message.action === 'rulesUpdated') {
    // 重新应用规则到所有打开的标签页
    applyToAllTabs();
  }
  
  // 内容脚本就绪消息（来自content script）
  if (message.action === 'contentScriptReady') {
    if (sender.tab) {
      processTab(sender.tab.id, sender.tab);
    }
  }
  
  // 标题变更消息（来自content script）
  if (message.action === 'titleChanged') {
    if (sender.tab) {
      // 检查这个标题变化是否由网页本身引起的
      // 如果是，更新我们存储的原始标题
      const tabId = sender.tab.id;
      const currentStored = originalTitles[tabId];
      
      // 只有当我们确定这是一个由页面本身产生的新标题时，才更新原始标题
      if (!currentStored || 
          (message.originalTitle && 
           message.originalTitle !== currentStored)) {
        originalTitles[tabId] = message.originalTitle;
        
        // 重新处理标签以应用我们的规则
        processTab(tabId, sender.tab);
      }
    }
  }
});

// 初始化时应用规则到所有标签页
chrome.runtime.onInstalled.addListener(() => {
  applyToAllTabs();
});

// 应用规则到所有打开的标签页
function applyToAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      processTab(tab.id, tab);
    });
  });
}

// 处理单个标签页
function processTab(tabId, tab) {
  // 如果标签页没有URL或是扩展页面，则跳过
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // 获取所有规则
  chrome.storage.sync.get('rules', (data) => {
    const rules = data.rules || [];
    let matchedRule = findMatchingRule(tab.url, rules);
    
    if (matchedRule) {
      // 存储原始标题（如果还没存储）
      if (!originalTitles[tabId] && tab.title) {
        originalTitles[tabId] = tab.title;
      }
      
      // 应用标题格式
      const originalTitle = originalTitles[tabId] || tab.title;
      const url = new URL(tab.url);
      const domain = url.hostname;
      const path = url.pathname;
      const query = url.search;
      
      const newTitle = matchedRule.format
        .replace(/{title}/g, originalTitle)
        .replace(/{domain}/g, domain)
        .replace(/{path}/g, path)
        .replace(/{query}/g, query);
      
      // 通过content script修改标题
      chrome.tabs.sendMessage(tabId, { 
        action: 'changeTitle', 
        title: newTitle 
      }, (response) => {
        // 处理可能的错误（例如content script尚未加载）
        if (chrome.runtime.lastError) {
          console.log('Error sending message to content script:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// 查找匹配的规则
function findMatchingRule(url, rules) {
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const path = urlObj.pathname;
  const fullUrl = url.toLowerCase();
  const domainAndPath = (domain + path).toLowerCase();
  const domainPathQuery = (domain + path + urlObj.search).toLowerCase();
  
  // 按添加顺序检查规则（越新的规则优先级越高）
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    const pattern = rule.pattern.toLowerCase();
    
    switch (rule.type) {
      case 'domain':
        // 域名匹配
        if (domain === pattern || domain.endsWith('.' + pattern)) {
          return rule;
        }
        break;
        
      case 'url':
        // URL包含匹配 - 增强匹配逻辑以处理不同的URL部分组合
        if (fullUrl.includes(pattern) || 
            domainAndPath === pattern || 
            domainPathQuery === pattern) {
          return rule;
        }
        break;
        
      case 'regex':
        // 正则表达式匹配
        try {
          const regex = new RegExp(rule.pattern);
          if (regex.test(fullUrl)) {
            return rule;
          }
        } catch (e) {
          console.error('Invalid regex pattern:', rule.pattern);
        }
        break;
    }
  }
  
  return null;
}

// 处理标签页关闭事件，清理存储
chrome.tabs.onRemoved.addListener((tabId) => {
  delete originalTitles[tabId];
}); 