document.addEventListener('DOMContentLoaded', function() {
  // DOM元素
  const ruleTypeRadios = document.getElementsByName('rule-type');
  const urlPatternInput = document.getElementById('url-pattern');
  const titleInput = document.getElementById('title');
  const saveButton = document.getElementById('save-rule');
  const updateButton = document.getElementById('update-rule');
  const cancelEditButton = document.getElementById('cancel-edit');
  const savedRulesContainer = document.getElementById('saved-rules');
  const paramsContainer = document.getElementById('params-container');
  const paramsList = document.getElementById('params-list');
  
  let currentUrl = '';
  let currentTabId = null;
  let currentTitle = '';
  let savedRules = [];
  let currentRuleMatch = null;
  let editingRuleIndex = null;

  // 获取当前标签页信息
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      const tab = tabs[0];
      currentTabId = tab.id;
      currentUrl = tab.url;
      currentTitle = tab.title;
      
      // 填充URL模式输入框
      updateUrlPattern();
      
      // 读取保存的规则
      loadSavedRules();
    }
  });

  // 监听规则类型选择变化
  for (const radio of ruleTypeRadios) {
    radio.addEventListener('change', function() {
      updateUrlPattern();
    });
  }

  // 根据选择的规则类型更新URL模式
  function updateUrlPattern() {
    try {
      const url = new URL(currentUrl);
      const selectedRuleType = document.querySelector('input[name="rule-type"]:checked').value;
      
      if (selectedRuleType === 'domain') {
        urlPatternInput.value = url.hostname;
        paramsContainer.classList.add('hidden');
      } else if (selectedRuleType === 'domain-path') {
        urlPatternInput.value = url.hostname + url.pathname;
        paramsContainer.classList.add('hidden');
      } else if (selectedRuleType === 'domain-path-params') {
        urlPatternInput.value = url.hostname + url.pathname;
        
        // 清空现有参数列表
        paramsList.innerHTML = '';
        
        // 获取当前保留的参数
        const existingParams = new Set();
        paramsList.querySelectorAll('.param-group').forEach(group => {
          const input = group.querySelector('input[type="text"]');
          existingParams.add(input.dataset.key);
        });
        
        // 只添加尚未存在的参数
        const searchParams = url.searchParams;
        for (const [key, value] of searchParams.entries()) {
          if (!existingParams.has(key)) {
            addParamRow(key, value, false);
          }
        }
        
        // 处理hash参数
        if (url.hash) {
          const hashContent = url.hash.substring(1);
          if (hashContent.includes('=')) {
            const hashParams = new URLSearchParams(hashContent);
            for (const [key, value] of hashParams.entries()) {
              if (!existingParams.has(key)) {
                addParamRow(key, value, true);
              }
            }
          } else if (hashContent && !existingParams.has('hash')) {
            addParamRow('hash', hashContent, true);
          }
        }
        
        paramsContainer.classList.remove('hidden');
      }
    } catch (e) {
      console.error("Error parsing URL:", e);
      urlPatternInput.value = currentUrl;
    }
  }

  // 添加参数设置行
  function addParamRow(key, value, isHash, isRegex = false) {
    const paramGroup = document.createElement('div');
    paramGroup.className = 'param-group';
    
    const paramKey = document.createElement('span');
    paramKey.textContent = isHash ? `#${key}` : key;
    paramKey.className = 'param-key';
    
    const paramValue = document.createElement('input');
    paramValue.type = 'text';
    paramValue.value = value;
    paramValue.className = 'param-value';
    paramValue.dataset.key = key;
    paramValue.dataset.isHash = isHash;
    
    const paramControls = document.createElement('div');
    paramControls.className = 'param-controls';
    
    const regexCheckbox = document.createElement('input');
    regexCheckbox.type = 'checkbox';
    regexCheckbox.id = `regex-${key}`;
    regexCheckbox.dataset.key = key;
    regexCheckbox.checked = isRegex;
    
    const regexLabel = document.createElement('label');
    regexLabel.htmlFor = `regex-${key}`;
    regexLabel.textContent = '正则';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '×';
    deleteButton.className = 'delete-param';
    deleteButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      paramGroup.remove();
      
      // 检查是否还有参数，如果没有参数则隐藏参数容器
      if (paramsList.children.length === 0) {
        paramsContainer.classList.add('hidden');
      }
      
      // 更新 URL 模式
      try {
        const url = new URL(currentUrl);
        const selectedRuleType = document.querySelector('input[name="rule-type"]:checked').value;
        if (selectedRuleType === 'domain-path-params') {
          // 重新构建 URL pattern
          urlPatternInput.value = url.hostname + url.pathname;
        }
      } catch (e) {
        console.error("Error updating URL pattern:", e);
      }
    });
    
    paramControls.appendChild(regexCheckbox);
    paramControls.appendChild(regexLabel);
    paramGroup.appendChild(paramKey);
    paramGroup.appendChild(paramValue);
    paramGroup.appendChild(paramControls);
    paramGroup.appendChild(deleteButton);
    
    paramsList.appendChild(paramGroup);
  }

  // 收集表单数据
  function collectFormData() {
    const title = titleInput.value.trim();
    if (!title) {
      alert('请输入自定义标题');
      return null;
    }
    
    const ruleType = document.querySelector('input[name="rule-type"]:checked').value;
    const urlPattern = urlPatternInput.value;
    
    let rule = {
      type: ruleType,
      pattern: urlPattern,
      title: title
    };
    
    if (ruleType === 'domain-path-params') {
      rule.params = [];
      const paramGroups = paramsList.querySelectorAll('.param-group');
      
      paramGroups.forEach(group => {
        const valueInput = group.querySelector('input[type="text"]');
        const regexCheckbox = group.querySelector('input[type="checkbox"]');
        
        rule.params.push({
          key: valueInput.dataset.key,
          value: valueInput.value,
          isRegex: regexCheckbox.checked,
          isHash: valueInput.dataset.isHash === 'true'
        });
      });
    }

    return rule;
  }

  // 保存规则
  saveButton.addEventListener('click', function() {
    const rule = collectFormData();
    if (!rule) return;
    
    savedRules.push(rule);
    chrome.storage.local.set({rules: savedRules}, function() {
      renderSavedRules();
      // 立即应用规则到当前标签页
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          // 先发送消息给 content script 更新标题
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'applyRule',
            rule: rule
          });
          
          // 同时更新浏览器标签页的标题
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'getTitle'
          }, function(response) {
            if (response && response.title) {
              chrome.tabs.update(tabs[0].id, {
                title: response.title
              });
            }
          });
        }
      });
      
      // 清空表单
      titleInput.value = '';
    });
  });

  // 更新规则
  updateButton.addEventListener('click', function() {
    if (editingRuleIndex === null) return;
    
    const rule = collectFormData();
    if (!rule) return;
    
    savedRules[editingRuleIndex] = rule;
    chrome.storage.local.set({rules: savedRules}, function() {
      exitEditMode();
      renderSavedRules();
      // 立即应用规则
      applyRuleToCurrentTab(rule);
    });
  });

  // 取消编辑
  cancelEditButton.addEventListener('click', exitEditMode);

  // 进入编辑模式
  function enterEditMode(rule, index) {
    editingRuleIndex = index;
    
    // 设置表单值
    document.querySelector(`input[name="rule-type"][value="${rule.type}"]`).checked = true;
    urlPatternInput.value = rule.pattern;
    titleInput.value = rule.title;
    
    // 如果有参数，设置参数值
    if (rule.type === 'domain-path-params' && rule.params) {
      paramsList.innerHTML = '';
      rule.params.forEach(param => {
        addParamRow(param.key, param.value, param.isHash, param.isRegex);
      });
      paramsContainer.classList.remove('hidden');
    } else {
      paramsContainer.classList.add('hidden');
    }
    
    // 切换按钮显示
    saveButton.classList.add('edit-mode');
    document.querySelector('.edit-buttons').classList.add('edit-mode');
  }

  // 退出编辑模式
  function exitEditMode() {
    editingRuleIndex = null;
    
    // 重置表单
    document.querySelector('input[name="rule-type"][value="domain"]').checked = true;
    titleInput.value = '';
    updateUrlPattern();
    
    // 切换按钮显示
    saveButton.classList.remove('edit-mode');
    document.querySelector('.edit-buttons').classList.remove('edit-mode');
  }

  // 加载保存的规则
  function loadSavedRules() {
    chrome.storage.local.get('rules', function(data) {
      if (data.rules && Array.isArray(data.rules)) {
        savedRules = data.rules;
        checkForMatchingRule();
        renderSavedRules();
      }
    });
  }

  // 渲染保存的规则
  function renderSavedRules() {
    savedRulesContainer.innerHTML = '';
    
    if (savedRules.length === 0) {
      const noRules = document.createElement('div');
      noRules.textContent = '暂无保存的规则';
      savedRulesContainer.appendChild(noRules);
      return;
    }
    
    savedRules.forEach((rule, index) => {
      const ruleItem = document.createElement('div');
      ruleItem.className = 'rule-item';
      if (currentRuleMatch && currentRuleMatch.index === index) {
        ruleItem.classList.add('current-rule');
      }
      
      const ruleInfo = document.createElement('div');
      ruleInfo.className = 'rule-info';
      ruleInfo.innerHTML = `<strong>${rule.title}</strong><br><small>${rule.pattern}</small>`;
      
      const ruleActions = document.createElement('div');
      ruleActions.className = 'rule-actions';
      
      const editButton = document.createElement('button');
      editButton.textContent = '编辑';
      editButton.addEventListener('click', function(e) {
        e.stopPropagation();
        enterEditMode(rule, index);
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '删除';
      deleteButton.className = 'secondary';
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('确定要删除这条规则吗？')) {
          savedRules.splice(index, 1);
          chrome.storage.local.set({rules: savedRules}, function() {
            renderSavedRules();
          });
        }
      });
      
      ruleActions.appendChild(editButton);
      ruleActions.appendChild(deleteButton);
      
      ruleItem.appendChild(ruleInfo);
      ruleItem.appendChild(ruleActions);
      savedRulesContainer.appendChild(ruleItem);
    });
  }

  // 检查当前URL是否匹配已保存的规则
  function checkForMatchingRule() {
    try {
      const currentUrlObj = new URL(currentUrl);
      
      for (let i = 0; i < savedRules.length; i++) {
        const rule = savedRules[i];
        
        if (rule.type === 'domain' && currentUrlObj.hostname === rule.pattern) {
          currentRuleMatch = { rule, index: i };
          makeRuleFirst(i);
          return;
        }
        
        if (rule.type === 'domain-path' && 
            (currentUrlObj.hostname + currentUrlObj.pathname) === rule.pattern) {
          currentRuleMatch = { rule, index: i };
          makeRuleFirst(i);
          return;
        }
        
        if (rule.type === 'domain-path-params' && 
            (currentUrlObj.hostname + currentUrlObj.pathname) === rule.pattern) {
          
          // 检查参数是否匹配
          let allParamsMatch = true;
          
          // 如果规则中没有设置任何参数，则认为匹配成功
          if (!rule.params || rule.params.length === 0) {
            currentRuleMatch = { rule, index: i };
            makeRuleFirst(i);
            return;
          }
          
          // 只检查用户设置的参数
          for (const param of rule.params) {
            let actualValue;
            
            if (param.isHash) {
              if (param.key === 'hash') {
                actualValue = currentUrlObj.hash.substring(1);
              } else {
                const hashParams = new URLSearchParams(currentUrlObj.hash.substring(1));
                actualValue = hashParams.get(param.key);
              }
            } else {
              actualValue = currentUrlObj.searchParams.get(param.key);
            }
            
            // 如果参数值为空，则跳过此参数的匹配
            if (!param.value.trim()) {
              continue;
            }
            
            if (param.isRegex) {
              try {
                const regex = new RegExp(param.value);
                if (!regex.test(actualValue)) {
                  allParamsMatch = false;
                  break;
                }
              } catch (e) {
                allParamsMatch = false;
                break;
              }
            } else if (actualValue !== param.value) {
              allParamsMatch = false;
              break;
            }
          }
          
          if (allParamsMatch) {
            currentRuleMatch = { rule, index: i };
            makeRuleFirst(i);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Error matching URL with rules:", e);
    }
  }

  // 将匹配的规则置顶
  function makeRuleFirst(index) {
    if (index === 0) return;
    
    const rule = savedRules.splice(index, 1)[0];
    savedRules.unshift(rule);
    
    chrome.storage.local.set({rules: savedRules});
    currentRuleMatch.index = 0;
  }

  // 应用规则到当前标签页
  function applyRuleToCurrentTab(rule) {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {
        action: 'applyRule',
        rule: rule
      });
    }
  }
}); 