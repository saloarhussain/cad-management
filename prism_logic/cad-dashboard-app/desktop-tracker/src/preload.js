const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (email, password) => ipcRenderer.invoke('login', { email, password }),
  startTracking: (projectId) => ipcRenderer.invoke('start-tracking', { projectId }),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),
});
