const checkbox = document.querySelector("input[name=checkbox]")

function getOrigin(url) {
	// return the origin of the url or null if it is not a possible origin
	let possibleOrigins = [
		"*://*.youtube.com/*",
		"*://*.twitch.tv/*",
		"*://*.kick.com/*",
		"*://*.rumble.com/*",
		"*://*.destiny.gg/*",
	]
	console.log(url)
	for (let origin of possibleOrigins) {
		const regex = /\.([^/]+)\./
		if (url.match(regex.exec(origin)[1])) {
			return origin
		}
	}
	return null
}

function getDomainFromOrigin(url) {
	// "*://*.kick.com/*" -> "kick.com"
	if (url == null) {
		return null
	}
	let regex = /(\*:\/\/\*\.)|(\*\/\*)|(\*)|(\/)/g
	return url.replace(regex, "")
}

function getDomainFromUrl(url) {
	let hostname = new URL(url).hostname
	if (hostname.indexOf("www.") > -1) {
		hostname = hostname.substring(hostname.indexOf(".") + 1)
	}
	return hostname
}

async function getSelectedOrigins() {
	let origins = []
	await chrome.permissions.getAll().then((permissions) => {
		for (let origin of permissions.origins) {
			origins.push(origin)
		}
	})
	return origins
}

async function registerContentScript() {
	chrome.scripting.getRegisteredContentScripts().then(async (scripts) => {
		if (!scripts.find((script) => script.id === "chat-injector")) {
			let origins = await getSelectedOrigins()
			chrome.scripting.registerContentScripts([
				{
					id: "chat-injector",
					matches: origins,
					js: ["src/content.js"],
					runAt: "document_start",
				},
			])
		}
	})
}

async function doWeHavePermission(origin) {
	let perms = await chrome.permissions.getAll()
	return perms.origins.includes(origin)
}

async function setCheckbox() {
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	let origin = getOrigin(tab.url)
	console.log(origin)
	chrome.storage.sync.get(
		[`checkbox-${getDomainFromOrigin(origin)}`],
		async function (result) {
			if (result[`checkbox-${getDomainFromOrigin(origin)}`] != null) {
				await doWeHavePermission(origin).then((perms) => {
					if (perms) {
						document.getElementById("checkbox").checked =
							result[`checkbox-${getDomainFromOrigin(origin)}`]
					} else {
						chrome.storage.sync.set({
							[`checkbox-${getDomainFromOrigin(origin)}`]: false,
						})
						document.getElementById("checkbox").checked = false
					}
				})
			} else {
				document.getElementById("checkbox").checked = false
			}
		}
	)
}

async function init() {
	await registerContentScript()
	await setCheckbox()
}

init()

checkbox.addEventListener("change", async (e) => {
	if (e.target.checked) {
		// ensure the content script is registered
		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		let origin = getOrigin(tab.url)
		if (origin == null) {
			document.getElementById("checkbox").checked = false
			return
		}
		await doWeHavePermission(origin).then(async (perms) => {
			if (!perms) {
				await chrome.permissions
					.request({ origins: [origin] })
					.then(async (granted) => {
						if (granted) {
							// update the content script to the new permissions
							let origins = await getSelectedOrigins()
							await chrome.scripting.updateContentScripts([
								{
									id: "chat-injector",
									matches: origins,
								},
							])
							chrome.storage.sync.set({
								[`checkbox-${getDomainFromUrl(tab.url)}`]: true,
							})
							chrome.scripting.executeScript({
								target: { tabId: tab.id },
								files: ["src/content.js"],
							})
						}
					})
			} else if (perms) {
				let origins = await getSelectedOrigins()
				// update the content script to the new permissions
				await chrome.scripting.updateContentScripts([
					{
						id: "chat-injector",
						matches: origins,
					},
				])
				chrome.storage.sync.set({
					[`checkbox-${getDomainFromUrl(tab.url)}`]: true,
				})
				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					files: ["src/content.js"],
				})
			}
		})
	} else if (!e.target.checked) {
		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		let origin = getOrigin(tab.url)
		if (origin == null) {
			document.getElementById("checkbox").checked = false
			return
		}
		chrome.storage.sync.set({
			[`checkbox-${getDomainFromUrl(tab.url)}`]: false,
		})
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
						console.log(
							"%c[DGG] %cPEEPO POOFING DGG CHAT AWAY",
							"color: #538CC6",
							"color: #6F859A"
						)
						if (window.location.href.indexOf("youtube.com/watch") > -1) {
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
								var currentChat = document.getElementById("chatroom")
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
		backgroundScriptQuery: "getEmotes",
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
