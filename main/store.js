const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// 懒加载：app.getPath 只能在 app ready 后调用
let _dataFile = null
function getDataFile() {
  if (!_dataFile) _dataFile = path.join(app.getPath('userData'), 'tasks.json')
  return _dataFile
}
const DATA_FILE = null // 不再直接用，改用 getDataFile()

const EMPTY_STORE = {
  tasks: [],
  meta: {
    version: '1',
    lastModified: new Date().toISOString()
  }
}

function readStore() {
  const file = getDataFile()
  try {
    if (!fs.existsSync(file)) {
      writeStore({ ...EMPTY_STORE, meta: { version: '1', lastModified: new Date().toISOString() } })
      return { ...EMPTY_STORE }
    }
    const raw = fs.readFileSync(file, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('读取数据失败，重置为空:', e)
    const empty = { ...EMPTY_STORE, meta: { version: '1', lastModified: new Date().toISOString() } }
    writeStore(empty)
    return empty
  }
}

function writeStore(data) {
  const file = getDataFile()
  data.meta.lastModified = new Date().toISOString()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// CRUD 操作

function getAllTasks() {
  return readStore().tasks
}

function createTask(fields) {
  const store = readStore()
  const task = {
    id: generateId(),
    title: '',
    status: 'inbox',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    decidedAt: null,
    verbCheck: false,
    projectGoal: null,
    subtasks: [],
    nextActionId: null,
    assignee: null,
    dueDate: null,
    followUpAt: null,
    notes: null,
    parentProjectId: null,
    ...fields
  }
  store.tasks.push(task)
  writeStore(store)
  return task
}

function updateTask(id, fields) {
  const store = readStore()
  const idx = store.tasks.findIndex(t => t.id === id)
  if (idx === -1) throw new Error(`任务 ${id} 不存在`)
  store.tasks[idx] = {
    ...store.tasks[idx],
    ...fields,
    id, // 不允许修改 id
    updatedAt: new Date().toISOString()
  }
  writeStore(store)
  return store.tasks[idx]
}

function deleteTask(id) {
  const store = readStore()
  store.tasks = store.tasks.filter(t => t.id !== id)
  writeStore(store)
}

module.exports = { getAllTasks, createTask, updateTask, deleteTask }
