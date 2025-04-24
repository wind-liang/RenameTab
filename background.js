// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'updateTabTitle' && sender.tab) {
    // 更新标签页标题
    chrome.tabs.update(sender.tab.id, {
      title: message.title
    });
  }
}); 