// electron/preload.js - 预加载脚本
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getBackendPort: () => ipcRenderer.invoke('backend:get-port'),
})