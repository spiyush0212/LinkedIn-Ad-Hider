(() => {
  const HIDDEN_CLASS = "__linkedin_promoted_hidden";

  let extensionEnabled = true;
  let sessionHiddenCount = 0;

  const hiddenPosts = new Set();

  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function isPromotedLabel(element) {
    if (element.tagName !== "SPAN") return false;

    return /^Promoted\b/i.test(element.textContent.trim());
  }

  function hidePostFromLabel(label) {
    if (!extensionEnabled || !isContextValid()) return;

    let post = label;

    for (let i = 0; i < 8 && post; i++) {
      post = post.parentElement;
    }

    if (!post || post.classList.contains(HIDDEN_CLASS)) {
      return;
    }

    const name =
      post
        .querySelector('a[href*="/in/"] span')
        ?.textContent
        .trim() || "Unknown";

    const promotedType = label.textContent.trim();

    post.classList.add(HIDDEN_CLASS);
    post.style.display = "none";

    hiddenPosts.add(post);
    sessionHiddenCount++;

    try {
      chrome.runtime.sendMessage({
        type: "INCREMENT_COUNT"
      });
    } catch {
      return;
    }

    // console.log(
    //   `[LinkedIn Promoted Hider] Removed: ${name} | ${promotedType} | Session: ${sessionHiddenCount}`
    // );

    // Notify popup about the new session count
    try {
      chrome.runtime.sendMessage({
        type: "SESSION_COUNT_UPDATED",
        sessionCount: sessionHiddenCount
      });
    } catch {
      // Ignore if extension context is unavailable
    }
  }

  function scan(root) {
    if (!isContextValid()) {
      observer.disconnect();
      return;
    }

    if (!(root instanceof Element)) return;

    if (isPromotedLabel(root)) {
      hidePostFromLabel(root);
    }

    root.querySelectorAll("span").forEach(span => {
      if (isPromotedLabel(span)) {
        hidePostFromLabel(span);
      }
    });
  }

  function loadEnabledState() {
    if (!isContextValid()) return;

    try {
      chrome.runtime.sendMessage(
        { type: "GET_ENABLED" },
        response => {
          if (chrome.runtime.lastError) return;

          extensionEnabled = response?.enabled !== false;
        }
      );
    } catch {
      return;
    }
  }

  document.querySelectorAll("span").forEach(span => {
    if (isPromotedLabel(span)) {
      hidePostFromLabel(span);
    }
  });

  const observer = new MutationObserver(mutations => {
    if (!isContextValid()) {
      observer.disconnect();
      return;
    }

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        scan(node);
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  loadEnabledState();

  chrome.runtime.onMessage.addListener(message => {
    if (message.type !== "SET_ENABLED") {
      return;
    }

    extensionEnabled = message.enabled;

    if (!extensionEnabled) {
      hiddenPosts.forEach(post => {
        if (post.isConnected) {
          post.style.display = "";
          post.classList.remove(HIDDEN_CLASS);
        }
      });

      hiddenPosts.clear();
    } else {
      document.querySelectorAll("span").forEach(span => {
        if (isPromotedLabel(span)) {
          hidePostFromLabel(span);
        }
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_SESSION_COUNT") {
      sendResponse({
        sessionCount: sessionHiddenCount
      });
    }

    return true;
  });

  // console.log("[LinkedIn Promoted Hider] Running");
})();