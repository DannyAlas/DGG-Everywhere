const DEBUG = false;

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
    // try catch for some GET errors from the twitch api
    try {
        if (window.location.href.indexOf('youtube.com/watch') > -1) {
            // save youtube url to storage for the popup if it is not the dgg chat
            updateYoutubeSrc()

            // test to see if the src is saved
            chrome.storage.sync.get("youtubeChatSrc", function(result) {
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
        else if (window.location.href.indexOf('kick.com') > -1) {
            // KICK IS NOT A FAN OF JQUERY SO WE HAVE TO USE VANILLA JS
            // wait for the chat to load
            const intervalId = setInterval(() => {
                if (document.getElementsByClassName("chatroom")[0]) {
                    // save kick url to storage for the popup if it is not the dgg chat
                    chrome.storage.sync.set({"kickChatSrc": `https://kick.com/${
                                window.location.href.substring(
                                    window.location.href.lastIndexOf('/') + 1
                                    )
                                }/chatroom`})
                    
                    chrome.storage.sync.get("checkbox", function(result) {
                        kickChat = document.getElementsByClassName("chatroom")[0]
                        clearInterval(intervalId);
                        if (result.checkbox == true && kickChat.getAttribute("src") != "https://www.destiny.gg/embed/chat") {

                            if (kickChat) {
                                console.log(
                                    '%c[DGG] %cPEEPO POOFING KICK CHAT AWAY',
                                    'color: #538CC6',
                                    'color: #6F859A',
                                );
                                // remove all children from the chat
                                while (kickChat.firstChild) {
                                    kickChat.removeChild(kickChat.firstChild);
                                }
                                // set the flex direction to row
                                kickChat.setAttribute("style", "flex-direction: row; -webkit-flex-direction: row;")
                                // add the iframe with dgg chat
                                chat = document.createElement("iframe")
                                chat.setAttribute("id", "dggChat")
                                chat.setAttribute("class", "chatframe")
                                chat.setAttribute("style", "flex: auto;")
                                chat.setAttribute("src", "https://www.destiny.gg/embed/chat")
                                kickChat.appendChild(chat)     
                            }

                    }});

                }
            }, 500);

        }
        else if (window.location.href.indexOf('rumble.com') > -1) {
            const intervalId = setInterval(() => {
                if (document.getElementsByClassName("chat--container")[0]) {
                    // save kick url to storage for the popup if it is not the dgg chat
                    channel_id = document.getElementsByClassName("rumbles-vote")[0].getAttribute("data-id")
                    chrome.storage.sync.set({"rumbleChatSrc": `https://rumble.com/chat/popup/${
                        channel_id
                    }`})
                    
                    chrome.storage.sync.get("checkbox", function(result) {
                        clearInterval(intervalId);
                        
                        if (result.checkbox == true && document.getElementById("dggChat") == null) {
                            rumbleChat = document.getElementsByClassName("chat--container")[0]
                            if (rumbleChat) {
                                console.log(
                                    '%c[DGG] %cPEEPO POOFING RUMBLE CHAT AWAY',
                                    'color: #538CC6',
                                    'color: #6F859A',
                                );
                                // remove all children from the chat
                                while (rumbleChat.firstChild) {
                                    rumbleChat.removeChild(rumbleChat.firstChild);
                                }
                                // add the iframe with dgg chat
                                chat = document.createElement("iframe")
                                chat.setAttribute("id", "dggChat")
                                chat.setAttribute("class", "chat--container container")
                                chat.setAttribute("style", "width: 400px; border: 0;")
                                chat.setAttribute("src", "https://www.destiny.gg/embed/chat")
                                rumbleChat.appendChild(chat)     
                            }
                            clearInterval(intervalId);

                    }
                });

                }
            }, 500);
        }


    } catch (e) {
        console.log(e);
    }
}

let lastUrl = location.href; 
// run the function on page load
document.addEventListener('DOMContentLoaded', function() {
    CHAT_REPLACER_9000();
});

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