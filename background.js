chrome.runtime.onInstalled.addListener(async (details) => {
  // Open options page on first install
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }

  // Get platform using Chrome's API
  const platformInfo = await chrome.runtime.getPlatformInfo();
  const isMac = platformInfo.os === "mac";
  const shortcutText = isMac ? "⌘⇧L" : "Alt+Shift+L";

  // Create context menu items with shortcut hints
  chrome.contextMenus.create({
    id: "search-license",
    title: `Search License (${shortcutText})`,
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "open-options",
    title: "License Management",
    contexts: ["all"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-options") {
    chrome.runtime.openOptionsPage();
  } else if (info.menuItemId === "search-license") {
    // Open popup directly in the current window
    chrome.windows.getCurrent(async (window) => {
      await chrome.action.openPopup({
        windowId: window.id,
      });
    });
  }
});
