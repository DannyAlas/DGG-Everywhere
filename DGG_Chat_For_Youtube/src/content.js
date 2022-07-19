function isDGGLoaded() {
    let src = $('#chatframe').attr('src')
    return src == "https://www.destiny.gg/embed/chat"
}



function loadDGG() {
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
        } else { console.log("DGG WON'T BE LOADED " + result.checkbox + isDGGLoaded()); }
    });
};

function doLoad1() { chrome.storage.sync.get("checkbox", function(result) { console.log("aaaaaaaaaaaaaaaaa " + result.checkbox) }) }

// I FOR THE LIFE OF ME CANNOT GET THIS TO WORK WITHOUT A DELAY! 
// Checking the DOM fully loads doesn't work.

document.onreadystatechange = function() {
    if (document.readyState === 'complete') {
        setTimeout(() => { loadDGG() }, 500);;
    }
}