chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    currentUrl = tabs[0].url;
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(sender.tab.url)
            sendResponse({currentUrl: sender.tab.url});
        }
      );
});