const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    create: (fields) => ipcRenderer.invoke('tasks:create', fields),
    update: (id, fields) => ipcRenderer.invoke('tasks:update', id, fields),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    getArchive: () => ipcRenderer.invoke('tasks:getArchive')
  },
  onFocusInbox: (callback) => {
    ipcRenderer.on('app:focusInbox', callback)
  }
})
