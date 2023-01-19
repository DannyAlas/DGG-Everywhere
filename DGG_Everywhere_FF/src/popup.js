const checkbox = document.querySelector("input[name=checkbox]");
browser.storage.sync.get(["checkbox"], async function(result) {
    if (result.checkbox != null) {
        document.getElementById("checkbox").checked = result.checkbox
    } else { document.getElementById("checkbox").checked = false }
});

checkbox.addEventListener("change", async(e) => {
    if (e.target.checked) {
        browser.storage.sync.set({ "checkbox": true });
        let [tab] = await browser.tabs.query({ active: true, currentWindow: true });

        browser.scripting.executeScript({
            target: { tabId: tab.id },
            function: async() => {
                browser.storage.sync.set({
                    "src": $('#chatframe').attr('src'),
                    function() { console.log("src is set to" + $('#chatframe').attr('src')) }
                });
                dggChat = $("ytd-live-chat-frame")
                dggChat.empty()
                dggChat.css({
                    "flex-direction": "row",
                    "-webkit-flex-direction": "row",
                });
                url = "https://www.destiny.gg/embed/chat"
                dggChat.prepend(`<iframe id="chatframe" class="dggChat" style="flex: auto;" src="${url}"></iframe>`)
            }
        });
    } else {
        browser.storage.sync.set({ "checkbox": false });
        let [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        browser.scripting.executeScript({
            target: { tabId: tab.id },
            function: async() => {
                dggChat = $("ytd-live-chat-frame")
                dggChat.empty()
                dggChat.css({
                    "flex-direction": "column",
                    "-webkit-flex-direction": "column",
                });
                browser.storage.sync.get(["src"], function(result) {
                    id = result.src
                    dggChat.prepend(`<!--css-build:shady--><iframe frameborder="0" scrolling="no" id="chatframe" class="style-scope ytd-live-chat-frame" src="${id}"></iframe>
                <dom-if class="style-scope ytd-live-chat-frame"><template is="dom-if"></template></dom-if>
                <div id="show-hide-button" class="style-scope ytd-live-chat-frame"><ytd-toggle-button-renderer class="style-scope ytd-live-chat-frame" use-keyboard-focused="" system-icons="" is-paper-button="" button-renderer="true"><a class="yt-simple-endpoint style-scope ytd-toggle-button-renderer" tabindex="-1"><tp-yt-paper-button id="button" class="style-scope ytd-toggle-button-renderer" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false"><!--css-build:shady--><yt-formatted-string id="text" class="style-scope ytd-toggle-button-renderer">Hide chat replay</yt-formatted-string></tp-yt-paper-button></a></ytd-toggle-button-renderer></div>`)
                });
            }
        });
    }
});

$('body').on('click', 'a[target="popout"]', function(x) {
    x.preventDefault();
    browser.tabs.create({ url: $(this).prop('href'), active: false });
    return false;
});