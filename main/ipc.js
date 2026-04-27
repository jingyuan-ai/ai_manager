const { ipcMain } = require('electron')
const store = require('./store')

function registerHandlers() {
  ipcMain.handle('tasks:getAll', () => {
    return store.getAllTasks()
  })

  ipcMain.handle('tasks:create', (_, fields) => {
    return store.createTask(fields)
  })

  ipcMain.handle('tasks:update', (_, id, fields) => {
    return store.updateTask(id, fields)
  })

  ipcMain.handle('tasks:delete', (_, id) => {
    store.deleteTask(id)
  })

  ipcMain.handle('tasks:getArchive', () => {
    return store.getArchivedTasks()
  })
}

module.exports = { registerHandlers }
