const checkbox = document.querySelector("input[name=checkbox]")
chrome.storage.sync.get(["checkbox"], async function (result) {
	if (result.checkbox != null) {
		document.getElementById("checkbox").checked = result.checkbox
	} else {
		document.getElementById("checkbox").checked = false
	}
})
checkbox.addEventListener("change", async (e) => {
	if (e.target.checked) {
		chrome.storage.sync.set({ checkbox: true })
		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			function: async () => {
				var DGGurl = "https://www.destiny.gg/embed/chat"
				if (window.location.href.indexOf("youtube.com/watch") > -1) {
					// save youtube url to storage for the popup
					if (
						document.getElementById("chatframe").getAttribute("src") !== null
					) {
						chrome.storage.sync.set({
							youtubeChatSrc: document
								.getElementById("chatframe")
								.getAttribute("src"),
						})
					} else {
						// save youtube url to storage for the popup
						chrome.storage.sync.set({
							youtubeChatSrc:
								"https://www.youtube.com/live_chat?v=" +
								window.location.href.substring(
									window.location.href.lastIndexOf("=") + 1
								),
						})
					}
					// load the dgg chat
					var currentChat = document.getElementsByTagName(
						"ytd-live-chat-frame"
					)[0]
					console.log(
						"%c[DGG] %cPEEPO POOFING YOUTUBE CHAT AWAY",
						"color: #538CC6",
						"color: #6F859A"
					)
					while (currentChat.firstChild) {
						currentChat.removeChild(currentChat.firstChild)
					}
					currentChat.setAttribute(
						"style",
						"flex-direction: row -webkit-flex-direction: row"
					)
					var newChat = document.createElement("iframe")
					newChat.setAttribute("id", "dggChat")
					newChat.setAttribute("class", "chatframe")
					newChat.setAttribute("style", "flex: auto")
					newChat.setAttribute("src", DGGurl)
					currentChat.appendChild(newChat)
				}
				if (window.location.href.indexOf("twitch.tv") > -1) {
					// set the twitch chat src from the window url
					chrome.storage.sync.set({
						twitchChatSrc: `https://www.twitch.tv/popout/${window.location.href.substring(
							window.location.href.lastIndexOf("/") + 1
						)}/chat?popout=`,
					})
					let currentChat = document.getElementsByClassName(
						"channel-root__right-column"
					)[0]
					// get the chatframe and empty it
					if (currentChat) {
						console.log(
							"%c[DGG] %cPEEPO POOFING TWITCH CHAT AWAY",
							"color: #538CC6",
							"color: #6F859A"
						)
						while (currentChat.firstChild) {
							currentChat.removeChild(currentChat.firstChild)
						}
						let newChat = document.createElement("iframe")
						newChat.setAttribute("id", "dggChat")
						newChat.setAttribute("class", "chatframe")
						newChat.setAttribute(
							"style",
							"height: 100% !important; width: 100% !important; display: block;"
						)
						newChat.setAttribute("src", DGGurl)
						currentChat.prepend(newChat)
					}
				}
				if (window.location.href.indexOf("kick.com") > -1) {
					// save kicks popup chat url to storage
					chrome.storage.sync.set({
						kickChatSrc: `https://kick.com/${window.location.href.substring(
							window.location.href.lastIndexOf("/") + 1
						)}/chatroom`,
					})
					let currentChat = document.getElementsByClassName("chatroom")[0]
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
					let newChat = document.createElement("iframe")
					newChat.setAttribute("id", "dggChat")
					newChat.setAttribute("class", "chatframe")
					newChat.setAttribute("style", "flex: auto")
					newChat.setAttribute("src", "https://www.destiny.gg/embed/chat")
					currentChat.appendChild(newChat)
				}
				if (window.location.href.indexOf("rumble.com") > -1) {
					chrome.storage.sync.set({
						rumbleChatSrc: `https://rumble.com/chat/popup/${document
							.getElementsByClassName("rumbles-vote")[0]
							.getAttribute("data-id")}`,
					})
					let currentChat =
						document.getElementsByClassName("chat--container")[0]
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
					let newChat = document.createElement("iframe")
					newChat.setAttribute("id", "dggChat")
					newChat.setAttribute("class", "chat--container container")
					newChat.setAttribute(
						"style",
						"height: 660px; width: 400px; border: 0;"
					)
					newChat.setAttribute("src", "https://www.destiny.gg/embed/chat")
					currentChat.appendChild(newChat)
				}
			},
		})
	} else if (!e.target.checked) {
		chrome.storage.sync.set({ checkbox: false })

		chrome.tabs.query(
			{
				active: true,
				currentWindow: true,
			},
			function (tabs) {
				const tab = tabs[0]

				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					function: async () => {
						if (window.location.href.indexOf("youtube.com") > -1) {
							chrome.storage.sync.get("youtubeChatSrc", function (result) {
								var currentChat = document.getElementsByTagName(
									"ytd-live-chat-frame"
								)[0]
								while (currentChat.firstChild) {
									currentChat.removeChild(currentChat.firstChild)
								}
								currentChat.setAttribute(
									"style",
									"flex-direction: column; -webkit-flex-direction: column;"
								)
								var newChat = document.createElement("iframe")
								newChat.setAttribute("id", "chatframe")
								newChat.setAttribute("class", "style-scope ytd-live-chat-frame")
								newChat.setAttribute("frameborder", "0")
								newChat.setAttribute("scrolling", "no")
								newChat.setAttribute("src", result.youtubeChatSrc)
								currentChat.appendChild(newChat)
							})
						}
						if (window.location.href.indexOf("twitch.tv") > -1) {
							chrome.storage.sync.get("twitchChatSrc", function (src) {
								var currentChat = document.getElementsByClassName(
									"channel-root__right-column"
								)[0]
								while (currentChat.firstChild) {
									currentChat.removeChild(currentChat.firstChild)
								}
								var newChat = document.createElement("iframe")
								newChat.setAttribute("id", "dggChat")
								newChat.setAttribute("class", "chatframe")
								newChat.setAttribute(
									"style",
									"height: 100% !important; width: 100% !important; display: block;"
								)
								newChat.setAttribute("src", src.twitchChatSrc)
								currentChat.prepend(newChat)
							})
						} else if (window.location.href.indexOf("kick.com") > -1) {
							chrome.storage.sync.get("kickChatSrc", function (src) {
								var currentChat = document.getElementsByClassName("chatroom")[0]
								while (currentChat.firstChild) {
									currentChat.removeChild(currentChat.firstChild)
								}
								currentChat.setAttribute(
									"style",
									"flex-direction: row -webkit-flex-direction: row"
								)
								var newChat = document.createElement("iframe")
								newChat.setAttribute("id", "dggChat")
								newChat.setAttribute("class", "chatframe")
								newChat.setAttribute("style", "flex: auto")
								newChat.setAttribute("src", src.kickChatSrc)
								currentChat.appendChild(newChat)
							})
						} else if (window.location.href.indexOf("rumble.com") > -1) {
							chrome.storage.sync.get("rumbleChatSrc", function (src) {
								var currentChat =
									document.getElementsByClassName("chat--container")[0]
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
								newChat.setAttribute("src", src.rumbleChatSrc)
								currentChat.appendChild(newChat)
							})
						}
					},
				})
			}
		)
	}
})

// you gotta have some fun... right? (also im too artistically inept to make this extenion look nice)
chrome.runtime.sendMessage(
	{
		contentScriptQuery: "getEmotes",
		url: "https://cdn.destiny.gg/emotes/emotes.json",
	},
	function (response) {
		var randomIndex = Math.floor(Math.random() * response.length)
		// if the emote width is more then 3 times the height, get a new emote
		while (
			response[randomIndex].image[0].width >
			response[randomIndex].image[0].height * 3
		) {
			randomIndex = Math.floor(Math.random() * response.length)
		}
		var emote = document.createElement("img")
		emote.setAttribute("src", response[randomIndex].image[0].url)
		emote.setAttribute(
			"style",
			"position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); height: 100%; width: 100%; object-fit: contain; z-index: -1; opacity: 0.5;"
		)
		document.body.appendChild(emote)
	}
)
