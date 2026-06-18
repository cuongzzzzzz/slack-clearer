// Content script for Slack Message Deleter (Isolated World Bridge)

// 2. Listen to messages from popup.js and forward to inject.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source === "slack-deleter-popup") {
    // Forward message to main world (inject.js)
    window.postMessage({
      source: "slack-deleter-content",
      action: message.action,
      config: message.config
    }, "*");
    
    // Send immediate response acknowledging receipt
    sendResponse({ ok: true });
  }
  return true;
});

// 3. Listen to messages from inject.js and update chrome.storage.local
window.addEventListener("message", (event) => {
  // Only accept messages from the same window and from inject.js
  if (event.source !== window || !event.data || event.data.source !== "slack-deleter-inject") {
    return;
  }

  const { action, data, error } = event.data;

  if (action === "CONVERSATIONS_LOADED") {
    chrome.storage.local.set({
      slack_info: {
        currentUser: data.currentUser,
        currentWorkspace: data.currentWorkspace,
        conversations: data.conversations,
        loadedAt: Date.now()
      }
    });
  } else if (action === "STATUS_UPDATE") {
    chrome.storage.local.set({
      slack_deleter_state: {
        status: data.status,
        progress: data.progress,
        total: data.total,
        currentChannelName: data.currentChannelName,
        logs: data.logs,
        updatedAt: Date.now()
      }
    });
  } else if (action === "ERROR") {
    chrome.storage.local.set({
      slack_deleter_error: {
        message: error,
        timestamp: Date.now()
      }
    });
  }
});
