// LISTENERS
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.backgroundScriptQuery == "getEmotes") {
		var url = request.url
		fetch(url)
			.then((response) => response.json())
			.then((response) => sendResponse(response))
			.catch()
		return true
	}
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.message === "notifyTabChange") {
		chrome.tabs.onActivated.addListener((activeInfo) => {
			if (activeInfo.tabId === sender.tab.id) {
				try {
					chrome.tabs.sendMessage(sender.tab.id, {
						message: "tabChanged",
					})
				} catch (error) {
					// we don't care if it fails for now
				}
			}
			sendResponse({ message: "Aknowledged" })
		})
	}
})
