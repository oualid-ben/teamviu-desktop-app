'use strict';

const path = require('path');
const {app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, powerMonitor, dialog} = require('electron');
const unhandled = require('electron-unhandled');
const contextMenu = require('electron-context-menu');
const {is} = require('electron-util');
const log = require('electron-log');
const menu = require('./src/menu');
const updator = require("./src/updator");
const tray = require('./src/tray');
const process = require('./src/process');
const profiler = require('./src/profiler');
const syncer = require('./src/activitySync');
const {API, BASE_URL} = require('./src/config');

// Prevent window from being garbage collected
let mainWindow;
let loadingWindow;
let iconPath = path.join(__dirname, 'static', 'icon.png');

// Prevent multiple instances of the app
const applock = app.requestSingleInstanceLock();
if (!applock) {
	app.quit();
} else {
	unhandled();
	contextMenu();

	// Note: Must match `build.appId` in package.json
	app.setAppUserModelId('io.teamviu.app');
	// app.commandLine.appendSwitch("disable-http-cache");

	const createLoadingWindow = async () => {
		loadingWindow = new BrowserWindow({
			title: "Teamviu - Remote Team & Project Management",
			show: true,
			width: 150,
			height: 150,
			frame: false,
			icon: iconPath,
			webPreferences: {
				nodeIntegration: false,
				enableRemoteModule: false,
				contextIsolation: true,
				sandbox: true,
			}
		});

		loadingWindow.on('closed', () => {
			loadingWindow = undefined;
		});

		await loadingWindow.loadFile(path.join(__dirname, 'loading.html'));

		return loadingWindow;
	};

	const createMainWindow = async () => {
		mainWindow = new BrowserWindow({
			title: "Teamviu - Remote Team & Project Management",
			show: false,
			width: 1280,
			height: 800,
			icon: iconPath,
			webPreferences: {
				preload: path.join(__dirname, './preload.js'),
				nodeIntegration: false,
				enableRemoteModule: false,
				contextIsolation: true,
				sandbox: true,
			}
		});

		mainWindow.on('ready-to-show', () => {
			loadingWindow && loadingWindow.close();
			if (loadingWindow && !loadingWindow.isDestroyed()) {
				log.info("Loading window wasnt destroyed");
				loadingWindow.hide();
			}
			loadingWindow = undefined;
			mainWindow.show();
		});

		mainWindow.webContents.on('did-fail-load', () => {
			dialog.showMessageBox({
				type: 'error',
				message: `Unable to fetch contents`,
				detail: 'Check your internet connection. Select "Reload" from "View" menu to refresh contents',
				buttons: ['Ok'],
				cancelId: 0,
				defaultId: 0
			}).then(function (result) {
			});
		});

		mainWindow.on('closed', () => {
			// Dereference the window
			// For multiple windows store them in an array
			mainWindow = undefined;
		});

		mainWindow.on('page-title-updated', function (e) {
			e.preventDefault();
		});

		await loadURL();
		// await mainWindow.maximize();

		return mainWindow;
	};

	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}
			mainWindow.show();
		}
	});

	app.on('window-all-closed', () => {
		if (!is.macos) {
			app.quit();
			tray.destroy();
		}
	});

	app.on('activate', async () => {
		if (!mainWindow) {
			await createLoadingWindow();
			await createMainWindow();
		}
	});
	process.applyEventListeners();

	(async () => {
		await app.whenReady();
		Menu.setApplicationMenu(menu);
		tray.createTray(mainWindow);
		await createLoadingWindow();
		await createMainWindow();
		updator.checkForUpdates();
		if (is.development) {
			setInterval(profiler.logPerformanceMetrics, 5000);
		}
		setInterval(syncer.doSync, 120000);
	})();
}

async function loadURL() {
	try {
		await mainWindow.loadURL(BASE_URL);
	} catch (err) {

	}
}
