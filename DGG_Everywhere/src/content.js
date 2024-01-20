function isDGGLoaded(currentChat = null) {
	if (currentChat === null) {
		if (document.getElementById("chatframe") !== null) {
			return (
				document.getElementById("chatframe").getAttribute("src") ===
				"https://www.destiny.gg/embed/chat"
			)
		} else {
			return false
		}
	} else {
		return (
			currentChat.getAttribute("src") == "https://www.destiny.gg/embed/chat"
		)
	}
}

function getDomainFromUrl(url) {
	let hostname = new URL(url).hostname
	if (hostname.indexOf("www.") > -1) {
		hostname = hostname.substring(hostname.indexOf(".") + 1)
	}
	return hostname
}

async function replaceYoutube() {
	await chrome.storage.sync.get(
		`checkbox-${getDomainFromUrl(window.location.href)}`,
		function (result) {
			if (
				result[`checkbox-${getDomainFromUrl(window.location.href)}`] &&
				!isDGGLoaded()
			) {
				const intervalId = setInterval(() => {
					try {
						if (document.getElementById("chatframe").getAttribute("src")) {
							chrome.storage.sync.set({
								youtubeChatSrc: document
									.getElementById("chatframe")
									.getAttribute("src"),
							})
						}
					} catch (error) {
						// save default youtube popout chat url
						chrome.storage.sync.set({
							youtubeChatSrc:
								"https://www.youtube.com/live_chat?v=" +
								window.location.href.substring(
									window.location.href.lastIndexOf("=") + 1
								),
						})
					}
					var currentChat = document.getElementsByTagName("ytd-live-chat-frame")
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
		}
	)
}

async function replaceTwitch() {
	var twitchChatSrc = `https://www.twitch.tv/popout/${window.location.href.substring(
		window.location.href.lastIndexOf("/") + 1
	)}/chat?popout=`

	// save twitch url to storage for the popup
	chrome.storage.sync.set({ twitchChatSrc: twitchChatSrc })
	await chrome.storage.sync.get(
		`checkbox-${getDomainFromUrl(window.location.href)}`,
		function (result) {
			if (
				result[`checkbox-${getDomainFromUrl(window.location.href)}`] &&
				!isDGGLoaded()
			) {
				const intervalId = setInterval(() => {
					var currentChat = document.getElementsByClassName(
						"channel-root__right-column"
					)
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
		}
	)
}

async function replaceKick() {
	chrome.storage.sync.set({
		kickChatSrc: `https://kick.com/${window.location.href.substring(
			window.location.href.lastIndexOf("/") + 1
		)}/chatroom`,
	})
	const intervalId = setInterval(() => {
		var currentChat = document.getElementById("chatroom")
		if (currentChat) {
			chrome.storage.sync.get(
				`checkbox-${getDomainFromUrl(window.location.href)}`,
				function (result) {
					if (
						result[`checkbox-${getDomainFromUrl(window.location.href)}`] &&
						!isDGGLoaded(currentChat)
					) {
						console.log(
							"%c[DGG] %cPEEPO POOFING KICK CHAT AWAY",
							"color: #538CC6",
							"color: #6F859A"
						)
						// loop through all the children of the chat and remove them if they don't have the id of chatroom-top
						for (var i = 0; i < currentChat.children.length + 1; i++) {
							if (currentChat.children[i].id === "chatroom-top") {
								// loop through all the children of the chatroom-top and remove them if they don't have the custom attribute of channel-slug
								for (
									var j = 0;
									j < currentChat.children[i].children.length;
									j++
								) {
									if (
										currentChat.children[i].children[j].getAttribute(
											"channel-slug"
										) === null
									) {
										currentChat.children[i].children[j].remove()
									}
								}
							} else {
								currentChat.removeChild(currentChat.children[i])
							}
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
						// add padding to the bottom of the chat
						newChat.setAttribute("style", "flex: auto")
						newChat.setAttribute("src", "https://www.destiny.gg/embed/chat")
						currentChat.appendChild(newChat)
						if (document.getElementById("dggChat") !== null) {
							clearInterval(intervalId)
						}
					} else {
						clearInterval(intervalId)
					}
				}
			)
		}
	}, 500)
}

async function replaceRumble() {
	const intervalId = setInterval(() => {
		// save rumbles popup chat url to storage
		// need to be in the interval as its obtained from rumbles-vote class
		if (document.getElementsByClassName("chat--container")[0]) {
			chrome.storage.sync.set({
				rumbleChatSrc: `https://rumble.com/chat/popup/${document
					.getElementsByClassName("rumbles-vote")[0]
					.getAttribute("data-id")}`,
			})

			var currentChat = document.getElementsByClassName("chat--container")[0]
			if (currentChat) {
				chrome.storage.sync.get(
					`checkbox-${getDomainFromUrl(window.location.href)}`,
					function (result) {
						if (
							result[`checkbox-${getDomainFromUrl(window.location.href)}`] &&
							!isDGGLoaded(currentChat)
						) {
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
							if (document.getElementById("dggChat") !== null) {
								clearInterval(intervalId)
							}
						}
					}
				)
			} else {
				clearInterval(intervalId)
			}
		}
	}, 500)
}

async function fixAutofocus() {
	// ask the background script to notify us when the tab changes
	chrome.runtime.sendMessage({ message: "notifyTabChange" })
	var firstSwitch = true
	chrome.runtime.onMessage.addListener(function (request) {
		if (request.message === "tabChanged" && firstSwitch) {
			// for the next second every millisecond scroll to the top of the page
			var intervalId = setInterval(() => {
				window.scrollTo(0, 0)
			}, 1)
			setTimeout(() => {
				clearInterval(intervalId)
			}, 1000)
			firstSwitch = false
		}
	})
}

async function CHAT_REPLACER_9000() {
	if (
		window.location.href.indexOf("youtube.com/watch") > -1 ||
		window.location.href.indexOf("youtube.com/live") > -1 ||
		window.location.href.indexOf("youtube.com/destiny") > -1
	) {
		await replaceYoutube()
		await fixAutofocus()
	}
	if (window.location.href.indexOf("twitch.tv") > -1) {
		await replaceTwitch()
	}
	if (window.location.href.indexOf("kick.com") > -1) {
		await replaceKick()
	}
	if (window.location.href.indexOf("rumble.com") > -1) {
		await replaceRumble()
	}
}

// run the function on page load
document.addEventListener("DOMContentLoaded", function () {
	CHAT_REPLACER_9000()
})
