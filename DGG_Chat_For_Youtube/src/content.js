function isDGGLoaded() {
    let src = $('#chatframe').attr('src')
    return src == "https://www.destiny.gg/embed/chat"
}

function loadDGGTW() {
    chrome.storage.sync.get("checkbox", function(result) {
        if (result.checkbox == true && isDGGLoaded() == false) {
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
    });
}

function loadDGGYT() {
    chrome.storage.sync.get("checkbox", function(result) {
        if (result.checkbox == true && isDGGLoaded() == false) {
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
    });
};

document.onreadystatechange = function() {
    if (document.readyState === 'complete') {

        try {
            if (window.location.href.indexOf('youtube.com') > -1) {
                ObserverYT = new MutationObserver((mutationList, ObserverYT) => {
                    if ($("ytd-live-chat-frame").length && $("#chatframe").length) {
                        loadDGGYT()
                        ObserverYT.disconnect();
                    }}
                );
                ObserverYT.observe($('ytd-app')[0], {childList: true, subtree: true});
            } else if (window.location.href.indexOf('twitch.tv') > -1) {

                observerTW = new MutationObserver((mutationList, observer) => {
                    if ($(`div[class*=channel-root__right-column]`).length) {
                        loadDGGTW();
                        observerTW.disconnect();
                    }}
                );
                // this works for the most part but can have funky AdBlock behavior, not sure why yet
                observerTW.observe($(`div[class*=channel-root__right-column]`)[0], {childList: true, subtree: true});
            }
        } catch (e) {
            console.log(e);
        }
    }
}