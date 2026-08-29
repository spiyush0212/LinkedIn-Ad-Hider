let totalCount = 0;
let countLoaded = false;
let pendingIncrements = 0;

chrome.storage.local.get("hiddenCount", result => {
  totalCount = result.hiddenCount || 0;
  countLoaded = true;

  processPendingIncrements();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INCREMENT_COUNT") {
    if (!countLoaded) {
      pendingIncrements++;
      return;
    }

    incrementTotalCount();
    return;
  }

  if (message.type === "GET_COUNT") {
    if (!countLoaded) {
      sendResponse({
        count: 0
      });
      return true;
    }

    sendResponse({
      count: totalCount
    });

    return true;
  }

  if (message.type === "GET_ENABLED") {
    chrome.storage.local.get("enabled", result => {
      sendResponse({
        enabled: result.enabled !== false
      });
    });

    return true;
  }

  if (message.type === "SET_ENABLED") {
    chrome.storage.local.set({
      enabled: message.enabled
    });

    return;
  }
});

function processPendingIncrements() {
  while (pendingIncrements > 0) {
    pendingIncrements--;
    incrementTotalCount();
  }
}

function incrementTotalCount() {
  totalCount++;

  chrome.storage.local.set({
    hiddenCount: totalCount
  });

  chrome.runtime.sendMessage(
    {
      type: "TOTAL_COUNT_UPDATED",
      totalCount
    },
    () => {
      // Popup may not be open. Ignore the expected error.
      void chrome.runtime.lastError;
    }
  );
}