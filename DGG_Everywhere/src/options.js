import "../src/bootstrap.bundle.min.js"

var triggerTabList = [].slice.call(document.querySelectorAll("#myTab a"))
triggerTabList.forEach(function (triggerEl) {
	var tabTrigger = new bootstrap.Tab(triggerEl) // eslint-disable-line no-undef

	triggerEl.addEventListener("click", function (event) {
		// if the id is Help-tab, then we don't want to add a click event listener
		if (triggerEl.id === "Help-tab") {
			triggerEl.addEventListener("click", function () {
				// unset this tab as active
				triggerEl.setAttribute("aria-selected", false)
				triggerEl.classList.remove("active")
			})
		} else {
			event.preventDefault()
			tabTrigger.show()
		}
	})
})

function updatePermissions() {
	chrome.permissions.getAll().then((permissions) => {
		for (let origin of permissions.origins) {
			for (let element of document.getElementsByClassName(
				"origin-permission"
			)) {
				if (element.dataset.origin !== origin) {
					continue
				}
				element.checked = true
				// element.disabled = true
				element.title =
					"This permission must be disabled from the Extensions page"
				break
			}
		}
	})
}

async function registerContentScript(id) {
	chrome.scripting.getRegisteredContentScripts().then((scripts) => {
		console.log(scripts)
	})
	chrome.scripting.registerContentScripts([
		{
			id: id,
			matches: getSelectedOrigins(),
			js: ["src/content.js"],
			runAt: "document_start",
		},
	])
}

function getSelectedOrigins() {
	let origins = ["https://*.destiny.gg/*"]
	for (let element of document.getElementsByClassName("origin-permission")) {
		if (element.checked) {
			origins.push(element.dataset.origin)
		}
	}
	return origins
}

async function processChange(event) {
	let origin = event.target.dataset.origin
	let result = event.target.checked
	try {
		if (result) {
			console.log("Adding permission", origin)

			chrome.permissions.request({ origins: [origin] }).then((granted) => {
				console.log("Permission granted", granted)

				if (granted) {
					// check if the content script is registered
					chrome.scripting.updateContentScripts([
						{
							id: "chat-injector",
							matches: getSelectedOrigins(),
						},
					])
				} else {
					event.target.checked = false
				}
			})
		} else {
			console.log("Removing permission", origin)
			chrome.permissions.remove({ origins: [origin] }).then((removed) => {
				console.log("Permission removed", removed)
				if (removed) {
					// check if the content script is registered
					chrome.scripting
						.updateContentScripts([
							{
								id: "chat-injector",
								matches: getSelectedOrigins(),
							},
						])
						.then(() => {
							updatePermissions()
						})
				}
			})
		}
	} catch (err) {
		console.log(err)
	}
}

chrome.scripting.getRegisteredContentScripts().then((scripts) => {
	if (!scripts.find((script) => script.id === "chat-injector")) {
		registerContentScript("chat-injector")
	}
})

updatePermissions()

for (let element of document.getElementsByClassName("origin-permission")) {
	element.addEventListener("click", processChange)
}
