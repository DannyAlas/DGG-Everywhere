chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ["js/jquery/jquery.min.js", "src/bg/content.js"]
    });
  });