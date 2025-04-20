// 保存原始标题
let originalTitle = document.title;

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'changeTitle') {
    document.title = message.title;
    sendResponse({ success: true });
  }
  return true; // 指示我们将异步发送响应
});

// 设置标题观察器
function setupTitleObserver() {
  const titleElement = document.querySelector('title');
  
  if (!titleElement) {
    // 如果页面没有title元素，创建一个
    const newTitle = document.createElement('title');
    newTitle.textContent = document.title || window.location.href;
    document.head.appendChild(newTitle);
    
    // 递归调用以设置观察器
    setTimeout(setupTitleObserver, 0);
    return;
  }
  
  // 创建MutationObserver来监听标题变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // 获取当前标题
      const currentTitle = document.title;
      
      // 通知后台脚本标题发生了变化
      chrome.runtime.sendMessage({
        action: 'titleChanged',
        originalTitle: currentTitle,
        url: window.location.href
      });
    });
  });
  
  // 配置和启动观察器
  observer.observe(
    titleElement,
    { subtree: true, characterData: true, childList: true }
  );
}

// 启动标题观察器
setupTitleObserver();

// 通知后台脚本内容脚本已准备就绪
chrome.runtime.sendMessage({
  action: 'contentScriptReady',
  url: window.location.href
}); 