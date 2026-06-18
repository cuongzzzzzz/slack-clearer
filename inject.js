// Injected script running in the MAIN world of Slack tab
(() => {
  if (window.__slackDeleterInitialized) {
    console.log("Slack Deleter: Already initialized on this tab. Refreshing status...");
    window.postMessage({
      source: "slack-deleter-inject",
      action: "STATUS_UPDATE",
      data: window.__slackDeleterState || {
        status: "idle",
        progress: 0,
        total: 0,
        currentChannelName: "",
        logs: []
      }
    }, "*");
    return;
  }
  window.__slackDeleterInitialized = true;

  let slackInfo = {
    token: null,
    userId: null,
    teamId: null,
    versionTs: null,
    teamName: null,
    userName: null
  };

  // State of the deletion process
  let deleterState = {
    status: "idle", // "idle", "fetching", "deleting", "paused", "stopped"
    progress: 0,
    total: 0,
    currentChannelName: "",
    logs: []
  };

  window.__slackDeleterState = deleterState;

  // Control flags for execution loop
  let isPaused = false;
  let isStopped = false;

  // Add log helper
  function addLog(text) {
    const time = new Date().toLocaleTimeString();
    deleterState.logs.unshift(`[${time}] ${text}`);
    if (deleterState.logs.length > 200) {
      deleterState.logs.pop(); // Limit logs in memory
    }
    sendStatusUpdate();
  }

  function sendStatusUpdate() {
    window.__slackDeleterState = {
      status: deleterState.status,
      progress: deleterState.progress,
      total: deleterState.total,
      currentChannelName: deleterState.currentChannelName,
      logs: deleterState.logs
    };
    window.postMessage({
      source: "slack-deleter-inject",
      action: "STATUS_UPDATE",
      data: window.__slackDeleterState
    }, "*");
  }

  // --- Boot data extraction ---
  function extractBootData() {
    try {
      const TS = window.TS;
      const bootData = TS?.boot_data || window.boot_data;
      const localConfig = window.localConfig;

      slackInfo.token = bootData?.api_token || localConfig?.api_token || slackInfo.token;
      slackInfo.userId = bootData?.user_id || localConfig?.user_id || slackInfo.userId;
      slackInfo.teamId = bootData?.team_id || localConfig?.team_id || slackInfo.teamId;
      slackInfo.versionTs = bootData?.version_ts || slackInfo.versionTs;
      slackInfo.teamName = bootData?.team_name || slackInfo.teamName;
      slackInfo.userName = bootData?.user_name || slackInfo.userName;

      // 1. Try to parse localConfig_v2 from localStorage
      try {
        const localConfigStr = localStorage.getItem("localConfig_v2");
        if (localConfigStr) {
          const config = JSON.parse(localConfigStr);
          if (config.teams) {
            const teamIds = Object.keys(config.teams);
            if (teamIds.length > 0) {
              // Try to find the team ID matching our current subdomain or just take the first one
              let activeTeamId = teamIds[0];
              const hostname = window.location.hostname;
              for (const tid of teamIds) {
                if (config.teams[tid].domain && hostname.includes(config.teams[tid].domain)) {
                  activeTeamId = tid;
                  break;
                }
              }
              const team = config.teams[activeTeamId];
              slackInfo.token = team.token || slackInfo.token;
              slackInfo.userId = team.userId || team.user_id || slackInfo.userId;
              slackInfo.teamId = team.id || activeTeamId || slackInfo.teamId;
              slackInfo.teamName = team.name || slackInfo.teamName;
              slackInfo.userName = team.userName || slackInfo.userName;
            }
          }
        }
      } catch (err) {
        console.warn("Slack Deleter: error parsing localConfig_v2:", err);
      }

      // 2. Regex fallback search over all localStorage keys for xoxc- token
      if (!slackInfo.token) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (val && typeof val === "string") {
              const match = val.match(/(xoxc-[a-zA-Z0-9-]+)/);
              if (match) {
                slackInfo.token = match[1];
                console.log("Slack Deleter: Found token in localStorage key:", key);
                break;
              }
            }
          }
        } catch (err) {
          console.warn("Slack Deleter: error scanning localStorage for token:", err);
        }
      }

      // 3. Fallback to extract teamId (T...) from URL or document cookies if not set
      if (!slackInfo.teamId) {
        const urlMatch = window.location.pathname.match(/\/client\/(T[A-Z0-9]+)\//);
        if (urlMatch) {
          slackInfo.teamId = urlMatch[1];
        }
      }

      if (slackInfo.token) {
        console.log("Slack Deleter: Successfully retrieved token:", slackInfo.token.substring(0, 10) + "...");
        initializeSession(slackInfo.token);
      }
    } catch (e) {
      console.warn("Slack Deleter: error in extractBootData:", e);
    }
  }

  let isInitializing = false;
  async function initializeSession(token) {
    if (!token || token === window.__slackCapturedToken || isInitializing) return;
    isInitializing = true;
    window.__slackCapturedToken = token;
    slackInfo.token = token;

    try {
      console.log("Slack Deleter: Initializing session with token:", token.substring(0, 10) + "...");
      const authData = await callSlackApi("/api/auth.test");
      if (authData.ok) {
        slackInfo.userId = authData.user_id;
        slackInfo.userName = authData.user;
        slackInfo.teamId = authData.team_id;
        slackInfo.teamName = authData.team;
        
        console.log(`Slack Deleter: Connected successfully. Workspace: ${authData.team}, User: ${authData.user}`);
        addLog(`Kết nối thành công! Workspace: ${authData.team}, Người dùng: ${authData.user}`);
        
        // Notify popup via content script
        window.postMessage({
          source: "slack-deleter-inject",
          action: "CONVERSATIONS_LOADED",
          data: {
            conversations: window.__slackConversations || [],
            currentUser: { id: slackInfo.userId, name: slackInfo.userName },
            currentWorkspace: { id: slackInfo.teamId, name: slackInfo.teamName }
          }
        }, "*");
      } else {
        console.warn("Slack Deleter: auth.test failed:", authData.error);
        addLog(`Cảnh báo xác thực: ${authData.error}. Sẽ thử tải danh sách trực tiếp.`);
        
        // Even if auth.test fails, notify with what we have
        window.postMessage({
          source: "slack-deleter-inject",
          action: "CONVERSATIONS_LOADED",
          data: {
            conversations: window.__slackConversations || [],
            currentUser: { id: slackInfo.userId, name: slackInfo.userName },
            currentWorkspace: { id: slackInfo.teamId, name: slackInfo.teamName }
          }
        }, "*");
      }
    } catch (err) {
      console.error("Slack Deleter: error in initializeSession:", err);
      addLog(`Lỗi khởi tạo phiên: ${err.message}`);
    } finally {
      isInitializing = false;
    }
  }

  // --- Hook fetch/XHR to grab token/version dynamically ---
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const url = args[0]?.toString() || "";
      if (url.includes("slack.com/api/") || url.startsWith("/api/")) {
        const options = args[1] || {};
        let matchedToken = null;

        // 1. Check URL query parameters
        try {
          const urlObj = new URL(url, window.location.origin);
          matchedToken = urlObj.searchParams.get("token");
        } catch (err) {}

        // 2. Check request body
        if (!matchedToken && options.body) {
          if (options.body instanceof FormData) {
            matchedToken = options.body.get("token");
          } else if (options.body instanceof URLSearchParams) {
            matchedToken = options.body.get("token");
          } else if (typeof options.body === "string") {
            try {
              if (options.body.startsWith("{")) {
                const json = JSON.parse(options.body);
                matchedToken = json.token || json.api_token;
              } else {
                matchedToken = new URLSearchParams(options.body).get("token");
              }
            } catch (err) {}
          }
        }

        if (matchedToken && matchedToken.startsWith("xox")) {
          // Grab slack route and version headers if present
          if (options.headers) {
            slackInfo.versionTs = options.headers["x-slack-version-ts"] || options.headers["X-Slack-Version-Ts"] || slackInfo.versionTs;
            slackInfo.teamId = options.headers["slack-route"] || options.headers["Slack-Route"] || slackInfo.teamId;
          }
          
          if (slackInfo.token !== matchedToken) {
            console.log("Slack Deleter: Intercepted token from fetch:", matchedToken.substring(0, 10) + "...");
            initializeSession(matchedToken);
          }
        }
      }
    } catch (e) {
      console.warn("Slack Deleter: error in fetch hook interceptor:", e);
    }
    return originalFetch.apply(this, args);
  };

  // Run extraction initially and periodically
  extractBootData();
  setInterval(extractBootData, 2000);

  // --- API CALL HELPERS ---

  // Call any slack API with correct token and headers
  async function callSlackApi(endpoint, params = {}) {
    if (!slackInfo.token) {
      throw new Error("Slack session token not found. Please refresh or make sure you are logged in.");
    }

    const url = new URL(endpoint, window.location.origin);
    // Standard query routing params
    url.searchParams.set("slack_route", slackInfo.teamId || "");
    url.searchParams.set("_x_version_ts", slackInfo.versionTs || "");
    url.searchParams.set("_x_frontend_build_type", "current");
    url.searchParams.set("_x_gantry", "true");

    const bodyParams = new URLSearchParams({
      token: slackInfo.token,
      ...params
    });

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (slackInfo.versionTs) headers["x-slack-version-ts"] = slackInfo.versionTs;
    if (slackInfo.teamId) headers["slack-route"] = slackInfo.teamId;

    let retries = 0;
    while (retries < 3) {
      const response = await originalFetch(url.toString(), {
        method: "POST",
        headers: headers,
        body: bodyParams,
        credentials: "include"
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "5", 10);
        addLog(`Rate limited (429). Đang chờ ${retryAfter} giây trước khi thử lại...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
        continue;
      }

      const json = await response.json();
      return json;
    }
    throw new Error("Đã vượt quá số lần thử lại sau khi bị rate limit (429).");
  }

  // Get user details map
  async function fetchUsersMap() {
    const usersMap = {};
    try {
      let cursor = "";
      do {
        const data = await callSlackApi("/api/users.list", cursor ? { cursor } : {});
        if (!data.ok) {
          console.warn("Failed to fetch user list:", data.error);
          break;
        }
        for (const member of data.members || []) {
          usersMap[member.id] = member.real_name || member.profile?.real_name || member.name;
        }
        cursor = data.response_metadata?.next_cursor || "";
      } while (cursor);
    } catch (e) {
      console.error("Error fetching users map:", e);
    }
    return usersMap;
  }

  // Load conversations (channels + DMs)
  async function loadConversations() {
    try {
      deleterState.status = "fetching";
      sendStatusUpdate();

      extractBootData(); // Refresh boot data before starting

      if (!slackInfo.token) {
        throw new Error("Không tìm thấy token phiên hoạt động Slack. Vui lòng tải lại trang hoặc đăng nhập lại.");
      }

      addLog("Đang tải danh sách người dùng...");
      const usersMap = await fetchUsersMap();

      addLog("Đang tải danh sách cuộc hội thoại...");
      let conversations = [];
      let cursor = "";
      do {
        const data = await callSlackApi("/api/users.conversations", {
          types: "public_channel,private_channel,mpim,im",
          limit: 1000,
          exclude_archived: "true",
          ...(cursor ? { cursor } : {})
        });

        if (!data.ok) {
          throw new Error(`Lỗi tải hội thoại: ${data.error}`);
        }

        for (const channel of data.channels || []) {
          let name = channel.name || "";
          
          if (channel.is_im) {
            // Direct Message: map user ID to name
            const userRealName = usersMap[channel.user];
            name = userRealName ? `Direct Message: ${userRealName}` : `Direct Message (User ID: ${channel.user})`;
          } else if (channel.is_mpim) {
            name = `Group DM: ${channel.name || channel.purpose?.value || channel.id}`;
          } else if (channel.is_private) {
            name = `🔒 ${name}`;
          } else {
            name = `# ${name}`;
          }

          conversations.push({
            id: channel.id,
            name: name,
            is_channel: !!channel.is_channel,
            is_im: !!channel.is_im,
            is_mpim: !!channel.is_mpim,
            is_private: !!channel.is_private,
            num_members: channel.num_members || 0
          });
        }

        cursor = data.response_metadata?.next_cursor || "";
      } while (cursor);

      // Sort: channels first, then DMs, then alphabetically
      conversations.sort((a, b) => {
        if (a.is_channel && !b.is_channel) return -1;
        if (!a.is_channel && b.is_channel) return 1;
        return a.name.localeCompare(b.name);
      });

      addLog(`Đã tải thành công ${conversations.length} cuộc hội thoại.`);
      deleterState.status = "idle";
      sendStatusUpdate();

      window.postMessage({
        source: "slack-deleter-inject",
        action: "CONVERSATIONS_LOADED",
        data: {
          conversations,
          currentUser: { id: slackInfo.userId, name: slackInfo.userName },
          currentWorkspace: { id: slackInfo.teamId, name: slackInfo.teamName }
        }
      }, "*");
    } catch (err) {
      addLog(`Lỗi: ${err.message}`);
      deleterState.status = "idle";
      sendStatusUpdate();
      window.postMessage({
        source: "slack-deleter-inject",
        action: "ERROR",
        error: err.message
      }, "*");
    }
  }

  // Delete all replies inside a thread
  async function deleteThreadReplies(channelId, threadTs, targetUserId, delayMs) {
    try {
      let cursor = "";
      do {
        if (isStopped) return;
        const data = await callSlackApi("/api/conversations.replies", {
          channel: channelId,
          ts: threadTs,
          limit: 100,
          ...(cursor ? { cursor } : {})
        });

        if (!data.ok) {
          addLog(`Không thể tải replies cho thread ${threadTs}: ${data.error}`);
          break;
        }

        // Loop replies (index 0 is the parent message, replies start from index 1)
        const messages = data.messages || [];
        for (let i = 1; i < messages.length; i++) {
          if (isStopped) return;
          while (isPaused) {
            await new Promise(r => setTimeout(r, 500));
          }

          const msg = messages[i];
          if (!targetUserId || msg.user === targetUserId) {
            addLog(`Đang xóa reply ts=${msg.ts} trong thread...`);
            const delRes = await callSlackApi("/api/chat.delete", {
              channel: channelId,
              ts: msg.ts
            });
            if (delRes.ok) {
              deleterState.progress++;
              sendStatusUpdate();
            } else {
              addLog(`Lỗi xóa reply ts=${msg.ts}: ${delRes.error}`);
            }
            await new Promise(r => setTimeout(r, delayMs));
          }
        }

        cursor = data.response_metadata?.next_cursor || "";
      } while (cursor);
    } catch (e) {
      addLog(`Lỗi khi xử lý thread: ${e.message}`);
    }
  }

  // Main deletion runner
  async function runDeletion(config) {
    const { channelIds, targetUserId, delayMs, deleteThreads } = config;
    
    deleterState.status = "deleting";
    deleterState.progress = 0;
    deleterState.total = 0;
    sendStatusUpdate();

    isPaused = false;
    isStopped = false;

    addLog(`Bắt đầu tiến trình xóa tin nhắn cho ${channelIds.length} hội thoại...`);
    if (targetUserId) {
      addLog(`Lọc theo User ID: ${targetUserId}`);
    } else {
      addLog("Lọc: Xóa tất cả tin nhắn (yêu cầu quyền Admin)");
    }

    try {
      for (let c = 0; c < channelIds.length; c++) {
        if (isStopped) break;

        const channelId = channelIds[c];
        deleterState.currentChannelName = channelId; // Temporary fallback
        sendStatusUpdate();

        addLog(`Đang kiểm tra hội thoại: ${channelId}...`);

        let cursor = "";
        let hasMore = true;

        while (hasMore && !isStopped) {
          while (isPaused) {
            await new Promise(r => setTimeout(r, 500));
          }

          const data = await callSlackApi("/api/conversations.history", {
            channel: channelId,
            limit: 100,
            ...(cursor ? { cursor } : {})
          });

          if (!data.ok) {
            addLog(`Lỗi tải lịch sử kênh ${channelId}: ${data.error}. Bỏ qua kênh này.`);
            break;
          }

          const messages = data.messages || [];
          if (messages.length === 0) {
            break;
          }

          for (let i = 0; i < messages.length; i++) {
            if (isStopped) break;
            while (isPaused) {
              await new Promise(r => setTimeout(r, 500));
            }

            const msg = messages[i];

            // 1. Check thread replies if deleteThreads is enabled (regardless of who started the thread)
            if (deleteThreads && msg.reply_count && msg.reply_count > 0) {
              addLog(`Đang kiểm tra thread của tin nhắn ts=${msg.ts} (có ${msg.reply_count} replies)...`);
              await deleteThreadReplies(channelId, msg.ts, targetUserId, delayMs);
            }

            // 2. Delete the parent/root message itself if it matches target user ID
            const matchesUser = !targetUserId || (msg.user && msg.user === targetUserId);
            const isSystem = !msg.user || msg.subtype;

            if (matchesUser && !isSystem) {
              if (isStopped) break;
              addLog(`Đang xóa tin nhắn chính ts=${msg.ts}...`);
              const delRes = await callSlackApi("/api/chat.delete", {
                channel: channelId,
                ts: msg.ts
              });

              if (delRes.ok) {
                deleterState.progress++;
                sendStatusUpdate();
              } else {
                addLog(`Lỗi xóa tin nhắn ts=${msg.ts}: ${delRes.error}`);
              }

              await new Promise(r => setTimeout(r, delayMs));
            }
          }

          cursor = data.response_metadata?.next_cursor || "";
          hasMore = !!cursor && data.has_more !== false;
        }
      }

      if (isStopped) {
        deleterState.status = "stopped";
        addLog("Đã DỪNG tiến trình xóa tin nhắn.");
      } else {
        deleterState.status = "idle";
        addLog(`Hoàn thành! Đã xóa thành công tổng cộng ${deleterState.progress} tin nhắn.`);
      }
    } catch (err) {
      addLog(`Lỗi nghiêm trọng trong tiến trình xóa: ${err.message}`);
      deleterState.status = "idle";
    }

    sendStatusUpdate();
  }

  // --- Message Listener from Content Script ---
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "slack-deleter-content") {
      return;
    }

    const { action, config } = event.data;

    switch (action) {
      case "GET_STATUS":
        sendStatusUpdate();
        break;
      case "FETCH_CONVERSATIONS":
        loadConversations();
        break;
      case "START_DELETION":
        runDeletion(config);
        break;
      case "PAUSE_DELETION":
        isPaused = true;
        deleterState.status = "paused";
        addLog("Tạm dừng tiến trình xóa...");
        sendStatusUpdate();
        break;
      case "RESUME_DELETION":
        isPaused = false;
        deleterState.status = "deleting";
        addLog("Tiếp tục tiến trình xóa...");
        sendStatusUpdate();
        break;
      case "STOP_DELETION":
        isStopped = true;
        addLog("Đang dừng tiến trình xóa...");
        break;
      default:
        break;
    }
  });

  console.log("Slack Deleter: Injected script initialized successfully.");
})();
