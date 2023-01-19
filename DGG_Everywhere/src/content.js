function isDGGLoaded() {
    let src = $('#chatframe').attr('src')
    return src == "https://www.destiny.gg/embed/chat"
}

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

function updateYoutubeSrc() {
    if (window.location.href.indexOf('youtube.com/watch') > -1) {
        // save youtube url to storage for the popup 
        chrome.storage.sync.set({"youtubeChatSrc": "https://www.youtube.com/live_chat?v=" + window.location.href.substring(window.location.href.lastIndexOf('=') + 1)})
    }
}

function CHAT_REPLACER_9000() {
    // that one function im too lazy to split up

    // try catch for some GET errors from the twitch api
    try {
        if (window.location.href.indexOf('youtube.com/watch') > -1) {
            console.log("CONTENT YOUTUBE")
            // save youtube url to storage for the popup if it is not the dgg chat
            updateYoutubeSrc()

            // test to see if the src is saved
            chrome.storage.sync.get("youtubeChatSrc", function(result) {
                console.log("YOUTUBE = ", result.youtubeChatSrc)
            });
            
            chrome.storage.sync.get("checkbox", function(result) {
                if (result.checkbox == true && isDGGLoaded() == false) {

                    const intervalId = setInterval(() => {
                        if ($('ytd-live-chat-frame').length && $('#chatframe').length) {

                            loadDGGYT();
                            if ($(`iframe[class*=dggChat]`).length){
                                clearInterval(intervalId);
                            }
                        }
                    }, 500);
            }});
        } 
        else if (window.location.href.indexOf('twitch.tv') > -1) {

            // if the checkbox is not checked append the proper chat to the page
            twitchChatSrc = `https://www.twitch.tv/popout/${
                window.location.href.substring(
                    window.location.href.lastIndexOf('/') + 1
                    )
                }/chat?popout=`
            
                console.log("CONTENT TWITCH")

            // save twitch url to storage for the popup
            chrome.storage.sync.set({"twitchChatSrc": twitchChatSrc})
            
            chrome.storage.sync.get("twitchChatSrc", function(result) {
                console.log("TWITCH = ", result.twitchChatSrc)
            });
            chrome.storage.sync.get("checkbox", function(result) {
                if (result.checkbox == true && isDGGLoaded() == false) {
                    const intervalId = setInterval(() => {
                        if ($(`div[class*=channel-root__right-column]`)) {
                            console.log("TRYING")
                            loadDGGTW();
                            if ($(`iframe[class*=dggChat]`).length){
                                console.log("LOADED")
                                clearInterval(intervalId);
                            }
                        }
                    }, 500);
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
}

// run the function on page load
document.addEventListener('DOMContentLoaded', function() {
    CHAT_REPLACER_9000();
});

let lastUrl = location.href; 
// run the function on url change
new MutationObserver(() => {
    const url = location.href;

    if (url !== lastUrl) {
        lastUrl = url;

        CHAT_REPLACER_9000();
    }
}).observe(document, {subtree: true, childList: true});

// update the chat src on youtube when message is received from background.js
// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//         if (request.message == "updateSrc") {
//             if (window.location.href.indexOf('youtube.com/watch') > -1) {
//                 updateYoutubeSrc()
//                 sendResponse({message: "src updated for youtube"});
//                 }
//             } 
//         }
// );