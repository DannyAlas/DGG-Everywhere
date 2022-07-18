changeChat.addEventListener("click", async() => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: showDGG,
    });
});

function showDGG() {
    ytChat = $("ytd-live-chat-frame")
    ytChat.empty()
    ytChat.css({
        "flex-direction": "row",
        "-webkit-flex-direction": "row",
    })
    url = `https://www.destiny.gg/embed/chat`
    ytChat.prepend(`<iframe style="flex: auto;" src="${url}"></iframe>`)
}

$('body').on('click', 'a[target="link"]', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: $(this).prop('href'), active: false });
    return false;
});