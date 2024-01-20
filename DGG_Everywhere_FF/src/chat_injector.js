const chatInputControl = document.getElementById("chat-input-control")
chatInputControl.removeAttribute("autofocus")
chatInputControl.addEventListener("focus", (event) => {
	event.preventDefault()
	event.stopPropagation()
	event.stopImmediatePropagation()
	chrome.runtime.sendMessage({
		action: "scrollToTop",
	})
})
