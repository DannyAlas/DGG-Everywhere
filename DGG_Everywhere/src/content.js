function isDGGLoaded() {
	if (document.getElementById("chatframe") !== null) {
		return (
			document.getElementById("chatframe").getAttribute("src") ===
			"https://www.destiny.gg/embed/chat"
		)
	} else {
		return false
	}
}

function CHAT_REPLACER_9000() {
	// try catch for some GET errors from the twitch api
	try {
		// save youtube url to storage for the popup if it is not the dgg chat
		if (window.location.href.indexOf("youtube.com/watch") > -1) {
			chrome.storage.sync.get("checkbox", function (result) {
				if (result.checkbox == true && isDGGLoaded() == false) {
					const intervalId = setInterval(() => {
						// if the custom src is available save that, otherwise use the default popout chat
						if (document.getElementById("chatframe").getAttribute("src")) {
							chrome.storage.sync.set({
								youtubeChatSrc: document
									.getElementById("chatframe")
									.getAttribute("src"),
							})
						} else {
							// save default youtube popout chat url
							chrome.storage.sync.set({
								youtubeChatSrc:
									"https://www.youtube.com/live_chat?v=" +
									window.location.href.substring(
										window.location.href.lastIndexOf("=") + 1
									),
							})
						}
						var currentChat = document.getElementsByTagName(
							"ytd-live-chat-frame"
						)
						console.log("currentChat", currentChat.length)
						if (currentChat.length > 0) {
							console.log(
								"%c[DGG] %cPEEPO POOFING YOUTUBE CHAT AWAY",
								"color: #538CC6",
								"color: #6F859A"
							)
							currentChat = currentChat[0]
							// empty the current chat
							while (currentChat.firstChild) {
								currentChat.removeChild(currentChat.firstChild)
							}

							currentChat.setAttribute(
								"style",
								"flex-direction: row -webkit-flex-direction: row"
							)
							var url = "https://www.destiny.gg/embed/chat"

							var newChat = document.createElement("iframe")
							newChat.setAttribute("id", "dggChat")
							newChat.setAttribute("class", "chatframe")
							newChat.setAttribute("style", "flex: auto")
							newChat.setAttribute("src", url)
							currentChat.appendChild(newChat)

							if (document.getElementById("dggChat") !== null) {
								clearInterval(intervalId)
							}
						}
					}, 500)
				}
			})
		}
		if (window.location.href.indexOf("twitch.tv") > -1) {
			// if the checkbox is not checked append the proper chat to the page
			var twitchChatSrc = `https://www.twitch.tv/popout/${window.location.href.substring(
				window.location.href.lastIndexOf("/") + 1
			)}/chat?popout=`

			// save twitch url to storage for the popup
			chrome.storage.sync.set({ twitchChatSrc: twitchChatSrc })

			chrome.storage.sync.get("checkbox", function (result) {
				if (result.checkbox == true && isDGGLoaded() == false) {
					var currentChat = document.getElementsByClassName(
						"channel-root__right-column"
					)
					console.log("currentChat", currentChat.length)
					const intervalId = setInterval(() => {
						if (currentChat.length > 0) {
							console.log(
								"%c[DGG] %cPEEPO POOFING TWITCH CHAT AWAY",
								"color: #538CC6",
								"color: #6F859A"
							)
							currentChat = currentChat[0]

							// empty the current chat
							while (currentChat.firstChild) {
								currentChat.removeChild(currentChat.firstChild)
							}

							var url = "https://www.destiny.gg/embed/chat"

							var newChat = document.createElement("iframe")
							newChat.setAttribute("id", "dggChat")
							newChat.setAttribute("class", "chatframe")
							newChat.setAttribute(
								"style",
								"height: 100% !important; width: 100% !important; display: block;"
							)
							newChat.setAttribute("src", url)
							currentChat.prepend(newChat)
							if (document.getElementById("dggChat") !== null) {
								clearInterval(intervalId)
							}
						}
					}, 500)
				}
			})
		}
		if (window.location.href.indexOf("kick.com") > -1) {
			// wait for the chat to load
			const intervalId = setInterval(() => {
				if (document.getElementsByClassName("chatroom")[0]) {
					// save kicks popup chat url to storage
					chrome.storage.sync.set({
						kickChatSrc: `https://kick.com/${window.location.href.substring(
							window.location.href.lastIndexOf("/") + 1
						)}/chatroom`,
					})

					chrome.storage.sync.get("checkbox", function (result) {
						var currentChat = document.getElementsByClassName("chatroom")[0]

						if (
							result.checkbox == true &&
							currentChat.getAttribute("src") !=
								"https://www.destiny.gg/embed/chat"
						) {
							if (currentChat) {
								console.log(
									"%c[DGG] %cPEEPO POOFING KICK CHAT AWAY",
									"color: #538CC6",
									"color: #6F859A"
								)
								// remove all children from the chat
								while (currentChat.firstChild) {
									currentChat.removeChild(currentChat.firstChild)
								}
								// set the flex direction to row
								currentChat.setAttribute(
									"style",
									"flex-direction: row -webkit-flex-direction: row"
								)
								// add the iframe with dgg chat
								var newChat = document.createElement("iframe")
								newChat.setAttribute("id", "dggChat")
								newChat.setAttribute("class", "chatframe")
								newChat.setAttribute("style", "flex: auto")
								newChat.setAttribute("src", "https://www.destiny.gg/embed/chat")
								currentChat.appendChild(newChat)
								if (document.getElementById("dggChat") !== null) {
									clearInterval(intervalId)
								}
							}
						}
					})
				}
			}, 500)
		} else if (window.location.href.indexOf("rumble.com") > -1) {
			const intervalId = setInterval(() => {
				// save rumbles popup chat url to storage
				if (document.getElementsByClassName("chat--container")[0]) {
					chrome.storage.sync.set({
						rumbleChatSrc: `https://rumble.com/chat/popup/${document
							.getElementsByClassName("rumbles-vote")[0]
							.getAttribute("data-id")}`,
					})

					chrome.storage.sync.get("checkbox", function (result) {
						if (
							result.checkbox == true &&
							document.getElementById("dggChat") == null
						) {
							var currentChat =
								document.getElementsByClassName("chat--container")[0]
							if (currentChat) {
								console.log(
									"%c[DGG] %cPEEPO POOFING RUMBLE CHAT AWAY",
									"color: #538CC6",
									"color: #6F859A"
								)
								// remove all children from the chat
								while (currentChat.firstChild) {
									currentChat.removeChild(currentChat.firstChild)
								}
								// add the iframe with dgg chat
								var newChat = document.createElement("iframe")
								newChat.setAttribute("id", "dggChat")
								newChat.setAttribute("class", "chat--container container")
								newChat.setAttribute(
									"style",
									"height: 660px; width: 400px; border: 0;"
								)
								newChat.setAttribute("src", "https://www.destiny.gg/embed/chat")
								currentChat.appendChild(newChat)
								clearInterval(intervalId)
							}
							if (document.getElementById("dggChat") !== null) {
								clearInterval(intervalId)
							}
						}
					})
				}
			}, 500)
		}
	} catch (e) {
		console.log(e)
	}
}

let lastUrl = location.href
// run the function on page load
document.addEventListener("DOMContentLoaded", function () {
	CHAT_REPLACER_9000()
})

// run the function on url change
new MutationObserver(() => {
	const url = location.href

	if (url !== lastUrl) {
		lastUrl = url
		CHAT_REPLACER_9000()
	}
}).observe(document, { subtree: true, childList: true })
