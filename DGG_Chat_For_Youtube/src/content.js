function isDGGLoaded() {
    let src = $('#chatframe').attr('src')
    return src == "https://www.destiny.gg/embed/chat"
}


function loadDGGTw() {
    chrome.storage.sync.get("checkbox", function(result) {
        if (result.checkbox == true && isDGGLoaded() == false) {
            twitch_chat = $(`div[class^='Layout-sc-nxg1ff-0 SVxtW chat-shell chat-shell__expanded']`);
            url = "https://www.destiny.gg/embed/chat"
            twitch_chat.empty();
            twitch_chat.prepend(`<div style="display:block; height: 100% !important; width: 100% !important;"><iframe id="chatframe" class="dggChat" style="height: 100% !important; width: 100% !important; display: block;" src="${url}"></iframe></div>`)
        } else { console.log("TWITCH WON'T BE LOADED"); }
    });
}

function loadDGGYT() {
    chrome.storage.sync.get("checkbox", function(result) {
        if (result.checkbox == true && isDGGLoaded() == false) {
            console.log("DGG WILL BE LOADED");
            dggChat = $("ytd-live-chat-frame")
            dggChat.empty()
            dggChat.css({
                "flex-direction": "row",
                "-webkit-flex-direction": "row",
            });
            url = "https://www.destiny.gg/embed/chat"
            dggChat.prepend(`<iframe id="chatframe" class="dggChat" style="flex: auto;" src="${url}"></iframe>`)
        } else { console.log("DGG WON'T BE LOADED"); }
    });
};

// I FOR THE LIFE OF ME CANNOT GET THIS TO WORK WITHOUT A DELAY! 
// Checking the DOM fully loads doesn't work.

// chrome.runtime.sendMessage({url: "url?"}, function(response) {
//     url = response.currentUrl;
//     console.log(url);
//     console.log("YT? " + (url.href.indexof('youtube.com') > -1));
//     if (url.href.indexof('youtube.com') > -1) {
//         document.onreadystatechange = function() {
//             if (document.readyState === 'complete') {
//                 console.log("DGG WILL BE LOADED");
//                 setTimeout(() => { loadDGGYT() }, 700);
//             }
//         }
//     } else if (url.href.indexof('twitch.tv') > -1) {
//             console.log("DGG WILL BE LOADED");
//             setTimeout(() => { loadDGGTw() }, 700);
//     }
// });

document.onreadystatechange = function() {
    if (document.readyState === 'complete') {
        setTimeout(() => { loadDGGYT() }, 500);;
    }
}