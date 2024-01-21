async function customFetch(url, options) {
	try {
		const response = await fetch(url, options)
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		return await response.json() // or .text(), depending on the response type
	} catch (error) {
		console.error("Fetch error:", error)
	}
}

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "performFetch") {
		customFetch(request.url, request.options)
			.then((data) => sendResponse({ status: "success", data: data }))
			.catch((error) =>
				sendResponse({ status: "error", message: error.message })
			)
		return true // Indicates you wish to send a response asynchronously
	}
})
