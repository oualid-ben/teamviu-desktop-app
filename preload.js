// preload.js
const {contextBridge, ipcRenderer} = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
	"api", {
		send: (channel, data) => {
			// whitelist channels
			let validChannels = ["start-work", "stop-work", "notification", "get-version", "set-auth"];
			if (validChannels.includes(channel)) {
				ipcRenderer.send(channel, data);
			}
		},
		receive: (channel, func) => {
			console.log("Inside receive", channel);
			let validChannels = ["get-version-result", "show-accessibility-dialog"];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.once(channel, (event, ...args) => func(...args));
			}
		}
	}
);
