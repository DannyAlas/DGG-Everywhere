const checkbox = document.querySelector("input[name=checkbox]");
chrome.storage.sync.get(["checkbox"], async function(result) {
    if (result.checkbox != null) {
        document.getElementById("checkbox").checked = result.checkbox
    } else { document.getElementById("checkbox").checked = false }
});

function loadDGGTW() {
    twitch_chat = $(`div[class*=channel-root__right-column]`);
    
    console.log(
        '%c[DGG] %cPEEPO POOFING TWITCH CHAT AWAY',
        'color: #538CC6',
        'color: #6F859A',
    );
    twitch_chat.empty();
    // console.log("POOF")
    url = "https://www.destiny.gg/embed/chat"
    twitch_chat.prepend(`<div style="display:block; height: 100% !important; width: 100% !important;"><iframe id="chatframe" class="dggChat" style="height: 100% !important; width: 100% !important; display: block;" src="${url}"></iframe></div>`)
}

function loadDGGYT() {
    dggChat = $("ytd-live-chat-frame")
    console.log(
        '%c[DGG] %cPEEPO POOFING YOUTUBE CHAT AWAY',
        'color: #538CC6',
        'color: #6F859A',
    );
    dggChat.empty()
    dggChat.css({
        "flex-direction": "row",
        "-webkit-flex-direction": "row",
    });
    url = "https://www.destiny.gg/embed/chat"
    dggChat.prepend(`<iframe id="chatframe" class="dggChat" style="flex: auto;" src="${url}"></iframe>`)
}

checkbox.addEventListener("change", async(e) => {
    if (e.target.checked) {
        chrome.storage.sync.set({ "checkbox": true });
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async() => {
                if (window.location.href.indexOf('youtube.com') > -1) {
                    // set the youtube chat src of the src of the chatframe
                    chrome.storage.sync.set({"youtubeChatSrc": "https://www.youtube.com/live_chat?v=" + window.location.href.substring(window.location.href.lastIndexOf('=') + 1)})
                    
                    // load the dgg chat
                    loadDGGYT()
                    
                } 
                else if (window.location.href.indexOf('twitch.tv') > -1) {

                    // set the twitch chat src from the window url
                    chrome.storage.sync.set({"twitchChatSrc": `https://www.twitch.tv/popout/${
                        window.location.href.substring(
                            window.location.href.lastIndexOf('/') + 1
                            )
                        }/chat?popout=`})

                    // get the chatframe and empty it
                    if ($(`div[class*=channel-root__right-column]`)) {
                        loadDGGTW();
                        if ($(`iframe[class*=dggChat]`).length){
                            clearInterval(intervalId);
                        }
                    }
                }
            }
        });
    } else if (!e.target.checked) {
        chrome.storage.sync.set({ "checkbox": false });

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            const tab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: async() => {

                    console.log("UNPOOFING")
                    if (window.location.href.indexOf('youtube.com') > -1) {

                        chrome.storage.sync.get(["youtubeChatSrc"], function(result) {
                            id = `${result.youtubeChatSrc}`
                            ytChat = $("ytd-live-chat-frame")
                            ytChat.empty()
                            ytChat.css({
                                "flex-direction": "column",
                                "-webkit-flex-direction": "column",
                            });
                            ytChat.prepend(
                                `<!--css-build:shady--><iframe frameborder="0" scrolling="no" id="chatframe" class="style-scope ytd-live-chat-frame" src="${id}"></iframe>
                                <dom-if class="style-scope ytd-live-chat-frame"><template is="dom-if"></template></dom-if>
                                <div id="show-hide-button" class="style-scope ytd-live-chat-frame"><ytd-toggle-button-renderer class="style-scope ytd-live-chat-frame" use-keyboard-focused="" system-icons="" is-paper-button="" button-renderer="true"><a class="yt-simple-endpoint style-scope ytd-toggle-button-renderer" tabindex="-1"><tp-yt-paper-button id="button" class="style-scope ytd-toggle-button-renderer" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false"><!--css-build:shady--><yt-formatted-string id="text" class="style-scope ytd-toggle-button-renderer">Hide chat replay</yt-formatted-string></tp-yt-paper-button></a></ytd-toggle-button-renderer></div>`)
                                });
                    }

                    else if (window.location.href.indexOf('twitch.tv') > -1) {
                        chrome.storage.sync.get("twitchChatSrc", function(src) {
                            src = src.twitchChatSrc
                            twitch_chat = $(`div[class*=channel-root__right-column]`);
                            twitch_chat.empty();
                            twitch_chat.prepend(`<div style="display:block; height: 100% !important; width: 100% !important;"><iframe style="display:block; height: 100% !important; width: 100% !important;" src="${src}"></iframe></div>`);
                        });
                    }
                }
            });
        });    
    }
});

$('body').on('click', 'a[target="popout"]', function(x) {
    x.preventDefault();
    chrome.tabs.create({ url: $(this).prop('href'), active: false });
    return false;
});
