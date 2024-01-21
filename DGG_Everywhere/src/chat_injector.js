/* eslint-disable no-unused-vars */
const DEBUG = false
const DEBUG_NUKE_DATA = [
	{
		time: "2020-03-20T14:28:23.382748",
		type: "meganuke",
		duration: "10m",
		word: "test",
	},
	{
		time: "2020-03-20T14:28:23.382748",
		type: "meganuke",
		duration: "10m",
		word: "test2",
	},
]
const DEBUG_LINKS_DATA = [
	{
		status: "on",
	},
]

const chatInputControl = document.getElementById("chat-input-control")
if (chatInputControl != null) {
	if (chatInputControl.getAttribute("autofocus") != null) {
		chatInputControl.removeAttribute("autofocus")
	}
	chatInputControl.addEventListener("focus", (event) => {
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()
		chrome.runtime.sendMessage({
			action: "scrollToTop",
		})
	})
}

// helpers
function bgFetch(url, options = {}) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				action: "performFetch",
				url: url,
				options: options,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message))
					return
				}
				resolve(response)
			}
		)
	})
}

function getDGGChatIFrame() {
	// we should only be injected into the chat iframe so return the current window
	if (window.location.href.includes("destiny.gg/embed/chat")) {
		return window
	} else {
		// otherwise return the iframe
		return document.getElementById("dggChat").contentWindow
	}
}

class ConfigItem {
	constructor(keyName, defaultValue) {
		this.keyName = keyName
		this.defaultValue = defaultValue
	}
}
const configItems = {
	alwaysScrollDown: new ConfigItem("alwaysScrollDown", true),
	changeTitleOnLive: new ConfigItem("changeTitleOnLive", false),
	embedIconStyle: new ConfigItem("embedIconStyle", 1),
	doubleClickCopy: new ConfigItem("doubleClickCopy", false),
	embedChat: new ConfigItem("embedChat", false),
	embedsOnLaunch: new ConfigItem("embedsOnLaunch", false),
	showLastVOD: new ConfigItem("showLastVOD", false),
	lastEmbeds: new ConfigItem("lastEmbeds", false),
	lastIfNone: new ConfigItem("lastIfNone", false),
	embedTime: new ConfigItem("embedTime", 30),
	twitchEmbedFormat: new ConfigItem("twitchEmbedFormat", 1),
	youtubeEmbedFormat: new ConfigItem("youtubeEmbedFormat", 1),
	rumbleEmbedFormat: new ConfigItem("rumbleEmbedFormat", 1),
	colorOnMutelinks: new ConfigItem("colorOnMutelinks", false),
	phraseColor: new ConfigItem("phraseColor", "1f0000"),
	nukeColor: new ConfigItem("nukeColor", "1f1500"),
	mutelinksColor: new ConfigItem("mutelinksColor", "120016"),
	customPhrases: new ConfigItem("customPhrases", []),
	customPhrasesSoft: new ConfigItem("customPhrasesSoft", []),
	customColor: new ConfigItem("customColor", "1f0000"),
	customSoftColor: new ConfigItem("customSoftColor", "260019"),
	editEmbeds: new ConfigItem("editEmbeds", false),
	editEmbedPill: new ConfigItem("editEmbedPill", false),
	preventEnter: new ConfigItem("preventEnter", false),
	hiddenFlairs: new ConfigItem("hiddenFlairs", []),
	stickyMentions: new ConfigItem("stickyMentions", false),
	stickyWhispers: new ConfigItem("stickyWhispers", false),
	ignorePhrases: new ConfigItem("ignorePhrases", false),
	ignoredPhraseList: new ConfigItem("ignoredPhraseList", []),
}
class Config {
	constructor(configKeys, keyPrefix) {
		this.configItems = configKeys
		this.configKeyPrefix = keyPrefix
		// Creates setter funcs in this object (config)
		// So when the config.key value is changed it is also saved in localStorage
		for (const key in this.configItems) {
			const configKey = this.configItems[key]
			const keyName = configKey.keyName
			const privateKeyName = `#${keyName}`
			Object.defineProperty(this, key, {
				set: function (value) {
					// Set the private value
					this[privateKeyName] = value
					// Save it to persistent storage as well
					this.save(keyName, value)
				},
				get: function () {
					// Check if value is saved in config object
					if (this[privateKeyName] === undefined) {
						// If not, load it from persistent storage, or use default value
						this[privateKeyName] = this.load(keyName) ?? configKey.defaultValue
					}
					return this[privateKeyName]
				},
			})
		}
	}
	getFullKeyName(configKey) {
		return `${this.configKeyPrefix}${configKey}`
	}
	save(configKey, value) {
		// Persist the value in LocalStorage
		const fullKeyName = this.getFullKeyName(configKey)
		window.localStorage.setItem(fullKeyName, JSON.stringify(value))
		chrome.storage.sync.set({ [fullKeyName]: value })
	}
	saveLocal(configKey, value) {
		// Persist the value in LocalStorage only
		const fullKeyName = this.getFullKeyName(configKey)
		window.localStorage.setItem(fullKeyName, JSON.stringify(value))
	}
	load(configKey) {
		// Get the value we persisted, in localStorage
		const fullKeyName = this.getFullKeyName(configKey)
		const item = window.localStorage.getItem(fullKeyName)
		if (item != null) {
			const parsedItem = JSON.parse(item)
			return parsedItem
		}
	}
	saveToSync() {
		// Save all config values to chrome sync storage
		for (const key in this.configItems) {
			const configKey = this.configItems[key]
			const keyName = configKey.keyName
			const fullKeyName = this.getFullKeyName(keyName)
			chrome.storage.sync.set({ [fullKeyName]: this[keyName] })
		}
	}
	setFromSync() {
		// Load all config values from chrome sync storage
		for (const key in this.configItems) {
			const configKey = this.configItems[key]
			const keyName = configKey.keyName
			const fullKeyName = this.getFullKeyName(keyName)
			chrome.storage.sync.get([fullKeyName], (result) => {
				if (result[fullKeyName] != null) {
					this.saveLocal(keyName, result[fullKeyName])
				}
			})
		}
	}
}

let config = new Config(configItems, "dgg-util.")

const timeOptions = {
	hour12: false,
	hour: "2-digit",
	minute: "2-digit",
}

const mutelinksChecklist = [
	"https://",
	"http://",
	"www.",
	".com",
	".org",
	".ru",
	".net",
	".uk",
	".au",
	".in",
	".de",
	".ir",
	".ca",
	".gov",
	".be",
	".tv",
	".it",
]

let phrases = []
let phrasesEtag = ""
let nukes = []
let nukesCompiled = []
let mutelinks = false
let foundPhraseOrNuke = false

let nukesTimestamp = 0
let mutelinksTimestamp = 0
let phrasesTimestamp = 0

let chatlines = document.querySelector(".chat-lines")
let textarea = document.querySelector("#chat-input-control")
let scrollnotify = document.querySelector(".chat-scroll-notify")

let utilSettingsStyle = document.createElement("style")
let utilSettingsStyleString = `
#util-settings-btn {
	width: 95%;
	height: 32px;
	color: #B9B9B9;
	background-color: #030303;
	margin-left: 2.5%;
}

#util-settings-btn:hover {
	cursor: pointer;
	border: 2px solid #B9B9B9;
}

#util-settings #util-settings-form {
	margin: .9em 0;
}

#util-settings .form-group {
	margin: .9em .9em;
	display: block;
	position: relative
}

#util-settings h4 {
	font-size: 0.9em;
	margin-bottom: .9em;
	padding-left: .9em;
	color: #494949;
	text-transform: uppercase;
	font-weight: 600
}

#util-settings label {
	display: inline-block;
	font-weight: normal;
	max-width: 100%;
	margin-bottom: .6em
}

#util-settings .checkbox label {
	margin-bottom: 0;
	font-weight: 400;
	max-width: 100%;
	cursor: pointer;
	display: flex;
	justify-items: center;
	align-items: center
}

#util-settings .checkbox input {
	margin: 0 .3em 0 0;
	line-height: normal;
	box-sizing: border-box;
	padding: 0
}

#util-settings select {
	border-radius: .25em;
	padding: .3em;
	width: 100%
}

#util-update-group {
  display: flex;
  justify-content: center;
}

#util-update-group a {
  width: 75%;
  text-align: center;
}

#util-update-group a.no-link:hover {
  text-decoration: none;
}
`
let alertAnimationStyle = document.createElement("style")
let keyFrames = `
  :root {
    --flashing-color: #1f0000;
  }

  @keyframes bannedAlert {
    0%,
    50%,
    100% {
      background-color: #111;
    }

    25%,
    75% {
      background-color: var(--flashing-color);
    }
  }

  .alertAnim {
    animation: bannedAlert 1s;
  }`
class DGGMsg {
	constructor(str, type, stamp) {
		let msg = document.createElement("div")
		msg.className = `msg-chat ${type}`
		let time
		if (stamp != "") {
			time = new Date(stamp * 1000)
		} else {
			time = new Date()
		}
		let msgInnerTime = document.createElement("time")
		msgInnerTime.className = "time"
		msgInnerTime.innerHTML = time.toLocaleTimeString("en-US", timeOptions)
		let msgInnerText = document.createElement("span")
		msgInnerText.className = "text"
		msgInnerText.innerHTML = str
		msg.appendChild(msgInnerTime)
		msg.appendChild(msgInnerText)
		chatlines.appendChild(msg)
	}

	update() {
		if (config.alwaysScrollDown) {
			chatlines.scrollTop = chatlines.scrollHeight
		} else {
			if (window.getComputedStyle(scrollnotify).bottom != "0px") {
				chatlines.scrollTop = chatlines.scrollHeight
			} else {
				chatlines.scrollLeft = chatlines.scrollWidth
			}
		}
	}
}

document.addEventListener(
	"keypress",
	function (e) {
		let textarea = document.querySelector("#chat-input-control")
		if (
			e.key === "Enter" &&
			!e.altKey &&
			foundPhraseOrNuke &&
			config.preventEnter
		) {
			e.preventDefault()
			e.stopImmediatePropagation()
			textarea.classList.add("alertAnim")
			setTimeout(() => {
				textarea.classList.remove("alertAnim")
			}, 1000)
		}
		return false
	},
	true
)

async function injectScript() {
	utilSettingsStyle.innerHTML = utilSettingsStyleString
	utilSettingsStyle.id = "utilSettingsStyle"
	document.head.appendChild(utilSettingsStyle)

	alertAnimationStyle.innerHTML = keyFrames
	document.head.appendChild(alertAnimationStyle)

	// make an observer to show an update message after the "connected" alert in chat
	let updateObserver = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			for (let node of mutation.addedNodes) {
				if (node.matches('div[class="msg-chat msg-status "]')) {
					if (
						node
							.querySelector('span[class="text"]')
							.innerHTML.includes("Connected")
					) {
						// Show the version
						new DGGMsg(
							`Hey! Looks like you're using version ${
								chrome.runtime.getManifest().version
							} of DGG Everywhere. Check out the <a href="https://github.com/DannyAlas/DGG-Everywhere" target="_blank">GitHub</a> for more info!`,
							"msg-info",
							""
						)
						chatlines.scrollTop = chatlines.scrollHeight

						updateObserver.disconnect()
					}
				}
			}
		}
	})
	// keep chacking till chatlines is a node
	let checkChatlines = setInterval(() => {
		if (chatlines != null) {
			updateObserver.observe(chatlines, {
				childList: true,
			})
			clearInterval(checkChatlines)
		}
	}, 100)

	// Add custom style rules to this
	let settingsCss = ""

	// making a button for message sending
	let chatToolsArea = document.querySelectorAll(".chat-tools-group")[1]
	// there should be 2 of these, one for chat and first for left second for right
	let sendAnywayButton = document.createElement("a")
	sendAnywayButton.id = "send-anyway-btn"
	sendAnywayButton.className = "chat-tool-btn"
	sendAnywayButton.title = "Send Anyway"
	sendAnywayButton.style.display = "none"
	let sendAnywayButton_i = document.createElement("i")
	sendAnywayButton_i.className = "btn-icon"
	sendAnywayButton_i.innerHTML = "✉️"
	sendAnywayButton_i.style.fontStyle = "normal"
	sendAnywayButton_i.style.fontSize = "larger"
	sendAnywayButton_i.style.textAlign = "center"
	sendAnywayButton_i.style.textShadow = "0 0 white"

	sendAnywayButton.addEventListener("click", () => {
		// this one to actually send the message
		textarea.dispatchEvent(
			new KeyboardEvent("keypress", {
				key: "Enter",
				keyCode: 13,
				code: "Enter",
				which: 13,
				altKey: true,
			})
		)
		// this one to update the text area
		textarea.dispatchEvent(
			new KeyboardEvent("keyup", {
				key: "Enter",
				keyCode: 13,
				code: "Enter",
				which: 13,
				altKey: true,
			})
		)
	})

	// making a button for embeds
	let embedsButton = document.createElement("a")
	embedsButton.id = "embeds-btn"
	embedsButton.className = "chat-tool-btn"
	embedsButton.title = "Embeds"
	let embedsButton_i = document.createElement("i")
	embedsButton_i.className = "btn-icon"
	if (config.embedIconStyle !== 1) {
		embedsButton_i.innerHTML = "🎬"
	} else {
		embedsButton_i.style.backgroundImage = `url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg width='25' height='25' viewBox='-25 -10 150 150' version='1.1' id='svg5' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cdefs id='defs2' /%3E%3Cpath style='opacity:1;fill:%23ffffff;fill-opacity:1;stroke-width:0.406658' d='m 92.631299,98.472455 c 0,3.664485 -3.18611,6.614595 -7.14375,6.614595 H 10.399791 c -3.9576372,0 -7.0776042,-3.01626 -7.0776042,-6.680745 0,-8.21058 0.06729,-51.199364 0.06729,-57.368996 L 92.635479,40.896992' id='lower' /%3E%3Crect style='opacity:1;fill:%23ffffff;fill-opacity:1;stroke-width:0.334081' id='upper' width='89.762489' height='14.542242' x='-6.0129457' y='22.639624' transform='matrix(0.96526009,-0.26129094,0.25636721,0.96657946,0,0)' /%3E%3C/svg%3E%0A")`
	}
	embedsButton_i.style.fontStyle = "normal"
	embedsButton_i.style.fontSize = "larger"
	embedsButton_i.style.textAlign = "center"
	switch (config.embedIconStyle) {
	case 3:
		embedsButton_i.style.filter = "saturate(0)"
		break
	case 4:
		embedsButton_i.style.color = "transparent"
		embedsButton_i.style.textShadow = "0 0 white"
		break
	}

	// making an error alert
	let chatWhispersArea = document.querySelectorAll(".chat-tools-group")[0]
	let errorAlert = document.createElement("a")
	errorAlert.id = "error-alert"
	errorAlert.className = "chat-tool-btn"
	errorAlert.title = "Can't connect to vyneer.me"
	errorAlert.style.cursor = "unset"
	errorAlert.style.display = "none"
	let errorAlert_i = document.createElement("i")
	errorAlert_i.className = "btn-icon"
	errorAlert_i.innerHTML = "⚠️"
	errorAlert_i.style.fontStyle = "normal"
	errorAlert_i.style.fontSize = "larger"
	errorAlert_i.style.textAlign = "center"
	errorAlert_i.style.color = "red"
	errorAlert_i.style.opacity = 1

	// making a button for the nuke alert
	let nukeAlertButton = document.createElement("a")
	nukeAlertButton.id = "nukes-btn"
	nukeAlertButton.className = "chat-tool-btn"
	nukeAlertButton.title = "Nukes"
	nukeAlertButton.style.display = "none"
	if (DEBUG) {
		nukeAlertButton.style.display = ""
	}
	let nukeAlertButton_i = document.createElement("i")
	nukeAlertButton_i.className = "btn-icon"
	nukeAlertButton_i.innerHTML = "☢"
	nukeAlertButton_i.style.fontStyle = "normal"
	nukeAlertButton_i.style.fontSize = "larger"
	nukeAlertButton_i.style.textAlign = "center"
	nukeAlertButton_i.style.color = "yellow"
	nukeAlertButton_i.style.opacity = 1

	// making a button for the mutelinks alert
	let linksAlertButton = document.createElement("a")
	linksAlertButton.id = "mutelinks-btn"
	linksAlertButton.className = "chat-tool-btn"
	linksAlertButton.title = "Mutelinks"
	linksAlertButton.style.display = "none"
	if (DEBUG) {
		linksAlertButton.style.display = "inline-flex"
	}
	linksAlertButton.style.justifyContent = "center"
	linksAlertButton.style.width = "auto"
	linksAlertButton.style.cursor = "unset"
	let linksAlertButton_i = document.createElement("i")
	linksAlertButton_i.className = "btn-icon"
	linksAlertButton_i.innerHTML = "🔗"
	linksAlertButton_i.style.fontStyle = "normal"
	linksAlertButton_i.style.fontSize = "larger"
	linksAlertButton_i.style.textAlign = "center"
	linksAlertButton_i.style.opacity = 1
	let linksAlertButton_span = document.createElement("span")
	linksAlertButton_span.className = "btn-icon"
	linksAlertButton_span.innerHTML = ""
	linksAlertButton_span.style.opacity = 1
	linksAlertButton_span.style.left = "100%"
	linksAlertButton_span.style.color = "#FFF7F9"
	linksAlertButton_span.style.fontSize = "0.75em"
	linksAlertButton_span.style.position = "absolute"
	linksAlertButton_span.style.verticalAlign = "text-button"
	linksAlertButton_span.style.marginLeft = "0.25em"
	linksAlertButton_span.style.top = "4px"

	// make a container for the custom buttons so that we could move em together
	let utilitiesButtons = document.createElement("div")

	// appending buttons to the right area on screen
	sendAnywayButton.appendChild(sendAnywayButton_i)
	embedsButton.appendChild(embedsButton_i)
	errorAlert.appendChild(errorAlert_i)
	nukeAlertButton.appendChild(nukeAlertButton_i)
	linksAlertButton.appendChild(linksAlertButton_i)
	linksAlertButton.appendChild(linksAlertButton_span)
	chatToolsArea.prepend(embedsButton)
	chatToolsArea.prepend(sendAnywayButton)
	utilitiesButtons.appendChild(errorAlert)
	utilitiesButtons.appendChild(nukeAlertButton)
	utilitiesButtons.appendChild(linksAlertButton)
	chatWhispersArea.appendChild(utilitiesButtons)

	// creating the settings page
	// make sure we only create the nanoscroller once
	let settingsInit = false
	// there's like a billion layers here, very annoying and ugly
	// this is the main one
	let utilSettings = document.createElement("div")
	utilSettings.id = "util-settings"
	utilSettings.className = "chat-menu right"
	document.querySelector("#chat").appendChild(utilSettings)
	// making a button to open the settings menu
	let settingsButton = document.createElement("button")
	settingsButton.id = "util-settings-btn"
	settingsButton.innerHTML = "DGG Utils"
	settingsButton.addEventListener("click", () => {
		// it closes the vanilla chat settings menu first (with a click, to avoid doubleclicks later)
		document.querySelector("#chat-settings-btn").click()
		// show dgg util settings with a class change
		utilSettings.classList.toggle("active")
		// if we havent opened the dgg utils settings pane before, make it scrollable with the nanoscroller thing
		if (!settingsInit) {
			settingsInit = true
		}
	})
	// make sure we close the settings pane when we click on any of the other buttons in the bottom panel
	document
		.querySelectorAll(
			"#chat-emoticon-btn, #chat-whisper-btn, #chat-settings-btn, #chat-users-btn"
		)
		.forEach((el) => {
			el.addEventListener("click", () => {
				if (utilSettings.classList.contains("active")) {
					utilSettings.classList.remove("active")
				}
			})
		})
	// make sure we close the settings pane when we click on the bottom panel itself
	document.querySelector("#chat-tools-wrap").addEventListener("click", () => {
		if (utilSettings.classList.contains("active")) {
			utilSettings.classList.remove("active")
		}
	})
	// make sure we close the settings pane when we click on chat
	document.querySelector("#chat-output-frame").addEventListener("click", () => {
		if (utilSettings.classList.contains("active")) {
			utilSettings.classList.remove("active")
		}
	})
	// append the button
	document.querySelector("#chat-settings-form").prepend(settingsButton)
	// another layer...
	let settingsAreaOuter = document.createElement("div")
	settingsAreaOuter.className = "chat-menu-inner"
	// create the toolbar
	let utilToolbar = document.createElement("div")
	utilToolbar.className = "toolbar"
	let utilToolbarInner = document.createElement("h5")
	let utilToolbarInnerTitle = document.createElement("span")
	utilToolbarInnerTitle.innerHTML = `DGG Everywhere v${
		chrome.runtime.getManifest().version
	}`
	utilToolbarInner.appendChild(utilToolbarInnerTitle)
	// create the toolbar close button
	let utilToolbarInnerClose = document.createElement("i")
	utilToolbarInnerClose.className = "chat-menu-close"
	// close the settings pane when clicking on the button
	utilToolbarInnerClose.addEventListener("click", () => {
		utilSettings.classList.remove("active")
	})
	utilToolbarInner.appendChild(utilToolbarInnerClose)
	utilToolbar.appendChild(utilToolbarInner)
	settingsAreaOuter.appendChild(utilToolbar)
	// combined nanoscroller layer
	let nano = document.createElement("div")
	nano.className = "scrollable nano has-scrollbar"
	nano.style.overflowY = "auto"
	settingsAreaOuter.appendChild(nano)
	// content layer
	let nanoContent = document.createElement("div")
	nanoContent.className = "content nano-content"
	nanoContent.tabIndex = "0"
	nanoContent.style = "right: -17px;"
	nano.appendChild(nanoContent)
	// finally, our settings area
	let settingsArea = document.createElement("div")
	settingsArea.id = "util-settings-form"
	nanoContent.appendChild(settingsArea)
	utilSettings.appendChild(settingsAreaOuter)

	// making an update check wrapper
	let updateCheckGroup = document.createElement("div")
	updateCheckGroup.id = "util-update-group"
	const updateCheckText = document.createElement("a")
	updateCheckText.role = "button"
	updateCheckText.textContent = "Check for updates"
	updateCheckGroup.append(updateCheckText)
	const updateDataFunc = (data) => {
		if (data) {
			if (data.version.slice(1) == chrome.runtime.getManifest().version) {
				updateCheckText.textContent = "You're up to date!"
				updateCheckText.classList.toggle("no-link", true)
				updateCheckText.style.color = "green"
				updateCheckText.removeEventListener("click", updateClickFunc)
				setTimeout(() => {
					updateCheckText.textContent = "Check for updates"
					updateCheckText.classList.toggle("no-link", false)
					updateCheckText.style.removeProperty("color")
					updateCheckText.addEventListener("click", updateClickFunc)
				}, 5000)
				return
			} else if (data.version.slice(1) > chrome.runtime.getManifest().version) {
				updateCheckText.href = data.link
				updateCheckText.target = "_blank"
				updateCheckText.textContent = `New version found (${data.version}), click to update`
				updateCheckText.style.color = "fuchsia"
				updateCheckText.removeEventListener("click", updateClickFunc)
			} else if (data.version.slice(1) < chrome.runtime.getManifest().version) {
				// `You're using a preview version (${chrome.runtime.getManifest().version}), please report any bugs to the github page`
				// a text saying that you're using a preview version and a link to the github issues page
				let githubLink = document.createElement("a")
				githubLink.href = "https://github.com/DannyAlas/DGG-Everywhere"
				githubLink.target = "_blank"
				githubLink.textContent = "github page"
				updateCheckText.textContent = `You're using a preview version (${
					chrome.runtime.getManifest().version
				}), please report any bugs to the `
				updateCheckText.classList.toggle("no-link", true)
				updateCheckText.appendChild(githubLink)
				updateCheckText.style.color = "#c94b44"
				updateCheckText.removeEventListener("click", updateClickFunc)
				setTimeout(() => {
					updateCheckText.textContent = "Check for updates"
					updateCheckText.classList.toggle("no-link", false)
					updateCheckText.style.removeProperty("color")
					updateCheckText.addEventListener("click", updateClickFunc)
				}, 5000)
			}
		} else {
			updateCheckText.textContent = "No updates found :)"
			updateCheckText.classList.toggle("no-link", true)
			updateCheckText.style.color = "green"
			updateCheckText.removeEventListener("click", updateClickFunc)
			setTimeout(() => {
				updateCheckText.textContent = "Check for updates"
				updateCheckText.classList.toggle("no-link", false)
				updateCheckText.style.removeProperty("color")
				updateCheckText.addEventListener("click", updateClickFunc)
			}, 5000)
		}
	}
	function updateCheck(callback) {
		// checks latest release on github
		bgFetch(
			"https://api.github.com/repos/DannyAlas/DGG-Everywhere/releases/latest"
		)
			.then((res) => {
				let data = res.data
				if (data.tag_name != null) {
					callback({
						version: data.tag_name,
						link: data.html_url,
					})
				} else {
					callback(null)
				}
			})
			.catch((error) => {
				console.error("Error:", error)
			})
	}

	const updateClickFunc = () => {
		updateCheck(updateDataFunc)
	}
	updateCheckText.addEventListener("click", updateClickFunc)
	settingsArea.appendChild(updateCheckGroup)

	let title = document.createElement("h4")
	title.innerHTML = `Utilities General Settings`
	// appending it to the settings menu
	settingsArea.appendChild(title)

	// creating an always scroll down setting
	let alwaysScrollDownGroup = document.createElement("div")
	alwaysScrollDownGroup.className = "form-group checkbox"
	let alwaysScrollDownLabel = document.createElement("label")
	alwaysScrollDownLabel.innerHTML = "Always scroll down chat on button press"
	alwaysScrollDownGroup.appendChild(alwaysScrollDownLabel)
	let alwaysScrollDownCheck = document.createElement("input")
	alwaysScrollDownCheck.name = "alwaysScrollDown"
	alwaysScrollDownCheck.type = "checkbox"
	alwaysScrollDownCheck.checked = config.alwaysScrollDown
	alwaysScrollDownCheck.addEventListener(
		"change",
		() => (config.alwaysScrollDown = alwaysScrollDownCheck.checked)
	)
	alwaysScrollDownLabel.prepend(alwaysScrollDownCheck)

	// isUsername checks if the given element is a username element (can be usernames in messages themselves or in the list of current users)
	function isUsername(element) {
		return (
			element.classList.contains("user") ||
			element.classList.contains("chat-user")
		)
	}

	function doubleClickCopyListener(event) {
		const target = event.target

		if (!isUsername(target)) {
			return
		}

		const username = target.text || target.textContent

		// if the chat input has some text, and the last character isn't already a space
		if (
			textarea.value.length > 0 &&
			textarea.value.charAt(textarea.value.length - 1) != " "
		) {
			textarea.value += " "
		}

		textarea.value += `${username} `
		textarea.focus()
	}

	// creating a double click to copy setting
	let doubleClickCopyGroup = document.createElement("div")
	doubleClickCopyGroup.className = "form-group checkbox"
	let doubleClickCopyLabel = document.createElement("label")
	doubleClickCopyLabel.innerHTML =
		"Double click username to append it to chat input"
	doubleClickCopyGroup.appendChild(doubleClickCopyLabel)
	let doubleClickCopyCheck = document.createElement("input")
	doubleClickCopyCheck.name = "doubleClickCopy"
	doubleClickCopyCheck.type = "checkbox"
	doubleClickCopyCheck.checked = config.doubleClickCopy
	doubleClickCopyCheck.addEventListener("change", () => {
		config.doubleClickCopy = doubleClickCopyCheck.checked
		window.removeEventListener("dblclick", doubleClickCopyListener)
		if (config.doubleClickCopy) {
			// if a username is double clicked copy it to the chat input
			window.addEventListener("dblclick", doubleClickCopyListener)
		}
	})
	if (config.doubleClickCopy) {
		// if a username is double clicked copy it to the chat input
		window.addEventListener("dblclick", doubleClickCopyListener)
	}
	doubleClickCopyLabel.prepend(doubleClickCopyCheck)

	// =============================================================
	// Icons and HTML elements for managing the DGG & embedded chats
	// =============================================================

	const DGG_CHAT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1960 1960" fill="currentColor" style="vertical-align: baseline; filter: drop-shadow(1px 1px 1px #000)">
    <g>
        <path d="M0 980 l0 -980 980 0 980 0 0 980 0 980 -980 0 -980 0 0 -980z m1810 615 l0 -185 -117 0 -116 0 -116 123 c-64 67 -142 150 -175 185 l-59 62 291 0 292 0 0 -185z m-597 -30 l187 -194 0 -402 0 -401 -184 -191 -183 -192 -437 -3 -436 -2 0 790 0 790 433 0 433 0 187 -195z m597 -1230 l0 -185 -292 0 -291 0 24 27 c13 15 91 98 173 185 l150 158 118 0 118 0 0 -185z"/>
        <path d="M670 980 l0 -550 65 0 65 0 0 550 0 550 -65 0 -65 0 0 -550z"/>
    </g>
</svg>
  `
	const TWITCH_CHAT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 21" fill="currentColor" style="vertical-align: baseline; filter: drop-shadow(1px 1px 1px #000)">
    <path d="M 5.8730469 2 C 5.5530469 2 5.2524531 2.1521094 5.0644531 2.4121094 L 2.1914062 6.375 C 2.0674063 6.546 2 6.7518906 2 6.9628906 L 2 19 C 2 19.552 2.448 20 3 20 L 7 20 L 7 22 C 7 22.552 7.448 23 8 23 L 9.5859375 23 C 9.8509375 23 10.104969 22.895031 10.292969 22.707031 L 12.707031 20.292969 C 12.894031 20.104969 13.149062 20 13.414062 20 L 16.585938 20 C 16.850938 20 17.104969 19.895031 17.292969 19.707031 L 21.707031 15.292969 C 21.895031 15.105969 22 14.850938 22 14.585938 L 22 3 C 22 2.448 21.552 2 21 2 L 5.8730469 2 z M 6 4 L 20 4 L 20 13 L 17 16 L 12 16 L 9 19 L 9 16 L 6 16 L 6 4 z M 12 7 C 11.448 7 11 7.448 11 8 L 11 11 C 11 11.552 11.448 12 12 12 C 12.552 12 13 11.552 13 11 L 13 8 C 13 7.448 12.552 7 12 7 z M 17 7 C 16.448 7 16 7.448 16 8 L 16 11 C 16 11.552 16.448 12 17 12 C 17.552 12 18 11.552 18 11 L 18 8 C 18 7.448 17.552 7 17 7 z"/>
</svg>
  `
	const YOUTUBE_CHAT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 4 26 22" fill="currentColor" style="vertical-align: baseline; filter: drop-shadow(1px 1px 1px #000)">
    <path d="M 15 4 C 10.814 4 5.3808594 5.0488281 5.3808594 5.0488281 L 5.3671875 5.0644531 C 3.4606632 5.3693645 2 7.0076245 2 9 L 2 15 L 2 15.001953 L 2 21 L 2 21.001953 A 4 4 0 0 0 5.3769531 24.945312 L 5.3808594 24.951172 C 5.3808594 24.951172 10.814 26.001953 15 26.001953 C 19.186 26.001953 24.619141 24.951172 24.619141 24.951172 L 24.621094 24.949219 A 4 4 0 0 0 28 21.001953 L 28 21 L 28 15.001953 L 28 15 L 28 9 A 4 4 0 0 0 24.623047 5.0546875 L 24.619141 5.0488281 C 24.619141 5.0488281 19.186 4 15 4 z M 12 10.398438 L 20 15 L 12 19.601562 L 12 10.398438 z"/>
</svg>
  `
	const RUMBLE_CHAT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 0 20 20" fill="currentColor" style="vertical-align: baseline; filter: drop-shadow(1px 1px 1px #000)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.165 11.292c.843-.617.843-1.809 0-2.442a19.617 19.617 0 00-3.922-2.308 1.624 1.624 0 00-1.419.053 1.54 1.54 0 00-.536.474 1.462 1.462 0 00-.254.656 18.136 18.136 0 00-.13 4.584c.023.233.104.458.234.656s.308.364.518.485a1.614 1.614 0 001.404.1 18.68 18.68 0 004.105-2.25v-.008zm6.304-4.5a4.617 4.617 0 011.393 3.276 4.614 4.614 0 01-1.376 3.282c-3.23 3.241-7.376 5.509-11.93 6.525a4.859 4.859 0 01-3.422-.425 4.53 4.53 0 01-2.187-2.558C.556 12.559.765 7.659 2.104 3.309A4.491 4.491 0 014.177.66 4.834 4.834 0 017.582.11c4.47.983 8.67 3.5 11.887 6.683z" />
</svg>
  `
	const KICK_CHAT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 5 20 22" fill="currentColor" style="vertical-align: baseline; filter: drop-shadow(1px 1px 1px #000)">
    <polygon fill-rule="evenodd" points="6.18 4.99 13.61 4.99 13.61 9.9 16 9.9 16 7.38 18.52 7.38 18.52 4.99 25.82 4.99 25.82 12.29 23.43 12.29 23.43 14.8 20.91 14.8 20.91 17.2 23.43 17.2 23.43 19.71 25.82 19.71 25.82 27.01 18.52 27.01 18.52 24.62 16 24.62 16 22.1 13.61 22.1 13.61 27.01 6.18 27.01 6.18 4.99"/>
</svg>
  `

	const EMBED_BUTTON_STYLE = {
		display: "flex",
		"justify-content": "center",
		"align-items": "center",

		height: "15px",
		width: "15px",

		"margin-right": "5px",
	}

	// const dggChatButton = document.createElement("a")
	// dggChatButton.id = "dgg-chat-btn"
	// dggChatButton.addEventListener("click", handleDGGChatButtonClick)
	// Object.assign(dggChatButton.style, EMBED_BUTTON_STYLE)
	// dggChatButton.innerHTML = DGG_CHAT_ICON

	// const twitchChatButton = document.createElement("a")
	// twitchChatButton.id = "twitch-chat-btn"
	// twitchChatButton.addEventListener("click", handleTwitchChatButtonClick)
	// Object.assign(twitchChatButton.style, EMBED_BUTTON_STYLE)
	// twitchChatButton.innerHTML = TWITCH_CHAT_ICON

	// const youtubeChatButton = document.createElement("a")
	// youtubeChatButton.id = "yt-chat-btn"
	// youtubeChatButton.addEventListener("click", handleYoutubeChatButtonClick)
	// Object.assign(youtubeChatButton.style, EMBED_BUTTON_STYLE)
	// youtubeChatButton.innerHTML = YOUTUBE_CHAT_ICON

	// const rumbleChatButton = document.createElement("a")
	// rumbleChatButton.id = "rumble-chat-btn"
	// rumbleChatButton.addEventListener("click", handleRumbleChatButtonClick)
	// Object.assign(rumbleChatButton.style, EMBED_BUTTON_STYLE)
	// rumbleChatButton.innerHTML = RUMBLE_CHAT_ICON

	// const embedChatButtonsContainer = document.createElement("div")
	// embedChatButtonsContainer.id = "embed-chat-btns-container"
	// embedChatButtonsContainer.className += "float-start"
	// Object.assign(embedChatButtonsContainer.style, {
	// 	display: "flex",
	// 	"flex-direction": "row",
	// 	"justify-content": "center",
	// 	"align-items": "center",

	// 	height: "100%",

	// 	color: "#444444",
	// })
	// embedChatButtonsContainer.appendChild(dggChatButton)
	// embedChatButtonsContainer.appendChild(twitchChatButton)
	// embedChatButtonsContainer.appendChild(youtubeChatButton)
	// embedChatButtonsContainer.appendChild(rumbleChatButton)

	// =========================================
	// Functions for managing the embedded chats
	// =========================================

	const YOUTUBE_EMBED_RE = /^#youtube\/(.*)$/
	const TWITCH_EMBED_RE = /^#twitch\/(.*)$/
	const RUMBLE_EMBED_RE = /^#rumble\/(.*)$/

	const STORAGE_STREAM_INFO_KEY = "dggApi:streamInfo"
	const STORAGE_HOST_INFO_KEY = "dggApi:hosting"

	let dggChatIFrame = getDGGChatIFrame()

	let embedChatIFrame
	let embedChatActive = false

	// function getYoutubeEmbedId() {
	// 	const match = YOUTUBE_EMBED_RE.exec(window.parent.location.hash)
	// 	return match ? match[1] : null
	// }
	// function getTwitchEmbedId() {
	// 	const match = TWITCH_EMBED_RE.exec(window.parent.location.hash)
	// 	return match ? match[1] : null
	// }
	// function getRumbleEmbedId() {
	// 	const match = RUMBLE_EMBED_RE.exec(window.parent.location.hash)
	// 	return match ? match[1] : null
	// }

	// function getYoutubeHostId() {
	// 	const hostInfo = JSON.parse(localStorage.getItem(STORAGE_HOST_INFO_KEY))
	// 	return hostInfo?.platform === "youtube" ? hostInfo.id : null
	// }
	// function getTwitchHostId() {
	// 	const hostInfo = JSON.parse(localStorage.getItem(STORAGE_HOST_INFO_KEY))
	// 	return hostInfo?.platform === "twitch" ? hostInfo.id : null
	// }
	// function getRumbleHostId() {
	// 	const hostInfo = JSON.parse(localStorage.getItem(STORAGE_HOST_INFO_KEY))
	// 	return hostInfo?.platform === "rumble" ? hostInfo.id : null
	// }

	// function getYoutubeLiveId() {
	// 	const streamInfo = JSON.parse(localStorage.getItem(STORAGE_STREAM_INFO_KEY))
	// 	return streamInfo?.streams?.youtube?.id
	// }
	// // Copium
	// function getTwitchLiveId() {
	// 	const streamInfo = JSON.parse(localStorage.getItem(STORAGE_STREAM_INFO_KEY))
	// 	return streamInfo?.streams?.twitch?.id
	// }
	// function getRumbleLiveId() {
	// 	const streamInfo = JSON.parse(localStorage.getItem(STORAGE_STREAM_INFO_KEY))
	// 	return streamInfo?.streams?.rumble?.id
	// }

	// function getTwitchChatURL() {
	// 	const twitchEmbedId =
	// 		getTwitchEmbedId() || getTwitchLiveId() || getTwitchHostId()
	// 	return twitchEmbedId
	// 		? `https://www.twitch.tv/embed/${twitchEmbedId}/chat?parent=www.destiny.gg&darkpopout`
	// 		: null
	// }
	// function getYoutubeChatURL() {
	// 	// if the user is embedding a video while the stream is live, the embedded id will be favored
	// 	const youtubeEmbedId =
	// 		getYoutubeEmbedId() || getYoutubeLiveId() || getYoutubeHostId()
	// 	return youtubeEmbedId
	// 		? `https://www.youtube.com/live_chat?v=${youtubeEmbedId}&embed_domain=www.destiny.gg`
	// 		: null
	// }
	// function getRumbleChatURL() {
	// 	// if the user is embedding a video while the stream is live, the embedded id will be favored
	// 	let rumbleEmbedId =
	// 		getRumbleEmbedId() || getRumbleLiveId() || getRumbleHostId()
	// 	if (!rumbleEmbedId) return null
	// 	// remove the 'v' prefix if present, as it's technically not a part of the rumble embed's id
	// 	if (rumbleEmbedId[0] === "v") {
	// 		rumbleEmbedId = rumbleEmbedId.slice(1)
	// 	}

	// 	// a rumble stream's chat id is the base 10 representation of the embed id (which itself is base 36)
	// 	const chatId = parseInt(rumbleEmbedId, 36)
	// 	return Number.isInteger(chatId)
	// 		? `https://rumble.com/chat/popup/${chatId}`
	// 		: null
	// }

	// /**
	//  * updateEmbedChatButtons checks to see what's live or embedded, and adds/removes the corresponding embed chat buttons.
	//  * Should be called whenever there's an update that could affect what should be embeddable.
	//  */
	// function updateEmbedChatButtons() {
	// 	// dggChatButton.style.display = embedChatActive ? 'flex' : 'none';
	// 	twitchChatButton.style.display = getTwitchChatURL() ? "flex" : "none"
	// 	youtubeChatButton.style.display = getYoutubeChatURL() ? "flex" : "none"
	// 	rumbleChatButton.style.display = getRumbleChatURL() ? "flex" : "none"
	// }

	// // observer which responds to changes to the embedded stream iframe, and triggers an update of the embedded chat buttons
	// const embeddedStreamObserver = new MutationObserver((mutations, observer) => {
	// 	for (const mutation of mutations) {
	// 		if (
	// 			Array.from(mutation.addedNodes.values()).some(
	// 				(elem) => elem.nodeName === "IFRAME"
	// 			) ||
	// 			Array.from(mutation.removedNodes.values()).some(
	// 				(elem) => elem.nodeName === "IFRAME"
	// 			) ||
	// 			mutation.attributeName === "src"
	// 		) {
	// 			updateEmbedChatButtons()
	// 		}
	// 	}
	// })

	// function deactivateEmbedChat() {
	// 	embedChatActive = false

	// 	embedChatIFrame.style.display = "none"
	// 	dggChatIFrame.style.display = "block"

	// 	updateEmbedChatButtons()
	// }

	// function activateEmbedChat(embedChatURL) {
	// 	embedChatActive = true

	// 	// only update the src attribute if it has changed to avoid unnecessary refresh
	// 	if (embedChatIFrame.getAttribute("src") !== embedChatURL) {
	// 		embedChatIFrame.setAttribute("src", embedChatURL)
	// 	}

	// 	dggChatIFrame.style.display = "none"
	// 	embedChatIFrame.style.display = "block"

	// 	updateEmbedChatButtons()
	// }

	// function handleDGGChatButtonClick() {
	// 	deactivateEmbedChat()
	// }
	// function handleTwitchChatButtonClick() {
	// 	const twitchChatURL = getTwitchChatURL()
	// 	if (twitchChatURL != null) {
	// 		activateEmbedChat(twitchChatURL)
	// 	}
	// }
	// function handleYoutubeChatButtonClick() {
	// 	const youtubeChatURL = getYoutubeChatURL()
	// 	if (youtubeChatURL != null) {
	// 		activateEmbedChat(youtubeChatURL)
	// 	}
	// }
	// function handleRumbleChatButtonClick() {
	// 	const rumbleChatURL = getRumbleChatURL()
	// 	if (rumbleChatURL != null) {
	// 		activateEmbedChat(rumbleChatURL)
	// 	}
	// }
	// =========================================================================================
	// Logic for the embedded chat settings, and functions for enabling or disabling the feature
	// =========================================================================================

	// function addEmbedChatToggleBtn() {
	// 	// TODO: make this work with other embeds, like yt
	// 	// if (livePill == undefined) {
	// 	// 	return
	// 	// }

	// 	if (window.parent.document.getElementById("embed-chat-iframe")) {
	// 		removeEmbedChatToggleBtn()
	// 	}

	// 	// add the iframe for the embedded chat
	// 	embedChatIFrame = document.createElement("iframe")
	// 	embedChatIFrame.id = "embed-chat-iframe"
	// 	embedChatIFrame.style.display = "none"
	// 	embedChatIFrame.setAttribute("seamless", "seamless")
	// 	dggChatIFrame.parentNode.appendChild(embedChatIFrame)

	// 	window.parent.document
	// 		.getElementById("chat-panel-tools")
	// 		.insertBefore(
	// 			embedChatButtonsContainer,
	// 			window.parent.document.getElementById("refresh").nextSibling
	// 		)

	// 	updateEmbedChatButtons()

	// 	// The height styling of the DGG chat's input element will be messed up if the DGG chat isn't visible when the chat's iframe is refreshed
	// 	// https://github.com/destinygg/chat-gui/blob/78910027663171870a314cc3ab3c066334b72326/assets/chat/js/chat.js#L889
	// 	// So, show the DGG chat before refreshing the iframe
	// 	window.parent.document
	// 		.getElementById("refresh")
	// 		.addEventListener("click", deactivateEmbedChat)

	// 	// observe any changes to the embedded stream iframe (additions or removals of the iframe or modifications to the 'src' attribute)
	// 	embeddedStreamObserver.observe(
	// 		window.parent.document.getElementById("embed"),
	// 		{ childList: true, attributes: true, attributeFilter: ["src"] }
	// 	)
	// 	// listen for any storage change events, particularly to the two localStorage keys which indicate the current live stream or hosted stream
	// 	window.addEventListener("storage", (event) => {
	// 		if (
	// 			event.key === STORAGE_STREAM_INFO_KEY ||
	// 			event.key === STORAGE_HOST_INFO_KEY
	// 		) {
	// 			updateEmbedChatButtons()
	// 		}
	// 	})
	// }

	// function removeEmbedChatToggleBtn() {
	// 	// if (livePill == undefined) {
	// 	// 	return
	// 	// }

	// 	dggChatIFrame.style.display = "block"
	// 	window.parent.document.getElementById("embed-chat-btns-container").remove()
	// 	window.parent.document.getElementById("embed-chat-iframe").remove()

	// 	window.parent.document
	// 		.getElementById("refresh")
	// 		.removeEventListener("click", deactivateEmbedChat)

	// 	embeddedStreamObserver.disconnect()
	// }

	// // create a setting to enable the link to switch the embed chat
	// let embedChatGroup = document.createElement("div")
	// embedChatGroup.className = "form-group checkbox"
	// let embedChatLabel = document.createElement("label")
	// embedChatLabel.innerHTML =
	// 	"Add button to toggle to the currently embedded video's chat"
	// embedChatGroup.appendChild(embedChatLabel)
	// let embedChatCheck = document.createElement("input")
	// embedChatCheck.name = "doubleClickCopy"
	// embedChatCheck.type = "checkbox"
	// embedChatCheck.checked = config.embedChat
	// embedChatCheck.addEventListener("change", () => {
	// 	config.embedChat = embedChatCheck.checked
	// 	if (config.embedChat) {
	// 		addEmbedChatToggleBtn()
	// 	} else {
	// 		removeEmbedChatToggleBtn()
	// 	}
	// })
	// if (config.embedChat) {
	// 	addEmbedChatToggleBtn()
	// }
	// embedChatLabel.prepend(embedChatCheck)

	let ogtitle = undefined
	try {
		ogtitle = window.parent.document.title
	} catch (e) {
		// TODO use bg to fix this
		console.log(
			"%c[DGG] [Warning] %cRunning in an iframe, no title to change",
			"color: #538CC6",
			"color: ##c9c944"
		)
	}

	let checkLive = (node) => {
		if (node.textContent === "LIVE") {
			if (!window.parent.document.title.includes("LIVE")) {
				ogtitle = window.parent.document.title
				window.parent.document.title = `LIVE - ${ogtitle}`
			}
		} else {
			window.parent.document.title = ogtitle
		}
	}
	let livePill = document.querySelector("#host-pill-text")
	// make an observer that checks for steve going live
	let liveObserver = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			for (let node of mutation.addedNodes) {
				if (livePill != undefined) {
					checkLive(node)
				}
			}
		}
	})

	// creating a change title on live setting
	let changeTitleOnLiveGroup = document.createElement("div")
	changeTitleOnLiveGroup.className = "form-group checkbox"
	let changeTitleOnLiveLabel = document.createElement("label")
	changeTitleOnLiveLabel.innerHTML = "Change tab title when Destiny is live"
	changeTitleOnLiveGroup.appendChild(changeTitleOnLiveLabel)
	let changeTitleOnLiveCheck = document.createElement("input")
	changeTitleOnLiveCheck.name = "changeTitleOnLive"
	changeTitleOnLiveCheck.type = "checkbox"
	changeTitleOnLiveCheck.checked = config.changeTitleOnLive
	changeTitleOnLiveCheck.addEventListener("change", () => {
		config.changeTitleOnLive = changeTitleOnLiveCheck.checked
		if (config.changeTitleOnLive && livePill != undefined) {
			liveObserver.observe(livePill, {
				childList: true,
			})
		} else {
			liveObserver.disconnect()
		}
	})
	if (config.changeTitleOnLive && livePill != undefined) {
		liveObserver.observe(livePill, {
			childList: true,
		})
	} else {
		liveObserver.disconnect()
	}
	if (config.changeTitleOnLive && livePill != undefined) {
		checkLive(livePill)
	}
	changeTitleOnLiveLabel.prepend(changeTitleOnLiveCheck)

	// creating an embed icon selector setting
	let embedIconStyleGroup = document.createElement("div")
	embedIconStyleGroup.className = "form-group"
	let embedIconStyleLabel = document.createElement("label")
	embedIconStyleLabel.innerHTML = "Embed Button Style"
	embedIconStyleLabel.title = "Select how the embed button looks"
	embedIconStyleLabel.htmlFor = "embedIconStyleSelect"
	embedIconStyleGroup.appendChild(embedIconStyleLabel)
	let embedIconStyleSelect = document.createElement("select")
	embedIconStyleSelect.id = "embedIconStyleSelect"
	embedIconStyleSelect.name = "embedIconStyleSelect"
	embedIconStyleSelect.className = "form-control"

	let embedIconStyleOption1 = document.createElement("option")
	embedIconStyleOption1.value = 1
	embedIconStyleOption1.innerHTML = "SVG icon"
	embedIconStyleSelect.appendChild(embedIconStyleOption1)

	let embedIconStyleOption2 = document.createElement("option")
	embedIconStyleOption2.value = 2
	embedIconStyleOption2.innerHTML = "Original movie clapper"
	embedIconStyleSelect.appendChild(embedIconStyleOption2)

	let embedIconStyleOption3 = document.createElement("option")
	embedIconStyleOption3.value = 3
	embedIconStyleOption3.innerHTML = "Movie clapper with 0 saturation"
	embedIconStyleSelect.appendChild(embedIconStyleOption3)

	let embedIconStyleOption4 = document.createElement("option")
	embedIconStyleOption4.value = 4
	embedIconStyleOption4.innerHTML = "Movie clapper outline"
	embedIconStyleSelect.appendChild(embedIconStyleOption4)

	embedIconStyleSelect.value = config.embedIconStyle
	embedIconStyleSelect.addEventListener("change", () => {
		config.embedIconStyle = parseInt(embedIconStyleSelect.value)
		switch (config.embedIconStyle) {
		case 1:
			embedsButton_i.innerHTML = ""
			embedsButton_i.style.backgroundImage = `url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg width='25' height='25' viewBox='-25 -10 150 150' version='1.1' id='svg5' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cdefs id='defs2' /%3E%3Cpath style='opacity:1;fill:%23ffffff;fill-opacity:1;stroke-width:0.406658' d='m 92.631299,98.472455 c 0,3.664485 -3.18611,6.614595 -7.14375,6.614595 H 10.399791 c -3.9576372,0 -7.0776042,-3.01626 -7.0776042,-6.680745 0,-8.21058 0.06729,-51.199364 0.06729,-57.368996 L 92.635479,40.896992' id='lower' /%3E%3Crect style='opacity:1;fill:%23ffffff;fill-opacity:1;stroke-width:0.334081' id='upper' width='89.762489' height='14.542242' x='-6.0129457' y='22.639624' transform='matrix(0.96526009,-0.26129094,0.25636721,0.96657946,0,0)' /%3E%3C/svg%3E%0A")`
			break

		case 2:
			embedsButton_i.innerHTML = "🎬"
			embedsButton_i.style.backgroundImage = "none"
			embedsButton_i.style.filter = ""
			embedsButton_i.style.color = ""
			embedsButton_i.style.textShadow = ""
			break

		case 3:
			embedsButton_i.innerHTML = "🎬"
			embedsButton_i.style.backgroundImage = ""
			embedsButton_i.style.filter = "saturate(0)"
			embedsButton_i.style.color = ""
			embedsButton_i.style.textShadow = ""
			break

		case 4:
			embedsButton_i.innerHTML = "🎬"
			embedsButton_i.style.backgroundImage = ""
			embedsButton_i.style.filter = ""
			embedsButton_i.style.color = "transparent"
			embedsButton_i.style.textShadow = "0 0 white"
			break
		}
	})

	embedIconStyleGroup.appendChild(embedIconStyleSelect)

	// creating a show last steve vod setting
	let showLastVODGroup = document.createElement("div")
	showLastVODGroup.className = "form-group checkbox"
	let showLastVODLabel = document.createElement("label")
	showLastVODLabel.innerHTML = "Show Destiny's last vod when you check embeds"
	showLastVODGroup.appendChild(showLastVODLabel)
	let showLastVODCheck = document.createElement("input")
	showLastVODCheck.name = "showLastVOD"
	showLastVODCheck.type = "checkbox"
	showLastVODCheck.checked = config.showLastVOD
	showLastVODCheck.addEventListener(
		"change",
		() => (config.showLastVOD = showLastVODCheck.checked)
	)
	showLastVODLabel.prepend(showLastVODCheck)

	// creating a show embeds on connect setting
	let embedsOnLaunchGroup = document.createElement("div")
	embedsOnLaunchGroup.className = "form-group checkbox"
	let embedsOnLaunchLabel = document.createElement("label")
	embedsOnLaunchLabel.innerHTML = "Automatically show embeds on chat connect"
	embedsOnLaunchGroup.appendChild(embedsOnLaunchLabel)
	let embedsOnLaunchCheck = document.createElement("input")
	embedsOnLaunchCheck.name = "embedsOnLaunch"
	embedsOnLaunchCheck.type = "checkbox"
	embedsOnLaunchCheck.checked = config.embedsOnLaunch
	embedsOnLaunchCheck.addEventListener(
		"change",
		() => (config.embedsOnLaunch = embedsOnLaunchCheck.checked)
	)
	embedsOnLaunchLabel.prepend(embedsOnLaunchCheck)

	// creating a latest embeds value setting
	let lastEmbedsGroup = document.createElement("div")
	lastEmbedsGroup.className = "form-group checkbox"
	let lastEmbedsLabel = document.createElement("label")
	lastEmbedsLabel.innerHTML = "Show 5 latest embeds, instead of top 5"
	lastEmbedsGroup.appendChild(lastEmbedsLabel)
	let lastEmbedsCheck = document.createElement("input")
	lastEmbedsCheck.name = "lastEmbeds"
	lastEmbedsCheck.type = "checkbox"
	lastEmbedsCheck.checked = config.lastEmbeds
	lastEmbedsCheck.addEventListener(
		"change",
		() => (config.lastEmbeds = lastEmbedsCheck.checked)
	)
	lastEmbedsLabel.prepend(lastEmbedsCheck)

	// creating a show last embeds if none in x minutes setting
	let lastIfNoneGroup = document.createElement("div")
	lastIfNoneGroup.className = "form-group checkbox"
	let lastIfNoneLabel = document.createElement("label")
	lastIfNoneLabel.innerHTML =
		"Show 5 latest embeds if no one embedded anything recently"
	lastIfNoneGroup.appendChild(lastIfNoneLabel)
	let lastIfNoneCheck = document.createElement("input")
	lastIfNoneCheck.name = "lastIfNone"
	lastIfNoneCheck.type = "checkbox"
	lastIfNoneCheck.checked = config.lastIfNone
	lastIfNoneCheck.addEventListener(
		"change",
		() => (config.lastIfNone = lastIfNoneCheck.checked)
	)
	lastIfNoneLabel.prepend(lastIfNoneCheck)

	// creating an embed time value setting
	let embedTimeGroup = document.createElement("div")
	embedTimeGroup.className = "form-group row"
	let embedTimeLabel = document.createElement("label")
	embedTimeLabel.innerHTML = "Embed Time Span"
	embedTimeLabel.title =
		"Show embeds from the last amount of minutes that this is set to"
	embedTimeLabel.style.marginBottom = 0
	embedTimeGroup.appendChild(embedTimeLabel)
	let embedTimeArea = document.createElement("input")
	embedTimeArea.name = "embedTimeArea"
	embedTimeArea.type = "number"
	embedTimeArea.className = "form-control"
	embedTimeArea.max = 60
	embedTimeArea.min = 5
	embedTimeArea.placeholder = "5 to 60 minutes"
	embedTimeArea.value = config.embedTime
	embedTimeArea.style.width = "120px"
	embedTimeArea.style.marginLeft = ".6em"
	embedTimeArea.addEventListener(
		"change",
		() => (config.embedTime = embedTimeArea.value)
	)
	embedTimeGroup.appendChild(embedTimeArea)

	// creating an twitch embed formatting setting
	let twitchEmbedFormatGroup = document.createElement("div")
	twitchEmbedFormatGroup.className = "form-group"
	let twitchEmbedFormatLabel = document.createElement("label")
	twitchEmbedFormatLabel.innerHTML = "Twitch Embed Formatting"
	twitchEmbedFormatLabel.title = "Select how to format the Twitch embeds"
	twitchEmbedFormatLabel.htmlFor = "embedFormatSelect"
	twitchEmbedFormatGroup.appendChild(twitchEmbedFormatLabel)
	let twitchEmbedFormatSelect = document.createElement("select")
	twitchEmbedFormatSelect.id = "embedFormatSelect"
	twitchEmbedFormatSelect.name = "embedFormatSelect"
	twitchEmbedFormatSelect.className = "form-control"

	let twitchEmbedFormatOption1 = document.createElement("option")
	twitchEmbedFormatOption1.value = 1
	twitchEmbedFormatOption1.innerHTML = "#twitch/xqcow"
	twitchEmbedFormatSelect.appendChild(twitchEmbedFormatOption1)

	let twitchEmbedFormatOption2 = document.createElement("option")
	twitchEmbedFormatOption2.value = 2
	twitchEmbedFormatOption2.innerHTML =
		"#twitch/xqcow (BEST ONE ONLY TOP CRAZED ALWAYS TODAY OK MAYBE YES RIGHT NOW...)"
	twitchEmbedFormatSelect.appendChild(twitchEmbedFormatOption2)

	twitchEmbedFormatSelect.value = config.twitchEmbedFormat
	twitchEmbedFormatSelect.addEventListener(
		"change",
		() => (config.twitchEmbedFormat = parseInt(twitchEmbedFormatSelect.value))
	)

	twitchEmbedFormatGroup.appendChild(twitchEmbedFormatSelect)

	// creating an yt embed formatting setting
	let youtubeEmbedFormatGroup = document.createElement("div")
	youtubeEmbedFormatGroup.className = "form-group"
	let youtubeEmbedFormatLabel = document.createElement("label")
	youtubeEmbedFormatLabel.innerHTML = "YouTube Embed Formatting"
	youtubeEmbedFormatLabel.title = "Select how to format the YouTube embeds"
	youtubeEmbedFormatLabel.htmlFor = "embedFormatSelect"
	youtubeEmbedFormatGroup.appendChild(youtubeEmbedFormatLabel)
	let youtubeEmbedFormatSelect = document.createElement("select")
	youtubeEmbedFormatSelect.id = "embedFormatSelect"
	youtubeEmbedFormatSelect.name = "embedFormatSelect"
	youtubeEmbedFormatSelect.className = "form-control"

	let youtubeEmbedFormatOption1 = document.createElement("option")
	youtubeEmbedFormatOption1.value = 1
	youtubeEmbedFormatOption1.innerHTML = "#youtube/6RQA9GZprqM"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption1)

	let youtubeEmbedFormatOption2 = document.createElement("option")
	youtubeEmbedFormatOption2.value = 2
	youtubeEmbedFormatOption2.innerHTML = "#youtube/6RQA9GZprqM (Destiny)"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption2)

	let youtubeEmbedFormatOption3 = document.createElement("option")
	youtubeEmbedFormatOption3.value = 3
	youtubeEmbedFormatOption3.innerHTML =
		"#youtube/6RQA9GZprqM (Debating JonTron)"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption3)

	let youtubeEmbedFormatOption4 = document.createElement("option")
	youtubeEmbedFormatOption4.value = 4
	youtubeEmbedFormatOption4.innerHTML = "#youtube/Destiny"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption4)

	let youtubeEmbedFormatOption5 = document.createElement("option")
	youtubeEmbedFormatOption5.value = 5
	youtubeEmbedFormatOption5.innerHTML = "#youtube/Debating JonTron"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption5)

	let youtubeEmbedFormatOption6 = document.createElement("option")
	youtubeEmbedFormatOption6.value = 6
	youtubeEmbedFormatOption6.innerHTML = "#youtube/Destiny (Debating JonTron)"
	youtubeEmbedFormatSelect.appendChild(youtubeEmbedFormatOption6)

	youtubeEmbedFormatSelect.value = config.youtubeEmbedFormat
	youtubeEmbedFormatSelect.addEventListener(
		"change",
		() => (config.youtubeEmbedFormat = parseInt(youtubeEmbedFormatSelect.value))
	)

	youtubeEmbedFormatGroup.appendChild(youtubeEmbedFormatSelect)

	// creating a rumble embed formatting setting
	let rumbleEmbedFormatGroup = document.createElement("div")
	rumbleEmbedFormatGroup.className = "form-group"
	let rumbleEmbedFormatLabel = document.createElement("label")
	rumbleEmbedFormatLabel.innerHTML = "Rumble Embed Formatting"
	rumbleEmbedFormatLabel.title = "Select how to format the Rumble embeds"
	rumbleEmbedFormatLabel.htmlFor = "embedFormatSelect"
	rumbleEmbedFormatGroup.appendChild(rumbleEmbedFormatLabel)
	let rumbleEmbedFormatSelect = document.createElement("select")
	rumbleEmbedFormatSelect.id = "embedFormatSelect"
	rumbleEmbedFormatSelect.name = "embedFormatSelect"
	rumbleEmbedFormatSelect.className = "form-control"

	let rumbleEmbedFormatOption1 = document.createElement("option")
	rumbleEmbedFormatOption1.value = 1
	rumbleEmbedFormatOption1.innerHTML = "#rumble/v2hlgvk"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption1)

	let rumbleEmbedFormatOption2 = document.createElement("option")
	rumbleEmbedFormatOption2.value = 2
	rumbleEmbedFormatOption2.innerHTML = "#rumble/v2hlgvk (Destiny)"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption2)

	let rumbleEmbedFormatOption3 = document.createElement("option")
	rumbleEmbedFormatOption3.value = 3
	rumbleEmbedFormatOption3.innerHTML =
		"#rumble/v2hlgvk (Streamin' and memein' today)"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption3)

	let rumbleEmbedFormatOption4 = document.createElement("option")
	rumbleEmbedFormatOption4.value = 4
	rumbleEmbedFormatOption4.innerHTML = "#rumble/Destiny"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption4)

	let rumbleEmbedFormatOption5 = document.createElement("option")
	rumbleEmbedFormatOption5.value = 5
	rumbleEmbedFormatOption5.innerHTML = "#rumble/Streamin' and memein' today"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption5)

	let rumbleEmbedFormatOption6 = document.createElement("option")
	rumbleEmbedFormatOption6.value = 6
	rumbleEmbedFormatOption6.innerHTML =
		"#rumble/Destiny (Streamin' and memein' today)"
	rumbleEmbedFormatSelect.appendChild(rumbleEmbedFormatOption6)

	rumbleEmbedFormatSelect.value = config.rumbleEmbedFormat
	rumbleEmbedFormatSelect.addEventListener(
		"change",
		() => (config.rumbleEmbedFormat = parseInt(rumbleEmbedFormatSelect.value))
	)

	rumbleEmbedFormatGroup.appendChild(rumbleEmbedFormatSelect)

	// creating an phrase textarea color setting
	let phraseColorGroup = document.createElement("div")
	phraseColorGroup.className = "form-group row"
	let phraseColorLabel = document.createElement("label")
	phraseColorLabel.innerHTML = "Text area color on banned phrase"
	phraseColorLabel.title =
		"The color that text area changes when you type a banned phrase"
	phraseColorLabel.style.marginBottom = 0
	phraseColorGroup.appendChild(phraseColorLabel)
	let phraseColorArea = document.createElement("input")
	phraseColorArea.name = "phraseColorArea"
	phraseColorArea.type = "text"
	phraseColorArea.className = "form-control"
	phraseColorArea.placeholder = configItems.phraseColor.defaultValue
	phraseColorArea.value = config.phraseColor
	phraseColorArea.style.marginLeft = ".6em"
	phraseColorArea.style.width = "60px"
	phraseColorArea.style.backgroundColor = `#${config.phraseColor}`
	phraseColorArea.addEventListener("change", () => {
		if (phraseColorArea.value.length > 0) {
			config.phraseColor = phraseColorArea.value
			phraseColorArea.style.backgroundColor = `#${config.phraseColor}`
		} else {
			config.phraseColor = configItems.phraseColor.defaultValue
		}
	})
	phraseColorGroup.appendChild(phraseColorArea)

	// creating an nuke textarea color setting
	let nukeColorGroup = document.createElement("div")
	nukeColorGroup.className = "form-group row"
	let nukeColorLabel = document.createElement("label")
	nukeColorLabel.innerHTML = "Text area color on nuked phrase"
	nukeColorLabel.title =
		"The color that text area changes when you type a nuked phrase"
	nukeColorLabel.style.marginBottom = 0
	nukeColorGroup.appendChild(nukeColorLabel)
	let nukeColorArea = document.createElement("input")
	nukeColorArea.name = "nukeColorArea"
	nukeColorArea.type = "text"
	nukeColorArea.className = "form-control"
	nukeColorArea.placeholder = configItems.nukeColor.defaultValue
	nukeColorArea.value = config.nukeColor
	nukeColorArea.style.marginLeft = ".6em"
	nukeColorArea.style.width = "60px"
	nukeColorArea.style.backgroundColor = `#${config.nukeColor}`
	nukeColorArea.addEventListener("change", () => {
		if (nukeColorArea.value.length > 0) {
			config.nukeColor = nukeColorArea.value
			nukeColorArea.style.backgroundColor = `#${config.nukeColor}`
		} else {
			config.nukeColor = configItems.nukeColor.defaultValue
		}
	})
	nukeColorGroup.appendChild(nukeColorArea)

	// creating a setting to color the textarea if mutelinks is on and you typed a link
	let colorOnMutelinksGroup = document.createElement("div")
	colorOnMutelinksGroup.className = "form-group checkbox"
	let colorOnMutelinksLabel = document.createElement("label")
	colorOnMutelinksLabel.innerHTML =
		"Color the text area if you type a link when mutelinks is on (not every link gets detected)"
	colorOnMutelinksLabel.title =
		"Keep in mind that it doesn't detect every single possible link, so be careful anyway"
	colorOnMutelinksGroup.appendChild(colorOnMutelinksLabel)
	let colorOnMutelinksCheck = document.createElement("input")
	colorOnMutelinksCheck.name = "colorOnMutelinks"
	colorOnMutelinksCheck.type = "checkbox"
	colorOnMutelinksCheck.checked = config.colorOnMutelinks
	colorOnMutelinksCheck.addEventListener(
		"change",
		() => (config.colorOnMutelinks = colorOnMutelinksCheck.checked)
	)
	colorOnMutelinksLabel.prepend(colorOnMutelinksCheck)

	// creating an phrase textarea color setting
	let mutelinksColorGroup = document.createElement("div")
	mutelinksColorGroup.className = "form-group row"
	let mutelinksColorLabel = document.createElement("label")
	mutelinksColorLabel.innerHTML = "Text area color when mutelinks is on"
	mutelinksColorLabel.title =
		"The color that text area changes when mutelinks is on"
	mutelinksColorLabel.style.marginBottom = 0
	mutelinksColorGroup.appendChild(mutelinksColorLabel)
	let mutelinksColorArea = document.createElement("input")
	mutelinksColorArea.name = "mutelinksColorArea"
	mutelinksColorArea.type = "text"
	mutelinksColorArea.className = "form-control"
	mutelinksColorArea.placeholder = configItems.mutelinksColor.defaultValue
	mutelinksColorArea.value = config.mutelinksColor
	mutelinksColorArea.style.marginLeft = ".6em"
	mutelinksColorArea.style.width = "60px"
	mutelinksColorArea.style.backgroundColor = `#${config.mutelinksColor}`
	mutelinksColorArea.addEventListener("change", () => {
		if (mutelinksColorArea.value.length > 0) {
			config.mutelinksColor = mutelinksColorArea.value
			mutelinksColorArea.style.backgroundColor = `#${config.mutelinksColor}`
		} else {
			config.mutelinksColor = configItems.mutelinksColor.defaultValue
		}
	})
	mutelinksColorGroup.appendChild(mutelinksColorArea)

	// creating a custom phrases setting
	let customPhrasesGroup = document.createElement("div")
	customPhrasesGroup.className = "form-group row"
	let customPhrasesLabel = document.createElement("label")
	customPhrasesLabel.innerHTML = "Custom Alert Phrases"
	customPhrasesLabel.title =
		"Phrases that will color the input area red if you type them in"
	customPhrasesGroup.appendChild(customPhrasesLabel)
	let customPhrasesArea = document.createElement("textarea")
	customPhrasesArea.style.resize = "vertical"
	customPhrasesArea.className = "form-control"
	customPhrasesArea.placeholder = "Comma separated ... (regex not supported)"
	customPhrasesArea.value =
		config.customPhrases == "[]" ? "" : config.customPhrases
	customPhrasesArea.addEventListener("change", () => {
		let val = customPhrasesArea.value.split(",")
		if (customPhrasesArea.value.length > 0) {
			config.customPhrases = val
		} else {
			config.customPhrases = configItems.customPhrases.defaultValue
		}
	})
	customPhrasesGroup.appendChild(customPhrasesArea)

	// creating a custom soft phrases setting
	let customPhrasesSoftGroup = document.createElement("div")
	customPhrasesSoftGroup.className = "form-group row"
	let customPhrasesSoftLabel = document.createElement("label")
	customPhrasesSoftLabel.innerHTML = "Custom Soft Alert Phrases"
	customPhrasesSoftLabel.title =
		"Phrases that will color the input area red if you type them in (exact match)"
	customPhrasesSoftGroup.appendChild(customPhrasesSoftLabel)
	let customPhrasesSoftArea = document.createElement("textarea")
	customPhrasesSoftArea.style.resize = "vertical"
	customPhrasesSoftArea.className = "form-control"
	customPhrasesSoftArea.placeholder =
		"Comma separated ... (regex not supported)"
	customPhrasesSoftArea.value =
		config.customPhrasesSoft == "[]" ? "" : config.customPhrasesSoft
	customPhrasesSoftArea.addEventListener("change", () => {
		let val = customPhrasesSoftArea.value.split(",")
		if (customPhrasesSoftArea.value.length > 0) {
			config.customPhrasesSoft = val
		} else {
			config.customPhrasesSoft = configItems.customPhrasesSoft.defaultValue
		}
	})
	customPhrasesSoftGroup.appendChild(customPhrasesSoftArea)

	// creating an custom phrase textarea color setting
	let customColorGroup = document.createElement("div")
	customColorGroup.className = "form-group row"
	let customColorLabel = document.createElement("label")
	customColorLabel.innerHTML = "Text area color on custom phrase"
	customColorLabel.title =
		"The color that text area changes when you type a custom phrase"
	customColorLabel.style.marginBottom = 0
	customColorGroup.appendChild(customColorLabel)
	let customColorArea = document.createElement("input")
	customColorArea.name = "customColorArea"
	customColorArea.type = "text"
	customColorArea.className = "form-control"
	customColorArea.placeholder = configItems.customColor.defaultValue
	customColorArea.value = config.customColor
	customColorArea.style.marginLeft = ".6em"
	customColorArea.style.width = "60px"
	customColorArea.style.backgroundColor = `#${config.customColor}`
	customColorArea.addEventListener("change", () => {
		if (customColorArea.value.length > 0) {
			config.customColor = customColorArea.value
			customColorArea.style.backgroundColor = `#${config.customColor}`
		} else {
			config.customColor = configItems.customColor.defaultValue
		}
	})
	customColorGroup.appendChild(customColorArea)

	// creating an custom soft phrase textarea color setting
	let customSoftColorGroup = document.createElement("div")
	customSoftColorGroup.className = "form-group row"
	let customSoftColorLabel = document.createElement("label")
	customSoftColorLabel.innerHTML = "Text area color on custom soft phrase"
	customSoftColorLabel.title =
		"The color that text area changes when you type a custom soft phrase"
	customSoftColorLabel.style.marginBottom = 0
	customSoftColorGroup.appendChild(customSoftColorLabel)
	let customSoftColorArea = document.createElement("input")
	customSoftColorArea.name = "customSoftColorArea"
	customSoftColorArea.type = "text"
	customSoftColorArea.className = "form-control"
	customSoftColorArea.placeholder = configItems.customSoftColor.defaultValue
	customSoftColorArea.value = config.customSoftColor
	customSoftColorArea.style.marginLeft = ".6em"
	customSoftColorArea.style.width = "60px"
	customSoftColorArea.style.backgroundColor = `#${config.customSoftColor}`
	customSoftColorArea.addEventListener("change", () => {
		if (customSoftColorArea.value.length > 0) {
			config.customSoftColor = customSoftColorArea.value
			customSoftColorArea.style.backgroundColor = `#${config.customSoftColor}`
		} else {
			config.customSoftColor = configItems.customSoftColor.defaultValue
		}
	})
	customSoftColorGroup.appendChild(customSoftColorArea)

	// make an observer that checks for embeds
	let embedObserver = new MutationObserver((mutations) => {
		if (
			(config.youtubeEmbedFormat != 1 || config.rumbleEmbedFormat != 1) &&
			mutations.length < 3
		) {
			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					if (node.matches("div.msg-chat.msg-user")) {
						node
							.querySelectorAll(".externallink.bookmarklink")
							.forEach((embedNode) => {
								let embedString = embedNode.text
								let embedSplit = embedString.split("/")
								let platform = embedSplit[0]
								let id = embedSplit[1]

								switch (platform) {
								case "#youtube":
									getStreamMetadata(platform, id, (metadata) => {
										if ("title" in metadata && "author_name" in metadata) {
											let title = metadata["title"]
											let channel = metadata["author_name"]
											switch (config.youtubeEmbedFormat) {
											case 2:
												embedNode.text = `${platform}/${id} (${channel})`
												break
											case 3:
												embedNode.text = `${platform}/${id} (${title})`
												break
											case 4:
												embedNode.text = `${platform}/${channel}`
												break
											case 5:
												embedNode.text = `${platform}/${title}`
												break
											case 6:
												embedNode.text = `${platform}/${channel} (${title})`
												break
											}
											if (
												window.getComputedStyle(scrollnotify).bottom != "0px"
											) {
												chatlines.scrollTop = chatlines.scrollHeight
											} else {
												chatlines.scrollLeft = chatlines.scrollWidth
											}
										}
									})
									break
								case "#rumble":
									getStreamMetadata(platform, id, (metadata) => {
										if ("title" in metadata && "author_name" in metadata) {
											let title = metadata["title"]
											let channel = metadata["author_name"]
											switch (config.rumbleEmbedFormat) {
											case 2:
												embedNode.text = `${platform}/${id} (${channel})`
												break
											case 3:
												embedNode.text = `${platform}/${id} (${title})`
												break
											case 4:
												embedNode.text = `${platform}/${channel}`
												break
											case 5:
												embedNode.text = `${platform}/${title}`
												break
											case 6:
												embedNode.text = `${platform}/${channel} (${title})`
												break
											}
											if (
												window.getComputedStyle(scrollnotify).bottom != "0px"
											) {
												chatlines.scrollTop = chatlines.scrollHeight
											} else {
												chatlines.scrollLeft = chatlines.scrollWidth
											}
										}
									})
									break
								}
							})
					}
				}
			}
		}
	})

	// creating an edit youtube and rumble embeds setting
	let editEmbedsGroup = document.createElement("div")
	editEmbedsGroup.className = "form-group checkbox"
	let editEmbedsLabel = document.createElement("label")
	editEmbedsLabel.innerHTML =
		"Format YouTube and Rumble embeds directly in messages according to Utilities settings"
	editEmbedsGroup.appendChild(editEmbedsLabel)
	let editEmbedsCheck = document.createElement("input")
	editEmbedsCheck.name = "editEmbeds"
	editEmbedsCheck.type = "checkbox"
	editEmbedsCheck.checked = config.editEmbeds
	editEmbedsCheck.addEventListener("change", () => {
		config.editEmbeds = editEmbedsCheck.checked
		if (config.editEmbeds) {
			embedObserver.observe(chatlines, {
				childList: true,
			})
		} else {
			embedObserver.disconnect()
		}
	})
	if (config.editEmbeds) {
		embedObserver.observe(chatlines, {
			childList: true,
		})
	} else {
		embedObserver.disconnect()
	}
	editEmbedsLabel.prepend(editEmbedsCheck)

	// make an observer that checks for live pill changing from embeds
	let replacePillName = () => {
		let embedMatch = window.parent.location.hash.match(
			/^(#youtube|#rumble)\/(.*)$/
		)
		if (embedMatch) {
			let platform = embedMatch[1]
			let embedId = embedMatch[2]
			getStreamMetadata(platform, embedId, (metadata) => {
				if ("author_name" in metadata) {
					let channel = metadata["author_name"]

					livePill.nextElementSibling.innerText = channel
				}
			})
		}
	}

	let pillObserver = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			for (let node of mutation.addedNodes) {
				if (livePill != undefined) {
					replacePillName()
				}
			}
		}
	})

	// modify the styling of the pill to accommadate any longer youtube channels with spaces in the names
	if (livePill != undefined) {
		window.parent.document.getElementById("host-pill-name").style.whiteSpace =
			"nowrap"
	}

	let editEmbedPillGroup = document.createElement("div")
	editEmbedPillGroup.className = "form-group checkbox"
	let editEmbedPillLabel = document.createElement("label")
	editEmbedPillLabel.innerHTML =
		"Replace a YouTube and Rumble embed's ID with the channel name in the live pill"
	editEmbedPillGroup.appendChild(editEmbedPillLabel)
	let editEmbedPillCheck = document.createElement("input")
	editEmbedPillCheck.name = "editEmbedPill"
	editEmbedPillCheck.type = "checkbox"
	editEmbedPillCheck.checked = config.editEmbedPill
	editEmbedPillCheck.addEventListener("change", () => {
		config.editEmbedPill = editEmbedPillCheck.checked
		if (config.editEmbedPill && livePill != undefined) {
			pillObserver.observe(livePill, {
				childList: true,
			})
		} else {
			pillObserver.disconnect()
		}
	})
	if (config.editEmbedPill && livePill != undefined) {
		replacePillName()
		pillObserver.observe(livePill, {
			childList: true,
		})
	} else {
		pillObserver.disconnect()
	}
	editEmbedPillLabel.prepend(editEmbedPillCheck)

	// creating a setting to prevent enter from working if you have a banned phrase in the message
	let preventEnterGroup = document.createElement("div")
	preventEnterGroup.className = "form-group checkbox"
	let preventEnterLabel = document.createElement("label")
	preventEnterLabel.innerHTML =
		"Prevent Enter from working if you have a banned phrase in the message"
	preventEnterGroup.appendChild(preventEnterLabel)
	let preventEnterCheck = document.createElement("input")
	preventEnterCheck.name = "preventEnter"
	preventEnterCheck.type = "checkbox"
	preventEnterCheck.checked = config.preventEnter
	preventEnterCheck.addEventListener(
		"change",
		() => (config.preventEnter = preventEnterCheck.checked)
	)
	preventEnterLabel.prepend(preventEnterCheck)

	// creating hide invidual flairs setting
	const flairs = getAllFlairIds()
	// creates flair1-flair100
	function getAllFlairIds() {
		const flairIds = []
		for (let i = 1; i <= 100; i++) {
			flairIds.push(`flair${i}`)
		}
		// Add other flair names
		flairIds.push("bot")
		return flairIds
	}
	// removes any flairs, previously created, that don't have style rules associated with them
	function removeUnusedFlairs() {
		const toRemove = []
		for (let f of hideFlairsList.children) {
			if (getComputedStyle(f).backgroundImage == "none") {
				toRemove.push(f)
			}
		}
		for (let f of toRemove) {
			f.remove()
		}
	}
	function flairToButton(flair) {
		const isHidden = config.hiddenFlairs.includes(flair)
		return `<span class="flair-selector flair ${flair} ${
			isHidden ? "hide-flair" : ""
		}" data-flair-id="${flair}"></span>`
	}
	function toggleFlair(target) {
		if (!target.classList.contains("flair-selector")) return
		const hideFlair = target.classList.toggle("hide-flair")
		const targetFlairId = target.dataset.flairId
		// Save to config
		if (hideFlair) {
			// Add flair to hide list
			config.hiddenFlairs = [...config.hiddenFlairs, targetFlairId]
		} else {
			// Remove flair from hide list
			config.hiddenFlairs = config.hiddenFlairs.filter(
				(f) => f !== targetFlairId
			)
		}
		// Change CSS to hide chosen flairs
		addFlairHidingStyles()
	}
	function addFlairHidingStyles() {
		const styleId = "vyneer-util-hide-flair-style"
		let styleElem = document.getElementById(styleId)
		if (styleElem === null) {
			styleElem = document.createElement("style")
			styleElem.id = styleId
			document.head.appendChild(styleElem)
		}
		styleElem.innerHTML = config.hiddenFlairs.reduce(
			(prev, curr) => prev + `.msg-chat .flair.${curr} { display: none; }\n`,
			""
		)
	}
	const hideFlairsGroup = document.createElement("div")
	hideFlairsGroup.className = "form-group row"
	const hideFlairsLabel = document.createElement("label")
	hideFlairsLabel.classList.add("hide-flairs-label")
	hideFlairsLabel.innerHTML = "Hide Individual Flairs"
	hideFlairsLabel.title = "Select flairs to hide (Click to expand)"
	const hideFlairsList = document.createElement("div")
	hideFlairsList.classList.add("hide-flairs-list")
	hideFlairsList.innerHTML = flairs.reduce(
		(prev, curr) => prev + flairToButton(curr),
		""
	)
	hideFlairsList.addEventListener("click", (e) => toggleFlair(e.target))
	hideFlairsLabel.addEventListener("click", (e) =>
		hideFlairsList.classList.toggle(
			"expanded",
			hideFlairsLabel.classList.toggle("expanded")
		)
	)
	hideFlairsGroup.appendChild(hideFlairsLabel)
	hideFlairsGroup.appendChild(hideFlairsList)
	settingsCss += `
    .hide-flairs-label {
      position: relative;
      cursor: pointer;
    }
    .hide-flairs-label:hover {
      filter: brightness(1.5);
    }
    .hide-flairs-label::after {
      content: '›';
      margin-left: 5px;
      font-size: 150%;
      position: absolute;
      top: -6px;
      font-weight: bold;
      transition: transform 100ms ease-in-out;
    }
    .hide-flairs-label.expanded::after {
      transform: translate(2px, 2px) rotate(90deg);
    }
    .hide-flairs-list {
      margin: 0px 10px;
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      transition: transform 200ms ease-in-out;
      transform-origin: top center;
      overflow: hidden;
    }
    .hide-flairs-list:not(.expanded) {
      transform: scaleY(0);
      height: 0;
    }
    .flair-selector {
      display: inline-block;
      margin: 2px;
      cursor: pointer;
    }
    .flair-selector:hover {
      opacity: 0.75;
    }
    .flair-selector.hide-flair::after {
      content: '❌';
      position: absolute;
    }
  `
	addFlairHidingStyles()
	// Wait 2 seconds for CSS to load to test/remove unused flairs
	setTimeout(removeUnusedFlairs, 2000) // it would be nice to have a better way to get flairs

	// creating a setting to toggle mentioned being stuck to top of window when scrolled past
	const stickyMentionsGroup = document.createElement("div")
	stickyMentionsGroup.className = "form-group checkbox"
	const stickyMentionsLabel = document.createElement("label")
	stickyMentionsLabel.innerHTML = "Stick recent mentions to top of chat"
	stickyMentionsLabel.title =
		"Keeps recent mentions stuck to top of chat when scrolled past"
	stickyMentionsGroup.appendChild(stickyMentionsLabel)
	const stickyMentionsCheck = document.createElement("input")
	stickyMentionsCheck.name = "stickyMentions"
	stickyMentionsCheck.type = "checkbox"
	stickyMentionsCheck.checked = config.stickyMentions
	function toggleStickyMentions(toggle) {
		document
			.getElementById("chat-win-main")
			.classList.toggle("vyneer-util-sticky-mentions-on", toggle)
	}
	stickyMentionsCheck.addEventListener("change", () => {
		config.stickyMentions = stickyMentionsCheck.checked
		toggleStickyMentions(config.stickyMentions)
	})
	stickyMentionsLabel.prepend(stickyMentionsCheck)
	settingsCss += `
    #chat-win-main.vyneer-util-sticky-mentions-on .msg-highlight {
      position: sticky;
      top: 0px;
      z-index: 121;
      border-bottom-style: inset;
      border-bottom-width: 2px;
      border-bottom-color: #080808;
    }
  `
	toggleStickyMentions(config.stickyMentions)

	// creating a setting to toggle whispers being stuck to top of window when scrolled past
	const stickyWhispersGroup = document.createElement("div")
	stickyWhispersGroup.className = "form-group checkbox"
	const stickyWhispersLabel = document.createElement("label")
	stickyWhispersLabel.innerHTML = "Stick in-line whispers to top of chat"
	stickyWhispersLabel.title =
		"Keeps in-line whispers stuck to top of chat when scrolled past"
	stickyWhispersGroup.appendChild(stickyWhispersLabel)
	const stickyWhispersCheck = document.createElement("input")
	stickyWhispersCheck.name = "stickyWhispers"
	stickyWhispersCheck.type = "checkbox"
	stickyWhispersCheck.checked = config.stickyWhispers
	function toggleStickyWhispers(toggle) {
		document
			.getElementById("chat-win-main")
			.classList.toggle("vyneer-util-sticky-whispers-on", toggle)
	}
	stickyWhispersCheck.addEventListener("change", () => {
		config.stickyWhispers = stickyWhispersCheck.checked
		toggleStickyWhispers(config.stickyWhispers)
	})
	stickyWhispersLabel.prepend(stickyWhispersCheck)
	settingsCss += `
    #chat-win-main.vyneer-util-sticky-whispers-on .msg-whisper {
      position: sticky;
      top: 0px;
      z-index: 121;
      border-bottom-style: inset;
      border-bottom-width: 2px;
      border-bottom-color: #080808;
    }
  `
	toggleStickyWhispers(config.stickyWhispers)

	// Ignored phrases
	const ignoredPhrasesGroup = document.createElement("div")
	ignoredPhrasesGroup.className = "form-group checkbox"
	const ignoredPhrasesLabel = document.createElement("label")
	ignoredPhrasesLabel.innerHTML = "Ignore Phrases"
	ignoredPhrasesLabel.title = "Messages containing these phrases will be hidden"
	ignoredPhrasesGroup.appendChild(ignoredPhrasesLabel)
	const ignoredPhrasesCheck = document.createElement("input")
	ignoredPhrasesCheck.name = "ignorePhrases"
	ignoredPhrasesCheck.type = "checkbox"
	ignoredPhrasesCheck.checked = config.ignorePhrases
	ignoredPhrasesLabel.prepend(ignoredPhrasesCheck)
	const ignoredPhrasesArea = document.createElement("textarea")
	ignoredPhrasesArea.style.resize = "vertical"
	ignoredPhrasesArea.className = "form-control"
	ignoredPhrasesArea.placeholder = "Comma separated ... (regex not supported)"
	ignoredPhrasesArea.value =
		config.ignoredPhraseList == "[]" ? "" : config.ignoredPhraseList.join(", ")
	ignoredPhrasesGroup.appendChild(ignoredPhrasesArea)

	// Functions //
	function toggleIgnoredPhrases() {
		document
			.getElementById("chat-win-main")
			.classList.toggle("vyneer-util-ignored-phrases-on", config.ignorePhrases)

		// Observe or disconnect mutation observer
		if (config.ignorePhrases && config.ignoredPhraseList.length > 0) {
			ignoredPhrasesObserver.observe(chatlines, {
				childList: true,
			})
		} else {
			ignoredPhrasesObserver.disconnect()
		}

		// Go through chat messages that observer might have missed while disconnected or if phrase list changed
		markMessagesContainingIgnoredPhrases(
			chatlines.children,
			config.ignoredPhraseList
		)
	}
	function markMessagesContainingIgnoredPhrases(messages, ignoredPhrases) {
		for (let i = 0; i < messages.length; i++) {
			let ignored = false
			const messageText = messages[i]
				.getElementsByClassName("text")[0]
				?.innerText?.toLowerCase()
			if (messageText) {
				for (let j = 0; j < ignoredPhrases.length; j++) {
					if (messageText.includes(ignoredPhrases[j])) {
						ignored = true
						break
					}
				}
			}
			messages[i].classList.toggle("ignored-phrase", ignored)
		}
	}

	// Event listeners //
	ignoredPhrasesCheck.addEventListener("change", (e) => {
		config.ignorePhrases = ignoredPhrasesCheck.checked
		toggleIgnoredPhrases()
	})
	ignoredPhrasesArea.addEventListener("change", () => {
		const phrases = ignoredPhrasesArea.value.split(",")
		if (ignoredPhrasesArea.value.length > 0) {
			let phrasesCleaned = phrases
				.map((p) => p.trim().toLowerCase())
				.filter((p) => p !== "")
			config.ignoredPhraseList = phrasesCleaned
		} else {
			config.ignoredPhraseList = configItems.ignoredPhraseList.defaultValue
		}
		toggleIgnoredPhrases()
	})

	// Mutation Observer setup
	const ignoredPhrasesObserver = new MutationObserver((mutations) => {
		for (let i = 0; i < mutations.length; i++) {
			const addedNodes = mutations[i].addedNodes
			markMessagesContainingIgnoredPhrases(addedNodes, config.ignoredPhraseList)
		}
	})
	toggleIgnoredPhrases()

	settingsCss += `
    #chat-win-main.vyneer-util-ignored-phrases-on > .chat-lines > .msg-chat.ignored-phrase:not(.msg-own) {
      display: none;
    }
  `

	// Add our settings' styles to the document
	const settingsStyles = document.createElement("style")
	settingsStyles.id = "vyneer-util-styles"
	settingsStyles.innerHTML = settingsCss
	document.head.appendChild(settingsStyles)

	// appending all the settings to our area
	settingsArea.appendChild(alwaysScrollDownGroup)
	settingsArea.appendChild(doubleClickCopyGroup)
	// settingsArea.appendChild(embedChatGroup)
	let embedsTitle = document.createElement("h4")
	embedsTitle.innerHTML = "Utilities Embeds Settings"
	settingsArea.appendChild(changeTitleOnLiveGroup)
	settingsArea.appendChild(stickyMentionsGroup)
	settingsArea.appendChild(stickyWhispersGroup)
	settingsArea.appendChild(embedIconStyleGroup)
	settingsArea.appendChild(hideFlairsGroup)
	settingsArea.appendChild(embedsTitle)
	settingsArea.appendChild(showLastVODGroup)
	settingsArea.appendChild(embedsOnLaunchGroup)
	settingsArea.appendChild(lastEmbedsGroup)
	settingsArea.appendChild(lastIfNoneGroup)
	settingsArea.appendChild(embedTimeGroup)
	settingsArea.appendChild(twitchEmbedFormatGroup)
	settingsArea.appendChild(youtubeEmbedFormatGroup)
	settingsArea.appendChild(rumbleEmbedFormatGroup)
	let phrasesTitle = document.createElement("h4")
	phrasesTitle.innerHTML = "Utilities Phrases Settings"
	settingsArea.appendChild(phrasesTitle)
	settingsArea.appendChild(colorOnMutelinksGroup)
	settingsArea.appendChild(phraseColorGroup)
	settingsArea.appendChild(nukeColorGroup)
	settingsArea.appendChild(mutelinksColorGroup)
	settingsArea.appendChild(customPhrasesGroup)
	settingsArea.appendChild(customPhrasesSoftGroup)
	settingsArea.appendChild(customColorGroup)
	settingsArea.appendChild(customSoftColorGroup)
	let experimentalTitle = document.createElement("h4")
	experimentalTitle.innerHTML = "Utilities Experimental Settings"
	experimentalTitle.style.marginBottom = "0px"
	let experimentalSubTitle = document.createElement("h4")
	experimentalSubTitle.innerHTML = "May impact performance!"
	experimentalSubTitle.style.color = "orangered"
	experimentalSubTitle.style.marginTop = "0px"
	settingsArea.appendChild(experimentalTitle)
	settingsArea.appendChild(experimentalSubTitle)
	settingsArea.appendChild(ignoredPhrasesGroup)
	settingsArea.appendChild(preventEnterGroup)
	settingsArea.appendChild(editEmbedsGroup)
	settingsArea.appendChild(editEmbedPillGroup)

	// https://www.npmjs.com/package/text-ellipsis
	// cut off a string if too long
	function textEllipsis(
		str,
		maxLength,
		{ side = "end", ellipsis = "..." } = {}
	) {
		if (str.length > maxLength) {
			switch (side) {
			case "start":
				return ellipsis + str.slice(-(maxLength - ellipsis.length))
			case "end":
			default:
				return str.slice(0, maxLength - ellipsis.length) + ellipsis
			}
		}
		return str
	}

	// formatter for embed links
	// https://github.com/destinygg/chat-gui/blob/master/assets/chat/js/formatters.js
	class EmbedUrlFormatter {
		constructor() {
			this.bigscreenPath = "/bigscreen"
			this.bigscreenregex = new RegExp(
				/(^|\s)((#twitch|#twitch-vod|#twitch-clip|#youtube|#rumble|#kick|(?:https:\/\/|http:\/\/|)strims\.gg(?:\/angelthump|\/facebook|\/smashcast|\/twitch-vod|\/twitch|\/ustream|\/youtube-playlist|\/youtube)?)\/(?:[A-z0-9_-]{3,64}))\b/,
				"g"
			)
			// FIXME: this is a hack to get the bigscreen url
			this.currentPath = "/bigscreen"
			this.url = "https://www.destiny.gg/bigscreen"
		}

		format(str, channel, title) {
			// Open embed links in a new tab when in embedded/popout chat.
			const target = this.currentPath === this.bigscreenPath ? "_top" : "_blank"
			title = textEllipsis(title, 60)
			let source
			let replacerString
			switch (str.replace(this.bigscreenregex, "$3")) {
			case "#twitch":
				source = "https://twitch.tv/" + str.split("/")[1]
				switch (config.twitchEmbedFormat) {
				case 2:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				default:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				}
				break
			case "#twitch-vod":
				source = "https://twitch.tv/videos/" + str.split("/")[1]
				switch (config.twitchEmbedFormat) {
				case 2:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				default:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				}
				break
			case "#twitch-clip":
				source = "https://clips.twitch.tv/" + str.split("/")[1]
				switch (config.twitchEmbedFormat) {
				case 2:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				default:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				}
				break
			case "#youtube":
				source = "https://youtu.be/" + str.split("/")[1]
				switch (config.youtubeEmbedFormat) {
				case 2:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								channel +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 3:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 4:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								channel +
								'</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 5:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								title +
								'</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 6:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								channel +
								" (" +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				default:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				}
				break
			case "#rumble":
				source = "https://rumble.com/embed/" + str.split("/")[1]
				switch (config.rumbleEmbedFormat) {
				case 2:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								channel +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 3:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2 (' +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 4:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								channel +
								'</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 5:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								title +
								'</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				case 6:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$3/' +
								channel +
								" (" +
								title +
								')</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				default:
					replacerString =
								'$1<a class="externallink bookmarklink" href="' +
								this.url +
								'$2" target="' +
								target +
								'">$2</a> <a class="externallink bookmarklink" href="' +
								source +
								'" target ="_blank">(source)</a>'
					break
				}
				break
			case "#kick":
				source = "https://kick.com/" + str.split("/")[1]
				replacerString =
						'$1<a class="externallink bookmarklink" href="' +
						this.url +
						'$2" target="' +
						target +
						'">$2</a> <a class="externallink bookmarklink" href="' +
						source +
						'" target ="_blank">(source)</a>'
				break
			case "strims.gg":
			case "strims.gg/angelthump":
			case "strims.gg/facebook":
			case "strims.gg/smashcast":
			case "strims.gg/twitch-vod":
			case "strims.gg/twitch":
			case "strims.gg/ustream":
			case "strims.gg/youtube-playlist":
			case "strims.gg/youtube":
				return str.replace(
					this.bigscreenregex,
					'$1<a class="externallink bookmarklink" href="https://$2" target="_blank">$2</a>'
				)
			}
			return str.replace(this.bigscreenregex, replacerString)
		}
	}

	let embedForm = new EmbedUrlFormatter()

	function getStreamMetadata(platform, videoID, callback) {
		// helper function to query youtube with a stream id to get metadata about that stream, including the stream's title and the channel's name
		// the metadata is passed into the given callback function
		let url
		switch (platform) {
		case "#youtube":
			url = `https://www.youtube.com/oembed?format=json&url=https://youtu.be/${videoID}`
			break
		case "#rumble":
			url = `https://rumble.com/api/Media/oembed?format=json&url=https://rumble.com/embed/${videoID}`
			break
		default:
			return
		}
		bgFetch(url)
			.then((response) => {
				if (errorAlert.style.display == "") {
					errorAlert.style.display = "none"
				}
				if (response.status == "success") {
					let data = response.data
					callback(data)
				} else {
					console.error(
						`[ERROR] [dgg-utils] couldn't get the youtube oEmbed data - HTTP status code: ${response.status} - ${response.statusText}`
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.error(
					`[ERROR] [dgg-utils] couldn't get the youtube oEmbed data - HTTP error`
				)
			})
	}

	// function to get phrases
	function getPhrases() {
		// TODO: NOT COMPLETE
		bgFetch("https://vyneer.me/tools/phrases?ts=1")
			.then((response) => {
				if (errorAlert.style.display == "") {
					errorAlert.style.display = "none"
				}
				if (response.status == "success") {
					let parsedResponse = response.data
					let data = []
					if (parsedResponse && parsedResponse.data) {
						data = parsedResponse.data
					}
					phrasesTimestamp = parsedResponse.updatedAt
					phrases = []
					data.forEach((entry) => {
						let cleanPhrase = entry.phrase.trim().toLowerCase()
						if (/^\/.*\/$/.test(cleanPhrase) && cleanPhrase.length > 2) {
							const regexString = cleanPhrase.slice(1, cleanPhrase.length - 1)
							const regex = new RegExp(regexString, "i")
							phrases.push(regex)
						} else {
							phrases.push(entry.phrase)
						}
					})
				} else {
					console.error(
						`[ERROR] [dgg-utils] couldn't get the phrase data, going to try to get phrases from mitchdev.net - URL: "https://vyneer.me/tools/phrases", HTTP status code: ${response.status} - ${response.statusText}`
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.error(
					`[ERROR] [dgg-utils] couldn't get the phrase data, going to try to get phrases from mitchdev.net - URL: "https://vyneer.me/tools/phrases"`
				)
				bgFetch("https://mitchdev.net/api/dgg/list", {
					headers: {
						"If-None-Match": `W/"${phrasesEtag}"`,
					},
				})
					.then((response) => {
						if (
							(response.status == 304 && phrases.length == 0) ||
							response.status == "success"
						) {
							let data = response.data
							response.responseHeaders.split(/\r?\n/).forEach((el) => {
								const splitHeader = el.split(": ")
								if (splitHeader[0] == "etag") {
									phrasesEtag = splitHeader[1].substring(
										3,
										splitHeader[1].length - 1
									)
								}
							})
							phrases = []
							data.forEach((entry) => {
								let cleanPhrase = entry.phrase.trim().toLowerCase()
								if (/^\/.*\/$/.test(cleanPhrase) && cleanPhrase.length > 2) {
									const regexString = cleanPhrase.slice(
										1,
										cleanPhrase.length - 1
									)
									const regex = new RegExp(regexString, "i")
									phrases.push(regex)
								} else {
									phrases.push(entry.phrase)
								}
							})
						} else if (response.status != "success") {
							console.error(
								`[ERROR] [dgg-utils] couldn't get the phrase data - URL: "https://mitchdev.net/api/dgg/list", HTTP status code: ${response.status}`
							)
						}
					})
					.catch((error) => {
						console.error(
							`[ERROR] [dgg-utils] couldn't get the phrase data - URL: "https://mitchdev.net/api/dgg/list", HTTP error`
						)
					})
			})
	}

	getPhrases()

	// when no whisper tabs are opened, the chat window selector has no children
	const chatwindowselector = document.querySelector("#chat-windows-select")
	let dggIsActive = true

	// create an observer that will fire when the chat window selector is updated
	const windowObserver = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					if (node.classList.contains("win-main")) {
						dggIsActive = node.classList.contains("active")
						if (!dggIsActive) {
							foundPhraseOrNuke = false
							if (textarea.style.backgroundColor != "") {
								textarea.style.backgroundColor = ""
							}
							if (config.preventEnter) {
								sendAnywayButton.style.display = "none"
							}
						}
					}
				})
			} else {
				if (mutation.target.style.display == "none") {
					dggIsActive = true
				}
			}
			textScanner({})
		}
	})

	windowObserver.observe(chatwindowselector, {
		childList: true,
		attributes: true,
	})

	function textScanner(event) {
		// ensure we dont fire on random empty keypresses
		if (
			!(
				event.code == "ControlLeft" ||
				event.code == "ControlRight" ||
				event.code == "AltLeft" ||
				event.code == "AltRight" ||
				event.code == "ShiftLeft" ||
				event.code == "ShiftRight" ||
				event.code == "MetaLeft" ||
				event.code == "MetaRight"
			)
		) {
			let text = textarea.value.toLowerCase()
			let resultCustom
			let resultCustomSoft
			let resultLinks
			let resultNukes
			let result

			// exclude whispers sent using slash commands or when the main chat window is inactive
			if (
				text.startsWith("/w ") ||
				text.startsWith("/whisper ") ||
				text.startsWith("/msg ") ||
				text.startsWith("/message ") ||
				text.startsWith("/notify ") ||
				text.startsWith("/tell ") ||
				!dggIsActive
			) {
				return false
			}

			if (phrases.length > 0) {
				for (let entry of phrases) {
					if (typeof entry === "string") {
						if (text.indexOf(entry) != -1) {
							result = true
							break
						}
					} else {
						if (entry.test(text)) {
							result = true
							break
						}
					}
				}
			}

			if (nukesCompiled.length > 0) {
				for (let entry of nukesCompiled) {
					if (typeof entry === "string") {
						if (text.indexOf(entry) != -1) {
							resultNukes = true
							break
						}
					} else {
						if (entry.test(text)) {
							resultNukes = true
							break
						}
					}
				}
			}

			if (mutelinks && config.colorOnMutelinks) {
				for (let entry of mutelinksChecklist) {
					if (text.indexOf(entry) != -1) {
						resultLinks = true
						break
					}
				}
			}

			if (config.customPhrases.length > 0) {
				for (let entry of config.customPhrases) {
					if (text.indexOf(entry) != -1) {
						resultCustom = true
						break
					}
				}
			}

			if (config.customPhrasesSoft.length > 0) {
				resultCustomSoft = config.customPhrasesSoft.find((entry) => {
					let regex = new RegExp(`\\b${entry}\\b`)
					if (regex.test(text)) {
						return true
					} else {
						return false
					}
				})
			}

			if (result != undefined) {
				foundPhraseOrNuke = true
				textarea.style.backgroundColor = `#${config.phraseColor}`
				document.body.style.setProperty(
					"--flashing-color",
					`#${config.phraseColor}`
				)
				if (config.preventEnter) {
					sendAnywayButton.style.display = ""
				}
			} else if (resultLinks != undefined) {
				foundPhraseOrNuke = true
				textarea.style.backgroundColor = `#${config.mutelinksColor}`
				document.body.style.setProperty(
					"--flashing-color",
					`#${config.mutelinksColor}`
				)
				if (config.preventEnter) {
					sendAnywayButton.style.display = ""
				}
			} else if (resultCustom != undefined) {
				foundPhraseOrNuke = true
				textarea.style.backgroundColor = `#${config.customColor}`
				document.body.style.setProperty(
					"--flashing-color",
					`#${config.customColor}`
				)
				if (config.preventEnter) {
					sendAnywayButton.style.display = ""
				}
			} else if (resultCustomSoft != undefined) {
				foundPhraseOrNuke = true
				textarea.style.backgroundColor = `#${config.customSoftColor}`
				document.body.style.setProperty(
					"--flashing-color",
					`#${config.customSoftColor}`
				)
				if (config.preventEnter) {
					sendAnywayButton.style.display = ""
				}
			} else if (resultNukes != undefined) {
				foundPhraseOrNuke = true
				textarea.style.backgroundColor = `#${config.nukeColor}`
				document.body.style.setProperty(
					"--flashing-color",
					`#${config.nukeColor}`
				)
				if (config.preventEnter) {
					sendAnywayButton.style.display = ""
				}
			} else {
				foundPhraseOrNuke = false
				if (textarea.style.backgroundColor != "") {
					textarea.style.backgroundColor = ""
				}
				if (config.preventEnter) {
					sendAnywayButton.style.display = "none"
				}
			}
		}
	}

	let pasted = false

	// next 2 event listeners are for detecting pastes
	// because right-click -> paste doesnt get detected by keyup
	textarea.addEventListener("paste", () => {
		pasted = true
	})

	textarea.addEventListener("input", (e) => {
		if (pasted) {
			textScanner(e)
			pasted = false
		}
	})

	// adding an event listener to chat's input box
	// every time you press a key it checks whether your text has spooky phrases in it
	textarea.addEventListener("keyup", (e) => {
		textScanner(e)
	})

	// function to simplify appending embeds
	function serveEmbeds(data, emb, ifnone) {
		if (data.length > 0) {
			data.forEach((entry) => {
				if (!emb) {
					new DGGMsg(
						`${embedForm.format(entry.link, entry.channel, entry.title)} (${
							entry.count
						} ${entry.count == 1 ? "embed" : "embeds"})`,
						"msg-status msg-historical",
						""
					).update()
				} else {
					new DGGMsg(
						embedForm.format(entry.link, entry.channel, entry.title),
						"msg-status msg-historical",
						entry.timestamp
					).update()
				}
			})
		} else {
			if (!emb) {
				if (!ifnone) {
					new DGGMsg(
						`Looks like nobody embedded anything in the last ${config.embedTime} minutes.`,
						"msg-error",
						""
					).update()
				} else {
					new DGGMsg(
						`Looks like nobody embedded anything in the last ${config.embedTime} minutes, showing you the last embeds instead.`,
						"msg-error",
						""
					).update()
					bgFetch("https://vyneer.me/tools/embeds/last")
						.then((response) => {
							if (errorAlert.style.display == "") {
								errorAlert.style.display = "none"
							}
							if (response.status == "success") {
								let data = response.data
								if (config.lastEmbeds) {
									data = data.reverse()
								}
								serveEmbeds(data, true, false)
							} else {
								new DGGMsg(
									`Couldn't get the embeds data, check the console for more details.`,
									"msg-error",
									""
								).update()
								console.error(
									`[ERROR] [dgg-utils] couldn't get the embeds data - URL: "https://vyneer.me/tools/embeds/last"`
								)
							}
						})
						.catch((error) => {
							errorAlert.style.display = ""
							console.error(
								`[ERROR] [dgg-utils] couldn't get the embeds data - URL: "https://vyneer.me/tools/embeds/last"`
							)
						})
				}
			} else {
				new DGGMsg(
					`Looks like there's no data regarding the last embeds.`,
					"msg-error",
					""
				).update()
			}
		}
	}

	// adding an event listener to the new embeds button
	// once you press it it fetches embeds from vyneer.me and displays them in chat
	embedsButton.addEventListener("click", () => {
		embeds()
	})

	// function to show embeds
	function embeds() {
		let embedUrl

		if (!config.lastEmbeds) {
			new DGGMsg(
				`Getting top 5 embeds in the last ${config.embedTime} minutes...`,
				"msg-info",
				""
			).update()
			embedUrl = `https://vyneer.me/tools/embeds?t=${config.embedTime}`
		} else {
			new DGGMsg(`Getting last 5 embeds...`, "msg-info", "").update()
			embedUrl = `https://vyneer.me/tools/embeds/last`
		}
		bgFetch(embedUrl)
			.then((response) => {
				if (response.status == "success") {
					let embedData = response.data
					if (config.lastEmbeds) {
						embedData = embedData.reverse()
					}
					if (config.showLastVOD) {
						bgFetch("https://vyneer.me/tools/ytvods")
							.then((response) => {
								let vodData = []
								if (response.status == "success") {
									vodData = response.data
									if (vodData.length > 0) {
										new DGGMsg(
											`Last Destiny VOD - ${embedForm.format(
												`#youtube/${vodData[0].id}`,
												"Destiny",
												vodData[0].title
											)}`,
											"msg-status msg-historical",
											""
										).update()
									} else {
										new DGGMsg(
											`Couldn't get the VOD data, check the console for more details.`,
											"msg-error",
											""
										).update()
										console.error(
											`[ERROR] [dgg-utils] couldn't get the VOD data - the VOD db is empty`
										)
									}
								} else {
									new DGGMsg(
										`Couldn't get the VOD data, check the console for more details.`,
										"msg-error",
										""
									).update()
									console.error(
										`[ERROR] [dgg-utils] couldn't get the VOD data - HTTP status code: ${response.status}`
									)
								}
								serveEmbeds(embedData, config.lastEmbeds, config.lastIfNone)
							})
							.catch((error) => {
								console.error(
									`[ERROR] [dgg-utils] couldn't get the VOD data - URL: "https://vyneer.me/tools/ytvods" because ${error}`
								)
							})
					} else {
						serveEmbeds(embedData, config.lastEmbeds, config.lastIfNone)
					}
				} else {
					new DGGMsg(
						`Couldn't get the embeds data, check the console for more details.`,
						"msg-error",
						""
					).update()
					console.error(
						`[ERROR] [dgg-utils] couldn't get the embeds data - URL: ${embedUrl}, HTTP status code: ${response.status}`
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.error(
					`[ERROR] [dgg-utils] couldn't get the embeds data - URL: ${embedUrl} because ${error}`
				)
			})
	}

	// function to see get latest timestamps of nukes/phrases/mutelinks
	function getNukesMutesPhrasesTimestamps() {
		bgFetch("https://vyneer.me/tools/nmptimestamps")
			.then((response) => {
				if (errorAlert.style.display == "") {
					errorAlert.style.display = "none"
				}
				if (response.status == "success") {
					let data = response.data
					if (nukesTimestamp !== data.nukes) {
						getNukes()
					}

					if (mutelinksTimestamp !== data.mutelinks) {
						getMutelinks()
					}

					if (phrasesTimestamp !== data.phrases) {
						getPhrases()
					}
				} else {
					console.log(
						`%c[DGG] [ERROR] %ccouldn't get the nukes/mutelinks/phrases timestamps - HTTP status code: ${response.status}`,
						"color: #538CC6",
						"color: ##c9c944"
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.log(
					`%c[DGG] [ERROR] %ccouldn't get the nukes/mutelinks/phrases timestamps`,
					"color: #538CC6",
					"color: ##c9c944"
				)
			})
	}

	// function to get nukes
	function getNukes() {
		bgFetch("https://vyneer.me/tools/nukes?ts=1")
			.then((response) => {
				if (errorAlert.style.display == "") {
					errorAlert.style.display = "none"
				}
				let parsedResponse = {}
				let data = []
				if (DEBUG) {
					data = DEBUG_NUKE_DATA
				}
				nukes = []
				nukesCompiled = []
				if (response.status == "success") {
					if (!DEBUG) {
						parsedResponse = response.data
						if (parsedResponse && parsedResponse.data) {
							data = parsedResponse.data
						}
					}
					nukesTimestamp = parsedResponse.updatedAt
					if (data.length > 0) {
						let nukeAlertButtonTooltip = ""
						data.forEach((entry) => {
							nukes.push(entry)
							nukeAlertButtonTooltip += `${entry.word} (${entry.type} for ${entry.duration})\n`
							let cleanNuke = entry.word.trim().toLowerCase()
							if (/^\/.*\/$/.test(cleanNuke) && cleanNuke.length > 2) {
								const regexString = cleanNuke.slice(1, cleanNuke.length - 1)
								const regex = new RegExp(regexString, "i")
								nukesCompiled.push(regex)
							} else {
								nukesCompiled.push(entry.word)
							}
						})
						nukeAlertButton.style.display = ""
						if (nukeAlertButtonTooltip) {
							nukeAlertButton.title = nukeAlertButtonTooltip
						} else {
							nukeAlertButton.title = "Nukes"
						}
					} else {
						if (nukeAlertButton.style.display != "none") {
							nukeAlertButton.style.display = "none"
							nukeAlertButton.title = "Nukes"
							if (DEBUG) {
								nukeAlertButton.style.display = ""
							}
						}
					}
				} else {
					console.error(
						`[ERROR] [dgg-utils] couldn't get the nuke data - HTTP status code: ${response.status}`
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.error(`[ERROR] [dgg-utils] couldn't get the nuke data`)
			})
	}

	// function to get nukes and mutelinks
	function getMutelinks() {
		bgFetch("https://vyneer.me/tools/mutelinks?ts=1")
			.then((response) => {
				if (errorAlert.style.display == "") {
					errorAlert.style.display = "none"
				}
				let parsedResponse = {}
				let data = []
				if (DEBUG) {
					data = DEBUG_LINKS_DATA
				}
				if (response.status == "success") {
					if (!DEBUG) {
						parsedResponse = response.data
						if (parsedResponse && parsedResponse.data) {
							data = parsedResponse.data
						}
					}
					mutelinksTimestamp = parsedResponse.updatedAt
					if (data[0] && data[0].status == "on") {
						mutelinks = true
						linksAlertButton.style.display = "inline-flex"
						linksAlertButton.title = `Links mentioning ${data[0].user} WILL get you muted (${data[0].duration}).`
						linksAlertButton_span.innerHTML = "on"
					} else if (data[0] && data[0].status == "all") {
						mutelinks = true
						linksAlertButton.style.display = "inline-flex"
						linksAlertButton.title = `ANY link WILL get you muted (${data[0].duration}).`
						linksAlertButton_span.innerHTML = "all"
					} else if (data[0] && data[0].status == "off") {
						mutelinks = false
						if (linksAlertButton.style.display != "none") {
							linksAlertButton.style.display = "none"
							linksAlertButton.title = "Mutelinks"
						}
					}
				} else {
					console.error(
						`[ERROR] [dgg-utils] couldn't get the mutelinks data - HTTP status code: ${response.status}`
					)
				}
			})
			.catch((error) => {
				errorAlert.style.display = ""
				console.error(`[ERROR] [dgg-utils] couldn't get the mutelinks data`)
			})
	}

	getNukes()
	getMutelinks()

	setInterval(() => {
		getNukesMutesPhrasesTimestamps()
	}, 15000)

	// make an observer move nuke/mutelinks buttons based on amount of whispers
	let marginObserver = new MutationObserver((mutations) => {
		utilitiesButtons.style.marginLeft = `${mutations[0].target.offsetWidth}px`
	})
	marginObserver.observe(
		document.querySelector("#chat-whisper-unread-indicator"),
		{ characterData: false, attributes: false, childList: true, subtree: false }
	)

	// adding an event listener to the nukes button
	// once you press it it fetches nukes from vyneer.me and displays them in chat
	nukeAlertButton.addEventListener("click", () => {
		new DGGMsg(`Showing current nukes...`, "msg-info", "").update()

		if (nukes.length > 0) {
			nukes.forEach((result) => {
				new DGGMsg(
					`${result.word} (${result.type.toString().toLowerCase()}d for ${
						result.duration
					})`,
					"msg-status msg-historical",
					""
				).update()
			})
		} else {
			new DGGMsg(
				`Looks like there's no data regarding the nukes.`,
				"msg-error",
				""
			).update()
		}
	})
	// FIXME: STATE IS A PAIN, we need to update the state of the settings when changed but that's not fesible right now everything is rendered in this func.

	if (config.embedsOnLaunch) {
		embeds()
	}
}

// only inject if the url is *www.destiny.gg/embed/*
if (window.location.href.includes("/embed/")) {
	console.log(
		`%c[DGG] %cDGG EVERYWHERE v${chrome.runtime.getManifest().version} LOADED`,
		"color: #538CC6",
		"color: #6F859A"
	)
	config.setFromSync()
	injectScript()
}
