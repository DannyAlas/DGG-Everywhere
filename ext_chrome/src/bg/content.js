function showDGG() {
    ytChat = $("ytd-live-chat-frame")

    ytChat.empty()

    ytChat.css({
        "flex-direction": "row",
        "-webkit-flex-direction": "row",
    })

    url = `https://www.destiny.gg/embed/chat`

    ytChat.prepend(
        `<iframe style="flex: auto;" src="${url}">
        </iframe>`
    )

}

showDGG()