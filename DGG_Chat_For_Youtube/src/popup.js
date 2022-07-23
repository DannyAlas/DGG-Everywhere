const checkbox = document.querySelector("input[name=checkbox]");
chrome.storage.sync.get(["checkbox"], async function(result) {
    if (result.checkbox != null) {
        document.getElementById("checkbox").checked = result.checkbox
    } else { document.getElementById("checkbox").checked = false }
});

checkbox.addEventListener("change", async(e) => {
    if (e.target.checked) {
        chrome.storage.sync.set({ "checkbox": true });
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async() => {
                chrome.storage.sync.set({
                    "src": $('#chatframe').attr('src'),
                    function() { console.log("src is set to" + $('#chatframe').attr('src')) }
                });
                ytChat = $("ytd-live-chat-frame")
                ytChat.empty()
                ytChat.css({
                    "flex-direction": "row",
                    "-webkit-flex-direction": "row",
                });
                url = "https://www.destiny.gg/embed/chat"
                ytChat.prepend(`<iframe id="chatframe" class="dggChat" style="flex: auto;" src="${url}"></iframe>`)
    
                twitch_chat = $(`div[class^='Layout-sc-nxg1ff-0 SVxtW chat-shell chat-shell__expanded']`);
                twitch_chat.empty();
                twitch_chat.prepend(`<div style="display:block; height: 100% !important; width: 100% !important;"><iframe id="chatframe" class="dggChat" style="height: 100% !important; width: 100% !important; display: block;" src="${url}"></iframe></div>`)
                
            }
        });
    } else if (!e.target.checked) {
        chrome.storage.sync.set({ "checkbox": false });
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let streamer = tab.url.substring(tab.url.lastIndexOf('/') + 1);
        twitchSrc = `https://www.twitch.tv/popout/${streamer}/chat?popout=`
        chrome.storage.sync.set({
            "twitchSrc": twitchSrc });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async() => {

                ytChat = $("ytd-live-chat-frame")
                ytChat.empty()
                ytChat.css({
                    "flex-direction": "column",
                    "-webkit-flex-direction": "column",
                });
                
                chrome.storage.sync.get(["src"], function(result) {
                    id = result.src
                    ytChat.prepend(`<!--css-build:shady--><iframe frameborder="0" scrolling="no" id="chatframe" class="style-scope ytd-live-chat-frame" src="${id}"></iframe>
                <dom-if class="style-scope ytd-live-chat-frame"><template is="dom-if"></template></dom-if>
                <div id="show-hide-button" class="style-scope ytd-live-chat-frame"><ytd-toggle-button-renderer class="style-scope ytd-live-chat-frame" use-keyboard-focused="" system-icons="" is-paper-button="" button-renderer="true"><a class="yt-simple-endpoint style-scope ytd-toggle-button-renderer" tabindex="-1"><tp-yt-paper-button id="button" class="style-scope ytd-toggle-button-renderer" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false"><!--css-build:shady--><yt-formatted-string id="text" class="style-scope ytd-toggle-button-renderer">Hide chat replay</yt-formatted-string></tp-yt-paper-button></a></ytd-toggle-button-renderer></div>`)
                });

                
                chrome.storage.sync.get("twitchSrc", function(src) {
                    src = src.twitchSrc
                    twitch_chat = $(`div[class^='Layout-sc-nxg1ff-0 SVxtW chat-shell chat-shell__expanded']`);
                    twitch_chat.empty();
                    twitch_chat.prepend(`<div style="display:block; height: 100% !important; width: 100% !important;"><iframe style="display:block; height: 100% !important; width: 100% !important;" src="${src}"></iframe></div>`);
                });
            }
        });
    }
});

$('body').on('click', 'a[target="popout"]', function(x) {
    x.preventDefault();
    chrome.tabs.create({ url: $(this).prop('href'), active: false });
    return false;
});
