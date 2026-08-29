function loadSessionCount() {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    tabs => {
      const tabId = tabs[0]?.id;

      if (!tabId) {
        setSessionCount(0);
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        {
          type: "GET_SESSION_COUNT"
        },
        response => {
          if (chrome.runtime.lastError) {
            setSessionCount(0);
            return;
          }

          setSessionCount(response?.sessionCount ?? 0);
        }
      );
    }
  );
}

function loadTotalCount() {
  chrome.runtime.sendMessage(
    {
      type: "GET_COUNT"
    },
    response => {
      if (chrome.runtime.lastError) {
        setTotalCount(0);
        return;
      }

      setTotalCount(response?.count ?? 0);
    }
  );
}

function loadEnabledState() {
  chrome.runtime.sendMessage(
    {
      type: "GET_ENABLED"
    },
    response => {
      if (chrome.runtime.lastError) {
        return;
      }

      const enabled = response?.enabled !== false;

      document.getElementById("enabled").checked = enabled;

      updateStatus(enabled);
    }
  );
}

function setSessionCount(count) {
  document.getElementById("sessionCount").textContent = count;
}

function setTotalCount(count) {
  document.getElementById("totalCount").textContent = count;
}

function updateStatus(enabled) {
  document.getElementById("status").textContent =
    enabled ? "Enabled" : "Disabled";
}

loadSessionCount();
loadTotalCount();
loadEnabledState();

document.getElementById("enabled").addEventListener("change", event => {
  const enabled = event.target.checked;

  chrome.runtime.sendMessage({
    type: "SET_ENABLED",
    enabled
  });

  updateStatus(enabled);

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    tabs => {
      const tabId = tabs[0]?.id;

      if (!tabId) {
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        {
          type: "SET_ENABLED",
          enabled
        },
        () => {
          // Ignore tabs where the content script isn't available.
          void chrome.runtime.lastError;
        }
      );
    }
  );
});

document.getElementById("feedback").addEventListener("click", () => {
  window.open(
    "https://forms.gle/TMMtskEihJzAg8nU7",
    "_blank"
  );
});

const manifest = chrome.runtime.getManifest();

document.getElementById("version").textContent =
  `v${manifest.version}`;

// Live session counter updates
chrome.runtime.onMessage.addListener(message => {
  if (message.type === "SESSION_COUNT_UPDATED") {
    setSessionCount(message.sessionCount);
  }

  if (message.type === "TOTAL_COUNT_UPDATED") {
    setTotalCount(message.totalCount);
  }
});