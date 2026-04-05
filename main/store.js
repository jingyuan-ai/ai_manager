const { app } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * 数据目录解析规则（优先级从高到低）：
 *  1. 环境变量 AI_MANAGER_DATA_DIR（多机同步时可指向共享路径）
 *  2. 开发模式：项目根目录下的 data/（app.getAppPath() 即项目根）
 *  3. 打包后：.app 文件同级目录下的 data/（方便打包分发时数据跟随）
 */
let _dataDir = null
function getDataDir() {
  if (_dataDir) return _dataDir
  if (process.env.AI_MANAGER_DATA_DIR) {
    _dataDir = process.env.AI_MANAGER_DATA_DIR
  } else if (!app.isPackaged) {
    // 开发模式：项目根目录/data
    _dataDir = path.join(app.getAppPath(), 'data')
  } else {
    // 打包后：.app 文件所在目录/data
    _dataDir = path.join(path.dirname(app.getPath('exe')), 'data')
  }
  fs.mkdirSync(_dataDir, { recursive: true })
  return _dataDir
}

function getDataFile() {
  return path.join(getDataDir(), 'tasks.json')
}

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

module.exports = { getAllTasks, createTask, updateTask, deleteTask, getDataDir }
