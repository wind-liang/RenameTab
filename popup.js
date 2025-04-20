document.addEventListener('DOMContentLoaded', () => {
  const addRuleButton = document.getElementById('add-rule');
  const patternTypeSelect = document.getElementById('pattern-type');
  const patternValueInput = document.getElementById('pattern-value');
  const titleFormatInput = document.getElementById('title-format');
  const rulesList = document.getElementById('rules-list');
  
  // 快速选项按钮
  const useDomainOnlyBtn = document.getElementById('use-domain-only');
  const useDomainPathBtn = document.getElementById('use-domain-path');
  const useFullUrlBtn = document.getElementById('use-full-url');
  const useRegexBtn = document.getElementById('use-regex');
  
  // 当前页面信息显示
  const currentPageTitle = document.getElementById('current-page-title');
  const currentPageUrl = document.getElementById('current-page-url');
  
  // 存储当前标签页信息
  let currentTabInfo = {
    url: '',
    domain: '',
    path: '',
    query: '',
    title: ''
  };
  
  // 加载当前标签页信息
  loadCurrentTabInfo();
  
  // 加载已保存的规则
  loadRules();
  
  // 获取当前标签页信息
  function loadCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        
        // 设置标签标题
        currentPageTitle.textContent = currentTab.title || '无标题';
        
        // 如果是有效的URL，提取信息并填充表单
        if (currentTab.url && !currentTab.url.startsWith('chrome://') && !currentTab.url.startsWith('chrome-extension://')) {
          try {
            const url = new URL(currentTab.url);
            const domain = url.hostname;
            const path = url.pathname;
            const query = url.search;
            
            // 存储当前标签页信息
            currentTabInfo = {
              url: currentTab.url,
              domain: domain,
              path: path,
              query: query,
              title: currentTab.title || '无标题'
            };
            
            // 显示当前URL
            currentPageUrl.textContent = currentTab.url;
            
            // 默认选择域名匹配
            patternTypeSelect.value = 'domain';
            patternValueInput.value = domain;
            
            // 默认标题格式使用原始标题
            titleFormatInput.value = '{title}';
          } catch (e) {
            console.error('解析URL时出错:', e);
            currentPageUrl.textContent = '无效URL';
          }
        } else {
          currentPageUrl.textContent = '浏览器内部页面';
        }
      }
    });
  }
  
  // 快速选项按钮事件
  useDomainOnlyBtn.addEventListener('click', () => {
    patternTypeSelect.value = 'domain';
    patternValueInput.value = currentTabInfo.domain;
  });
  
  useDomainPathBtn.addEventListener('click', () => {
    patternTypeSelect.value = 'url';
    patternValueInput.value = currentTabInfo.domain + currentTabInfo.path;
  });
  
  useFullUrlBtn.addEventListener('click', () => {
    patternTypeSelect.value = 'url';
    patternValueInput.value = currentTabInfo.domain + currentTabInfo.path + currentTabInfo.query;
  });
  
  useRegexBtn.addEventListener('click', () => {
    patternTypeSelect.value = 'regex';
    patternValueInput.value = '';
  });
  
  // 匹配类型变更时更新匹配值输入框
  patternTypeSelect.addEventListener('change', () => {
    updatePatternValueByType();
  });
  
  // 根据选择的匹配类型更新匹配值
  function updatePatternValueByType() {
    const selectedType = patternTypeSelect.value;
    
    switch (selectedType) {
      case 'domain':
        patternValueInput.value = currentTabInfo.domain;
        break;
      case 'url':
        patternValueInput.value = currentTabInfo.domain + currentTabInfo.path;
        break;
      case 'regex':
        // 对于正则表达式，我们不自动填充
        patternValueInput.value = '';
        break;
    }
  }
  
  addRuleButton.addEventListener('click', () => {
    const patternType = patternTypeSelect.value;
    const patternValue = patternValueInput.value.trim();
    const titleFormat = titleFormatInput.value.trim();
    
    if (!patternValue || !titleFormat) {
      alert('请填写匹配值和标题格式');
      return;
    }
    
    const rule = {
      type: patternType,
      pattern: patternValue,
      format: titleFormat,
      id: Date.now()
    };
    
    saveRule(rule);
    patternValueInput.value = '';
    titleFormatInput.value = '';
  });
  
  function saveRule(rule) {
    chrome.storage.sync.get('rules', (data) => {
      const rules = data.rules || [];
      rules.push(rule);
      
      chrome.storage.sync.set({ rules }, () => {
        loadRules();
        
        // 通知后台脚本规则已更新
        chrome.runtime.sendMessage({ action: 'rulesUpdated' });
      });
    });
  }
  
  function loadRules() {
    chrome.storage.sync.get('rules', (data) => {
      const rules = data.rules || [];
      displayRules(rules);
    });
  }
  
  function displayRules(rules) {
    rulesList.innerHTML = '';
    
    if (rules.length === 0) {
      rulesList.innerHTML = '<p>尚无保存的规则</p>';
      return;
    }
    
    rules.forEach(rule => {
      const ruleItem = document.createElement('div');
      ruleItem.className = 'rule-item';
      
      const typeLabels = {
        'domain': '域名',
        'url': 'URL包含',
        'regex': '正则表达式'
      };
      
      ruleItem.innerHTML = `
        <div class="detail">
          <strong>${typeLabels[rule.type]}:</strong> ${rule.pattern}<br>
          <strong>格式:</strong> ${rule.format}
        </div>
        <div class="actions">
          <button class="delete-btn" data-id="${rule.id}">删除</button>
        </div>
      `;
      
      rulesList.appendChild(ruleItem);
      
      // 添加删除按钮事件
      ruleItem.querySelector('.delete-btn').addEventListener('click', (e) => {
        const ruleId = parseInt(e.target.getAttribute('data-id'));
        deleteRule(ruleId);
      });
    });
  }
  
  function deleteRule(ruleId) {
    chrome.storage.sync.get('rules', (data) => {
      const rules = data.rules || [];
      const updatedRules = rules.filter(rule => rule.id !== ruleId);
      
      chrome.storage.sync.set({ rules: updatedRules }, () => {
        loadRules();
        
        // 通知后台脚本规则已更新
        chrome.runtime.sendMessage({ action: 'rulesUpdated' });
      });
    });
  }
}); 