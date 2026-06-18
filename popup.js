// Slack Message Deleter - Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  // --- UI Elements ---
  const connBadge = document.getElementById("conn-badge");
  const connStatusText = document.getElementById("conn-status");
  
  const panelNoSlack = document.getElementById("panel-no-slack");
  const panelSetup = document.getElementById("panel-setup");
  const panelProgress = document.getElementById("panel-progress");
  
  const subpanelPreLoad = document.getElementById("subpanel-pre-load");
  const subpanelLoaded = document.getElementById("subpanel-loaded");
  
  const workspaceNameText = document.getElementById("workspace-name");
  const userNameText = document.getElementById("user-name");
  
  const searchInput = document.getElementById("search-conversations");
  const listContainer = document.getElementById("conversations-list");
  
  const inputTargetUserId = document.getElementById("input-target-user-id");
  const myUseridHint = document.getElementById("my-userid-hint");
  const chkDeleteThreads = document.getElementById("chk-delete-threads");
  const rangeDelay = document.getElementById("range-delay");
  const delayValText = document.getElementById("delay-val");
  
  const progressStatusText = document.getElementById("progress-status-text");
  const progressActiveChannel = document.getElementById("progress-active-channel");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressCountText = document.getElementById("progress-count");
  const terminalBody = document.getElementById("terminal-body");
  
  // --- Buttons ---
  const btnOpenSlack = document.getElementById("btn-open-slack");
  const btnFetchConvs = document.getElementById("btn-fetch-conversations");
  const btnStartDeletion = document.getElementById("btn-start-deletion");
  const btnPause = document.getElementById("btn-pause");
  const btnResume = document.getElementById("btn-resume");
  const btnStop = document.getElementById("btn-stop");
  const btnClearLogs = document.getElementById("btn-clear-logs");
  
  const btnSelectAll = document.getElementById("btn-select-all");
  const btnSelectChannels = document.getElementById("btn-select-channels");
  const btnSelectDms = document.getElementById("btn-select-dms");
  const btnDeselectAll = document.getElementById("btn-deselect-all");

  // --- State Variables ---
  let activeTabId = null;
  let conversations = [];
  let selectedChannelIds = new Set();
  let currentUserId = "";

  // --- Check Slack Tab & Initialize ---
  async function init() {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        showNoSlackPanel();
        return;
      }
      const activeTab = tabs[0];
      
      if (!activeTab || !activeTab.url || !activeTab.url.includes(".slack.com")) {
        showNoSlackPanel();
        return;
      }

      activeTabId = activeTab.id;
      setConnectionState(true, "Slack Web");

      // Inject inject.js via scripting API to bypass CSP in main world
      console.log("Slack Deleter: Injecting main world script...");
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ["inject.js"],
        world: "MAIN"
      });
      
      // Load cached info & state
      const data = await chrome.storage.local.get(["slack_info", "slack_deleter_state"]);
      
      if (data.slack_info && data.slack_info.currentUser?.id) {
        updateSlackInfo(data.slack_info);
      } else {
        updateSlackInfo(null);
        // Fetch status to prompt inject script to send stats if already running
        sendMessageToActiveTab({ action: "GET_STATUS" });
      }

      if (data.slack_deleter_state) {
        updateDeleterUI(data.slack_deleter_state);
      }
    } catch (err) {
      console.error("Error in init:", err);
      setConnectionState(false, "Lỗi: " + err.message);
    }
  }

  // Helper: Send Message to Content Script
  function sendMessageToActiveTab(msg) {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, { source: "slack-deleter-popup", ...msg }, (res) => {
      // Keep silence on response errors (e.g. if script not loaded yet)
      if (chrome.runtime.lastError) {
        // Quietly fail
      }
    });
  }

  function showNoSlackPanel() {
    setConnectionState(false, "Không kết nối");
    panelNoSlack.classList.remove("hidden");
    panelSetup.classList.add("hidden");
    panelProgress.classList.add("hidden");
  }

  function setConnectionState(isConnected, text) {
    connStatusText.innerText = text;
    if (isConnected) {
      connBadge.className = "connection-badge connected";
    } else {
      connBadge.className = "connection-badge disconnected";
    }
  }

  // --- Update Slack Info (Conversations, Workspace, Current User) ---
  function updateSlackInfo(info) {
    const descText = document.querySelector(".description-text");

    if (!info || !info.currentUser?.id) {
      // Prompt user to click a channel
      workspaceNameText.innerText = "-";
      userNameText.innerText = "Đang chờ bắt Token...";
      setConnectionState(false, "Chưa kết nối");
      
      if (descText) {
        descText.innerHTML = `<span style="color: #a78bfa; font-weight: 600;">👉 Cách bắt đầu:</span> Vui lòng <strong>click chuột vào bất kỳ kênh chat hoặc cuộc hội thoại nào</strong> trên giao diện Slack. Extension sẽ tự động bắt Token phiên của bạn từ các request và mở khóa tính năng.`;
      }
      btnFetchConvs.disabled = true;
      return;
    }

    // Reset description text if it was modified
    if (descText) {
      descText.innerText = "Bắt đầu bằng cách lấy danh sách toàn bộ các kênh và hộp thoại chat trong Workspace của bạn.";
    }

    setConnectionState(true, "Slack Web");
    btnFetchConvs.disabled = false;

    if (info.currentWorkspace?.name) {
      workspaceNameText.innerText = info.currentWorkspace.name;
    } else if (info.currentWorkspace?.id) {
      workspaceNameText.innerText = info.currentWorkspace.id;
    }

    if (info.currentUser?.name) {
      userNameText.innerText = `${info.currentUser.name} (${info.currentUser.id || "-"})`;
    } else if (info.currentUser?.id) {
      userNameText.innerText = info.currentUser.id;
    }

    if (info.currentUser?.id) {
      currentUserId = info.currentUser.id;
      myUseridHint.innerText = `ID của bạn: ${currentUserId}`;
      if (!inputTargetUserId.value) {
        inputTargetUserId.placeholder = currentUserId;
      }
    }

    if (info.conversations && info.conversations.length > 0) {
      conversations = info.conversations;
      subpanelPreLoad.classList.add("hidden");
      subpanelLoaded.classList.remove("hidden");
      renderConversations();
    }
  }

  // --- Render Conversations in Scrollable List ---
  function renderConversations() {
    const filterText = searchInput.value.toLowerCase();
    listContainer.innerHTML = "";

    const filtered = conversations.filter(c => c.name.toLowerCase().includes(filterText));

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Không tìm thấy hội thoại nào</div>`;
      return;
    }

    filtered.forEach(c => {
      const isSelected = selectedChannelIds.has(c.id);
      
      const item = document.createElement("div");
      item.className = `conversation-item ${isSelected ? "selected" : ""}`;
      item.dataset.id = c.id;

      let badgeType = "Kênh";
      if (c.is_im) badgeType = "DM";
      else if (c.is_mpim) badgeType = "Group DM";
      else if (c.is_private) badgeType = "Kênh Khóa";

      item.innerHTML = `
        <div class="checkbox-custom"></div>
        <div class="conv-details">
          <span class="conv-name">${c.name}</span>
          <span class="conv-badge">${badgeType}</span>
        </div>
      `;

      item.addEventListener("click", () => {
        if (selectedChannelIds.has(c.id)) {
          selectedChannelIds.delete(c.id);
          item.classList.remove("selected");
        } else {
          selectedChannelIds.add(c.id);
          item.classList.add("selected");
        }
      });

      listContainer.appendChild(item);
    });
  }

  // --- Update Deletion Progress UI ---
  function updateDeleterUI(state) {
    if (!state) return;

    if (state.status === "deleting" || state.status === "paused" || state.status === "stopped") {
      panelSetup.classList.add("hidden");
      panelProgress.classList.remove("hidden");

      // Progress bar & texts
      progressActiveChannel.innerText = `Kênh ID: ${state.currentChannelName || "-"}`;
      progressCountText.innerText = `Đã xóa: ${state.progress || 0} tin nhắn`;
      
      // Calculate a glowing running progress (for display we use width, wait, if total is unknown, just show a loading width or running animation)
      if (state.status === "deleting") {
        progressStatusText.innerText = "Đang tiến hành xóa...";
        progressBarFill.style.width = "100%"; // Gradient animation running
        btnPause.classList.remove("hidden");
        btnResume.classList.add("hidden");
      } else if (state.status === "paused") {
        progressStatusText.innerText = "Đang Tạm Dừng";
        progressBarFill.style.width = "100%";
        btnPause.classList.add("hidden");
        btnResume.classList.remove("hidden");
      } else if (state.status === "stopped") {
        progressStatusText.innerText = "Đã dừng tiến trình!";
        progressBarFill.style.width = "0%";
        btnPause.classList.add("hidden");
        btnResume.classList.add("hidden");
      }

      // Update logs
      renderLogs(state.logs || []);
    } else {
      panelSetup.classList.remove("hidden");
      panelProgress.classList.add("hidden");
    }
  }

  function renderLogs(logs) {
    terminalBody.innerHTML = "";
    logs.forEach(log => {
      const line = document.createElement("div");
      line.className = "terminal-line";
      line.innerText = log;
      terminalBody.appendChild(line);
    });
  }

  // --- Event Listeners for Storage Updates ---
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.slack_info) {
      const info = changes.slack_info.newValue;
      updateSlackInfo(info);
      if (info && info.conversations && info.conversations.length > 0) {
        btnFetchConvs.disabled = false;
        btnFetchConvs.innerText = "Tải Danh Sách Hội Thoại";
      }
    }
    
    if (changes.slack_deleter_state) {
      const state = changes.slack_deleter_state.newValue;
      updateDeleterUI(state);
      if (state && state.status === "idle") {
        btnFetchConvs.disabled = false;
        btnFetchConvs.innerText = "Tải Danh Sách Hội Thoại";
      }
    }

    if (changes.slack_deleter_error) {
      const err = changes.slack_deleter_error.newValue;
      if (err) {
        alert("Lỗi Slack API: " + err.message);
        btnFetchConvs.disabled = false;
        btnFetchConvs.innerText = "Tải Danh Sách Hội Thoại";
        // Clear error in storage so it won't fire alert again
        chrome.storage.local.remove("slack_deleter_error");
      }
    }
  });

  // --- UI Control Events ---

  // Open Slack Web Button
  btnOpenSlack.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://app.slack.com/client/" });
  });

  // Fetch Conversations Button
  btnFetchConvs.addEventListener("click", () => {
    btnFetchConvs.disabled = true;
    btnFetchConvs.innerText = "Đang tải danh sách...";
    sendMessageToActiveTab({ action: "FETCH_CONVERSATIONS" });
  });

  // Search filter
  searchInput.addEventListener("input", renderConversations);

  // Bulk Selection buttons
  btnSelectAll.addEventListener("click", () => {
    conversations.forEach(c => selectedChannelIds.add(c.id));
    renderConversations();
  });

  btnSelectChannels.addEventListener("click", () => {
    conversations.forEach(c => {
      if (c.is_channel) selectedChannelIds.add(c.id);
    });
    renderConversations();
  });

  btnSelectDms.addEventListener("click", () => {
    conversations.forEach(c => {
      if (c.is_im || c.is_mpim) selectedChannelIds.add(c.id);
    });
    renderConversations();
  });

  btnDeselectAll.addEventListener("click", () => {
    selectedChannelIds.clear();
    renderConversations();
  });

  // Range Slider delay display
  rangeDelay.addEventListener("input", (e) => {
    delayValText.innerText = `${e.target.value}ms`;
  });

  // Start Deletion
  btnStartDeletion.addEventListener("click", () => {
    if (selectedChannelIds.size === 0) {
      alert("Vui lòng chọn ít nhất một cuộc hội thoại để xóa tin nhắn.");
      return;
    }

    const confirmDel = confirm(`CẢNH BÁO: Bạn đã chọn ${selectedChannelIds.size} cuộc hội thoại. Tiến trình này sẽ xóa vĩnh viễn các tin nhắn của bạn. Bạn có chắc chắn muốn bắt đầu?`);
    if (!confirmDel) return;

    const targetUserId = inputTargetUserId.value.trim() || currentUserId;
    const delayMs = parseInt(rangeDelay.value, 10);
    const deleteThreads = chkDeleteThreads.checked;

    sendMessageToActiveTab({
      action: "START_DELETION",
      config: {
        channelIds: Array.from(selectedChannelIds),
        targetUserId,
        delayMs,
        deleteThreads
      }
    });
  });

  // Progress Controls
  btnPause.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "PAUSE_DELETION" });
  });

  btnResume.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "RESUME_DELETION" });
  });

  btnStop.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "STOP_DELETION" });
  });

  btnClearLogs.addEventListener("click", async () => {
    const data = await chrome.storage.local.get("slack_deleter_state");
    if (data.slack_deleter_state) {
      data.slack_deleter_state.logs = [];
      await chrome.storage.local.set({ slack_deleter_state: data.slack_deleter_state });
      renderLogs([]);
    }
  });

  // Run initial state loading
  init();
});
