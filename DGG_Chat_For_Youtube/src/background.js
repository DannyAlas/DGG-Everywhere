// for future use of multiple chat sources in the future

// async function activeTab(activeInfo) {
//     chrome.tabs.query({'active':true,'currentWindow':true}, async function(array_of_tabs){
//         if (array_of_tabs[0].url.indexOf('youtube.com/watch') > -1) {
//             // message the content script to update the src
//             await chrome.tabs.sendMessage(array_of_tabs[0].id, {message: "updateSrc"}, async function(response) {
//                 let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//                 if(chrome.runtime.lastError || !response) {
//                     console.log('script is not injected yet')
//                     chrome.scripting.executeScript({
//                         target: {tabId: tab.id, allFrames: true},
//                         files: ['src/content.js'],
//                     });
//                 } else if (response){
//                     console.log(response.message);
//                 }
//             });
//         }
//     });
// }

// chrome.tabs.onActivated.addListener(activeTab)