chrome.runtime.onInstalled.addListener((details) => {
  // Open options page on first install
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }

  // Create context menu items
  chrome.contextMenus.create({
    id: "search-license",
    title: "Search License",
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
    // Open extension popup programmatically
    chrome.action.openPopup((error) => {
      if (error) console.error("Failed to open popup:", error);
    });
  }
});
