chrome.commands.onCommand.addListener((command) => {
  if (command === "add-reviewers") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        chrome.tabs.sendMessage(activeTab.id, { action: "addReviewers" });
      }
    });
  }
});
