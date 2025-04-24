// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'applyRule') {
    applyRule(message.rule);
  }
});

// 在页面加载时检查并应用规则
window.addEventListener('load', function() {
  checkAndApplyRules();
});

// 应用单条规则
function applyRule(rule) {
  if (rule && rule.title) {
    document.title = rule.title;
  }
}

// 检查当前URL是否匹配保存的规则并应用
function checkAndApplyRules() {
  chrome.storage.local.get('rules', function(data) {
    if (!data.rules || !Array.isArray(data.rules) || data.rules.length === 0) {
      return;
    }

    try {
      const currentUrl = window.location.href;
      const currentUrlObj = new URL(currentUrl);
      
      // 按照存储顺序检查规则匹配
      for (const rule of data.rules) {
        let isMatch = false;
        
        if (rule.type === 'domain' && currentUrlObj.hostname === rule.pattern) {
          isMatch = true;
        }
        
        else if (rule.type === 'domain-path' && 
            (currentUrlObj.hostname + currentUrlObj.pathname) === rule.pattern) {
          isMatch = true;
        }
        
        else if (rule.type === 'domain-path-params' && 
            (currentUrlObj.hostname + currentUrlObj.pathname) === rule.pattern) {
          
          // 检查所有参数是否匹配
          let allParamsMatch = true;
          
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
          
          isMatch = allParamsMatch;
        }
        
        if (isMatch) {
          // 应用规则，修改标题
          document.title = rule.title;
          
          // 如果页面标题可能会动态变化，添加监听器确保标题保持为我们设置的
          observeTitleChanges(rule.title);
          
          break;
        }
      }
    } catch (e) {
      console.error("Error checking and applying rules:", e);
    }
  });
}

// 监听标题变化并保持自定义标题
function observeTitleChanges(customTitle) {
  // 使用MutationObserver来监控document.title的变化
  const titleObserver = new MutationObserver(function(mutations) {
    if (document.title !== customTitle) {
      document.title = customTitle;
    }
  });
  
  // 定期检查标题变化（因为某些网站可能会以其他方式修改标题）
  const titleInterval = setInterval(function() {
    if (document.title !== customTitle) {
      document.title = customTitle;
    }
  }, 1000);
  
  // 观察<title>元素的变化
  const titleElement = document.querySelector('title');
  if (titleElement) {
    titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
  }
  
  // 确保在页面卸载时清理定时器
  window.addEventListener('unload', function() {
    clearInterval(titleInterval);
    titleObserver.disconnect();
  });
} 