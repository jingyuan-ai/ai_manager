const { app } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * 数据目录解析规则（优先级从高到低）：
 *  1. 环境变量 AI_MANAGER_DATA_DIR（多机同步时可指向共享路径）
 *  2. 开发模式：项目根目录下的 data/
 *  3. 打包后：.app 文件同级目录下的 data/
 *
 * 文件拆分：
 *  - tasks.json   活跃任务（inbox / next_action / project / waiting / someday / reference）
 *  - archive.json 已完成 / 已删除任务（状态变为 done 或 deleted 时自动移入）
 */

const ARCHIVE_STATUSES = new Set(['done', 'deleted'])

let _dataDir = null
function getDataDir() {
  if (_dataDir) return _dataDir
  if (process.env.AI_MANAGER_DATA_DIR) {
    _dataDir = process.env.AI_MANAGER_DATA_DIR
  } else if (!app.isPackaged) {
    _dataDir = path.join(app.getAppPath(), 'data')
  } else {
    _dataDir = path.join(path.dirname(app.getPath('exe')), 'data')
  }
  fs.mkdirSync(_dataDir, { recursive: true })
  return _dataDir
}

const getTasksFile = () => path.join(getDataDir(), 'tasks.json')

// 按季度归档：archive_2026_Q1.json / archive_2026_Q2.json ...
function getArchiveFile(date = new Date()) {
  const year    = date.getFullYear()
  const quarter = Math.ceil((date.getMonth() + 1) / 3)
  return path.join(getDataDir(), `archive_${year}_Q${quarter}.json`)
}

// ==================== 通用读写 ====================

function readFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { tasks: [], meta: { version: '1', lastModified: new Date().toISOString() } }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    console.error(`读取 ${filePath} 失败，返回空数据:`, e)
    return { tasks: [], meta: { version: '1', lastModified: new Date().toISOString() } }
  }
}

function writeFile(filePath, data) {
  data.meta.lastModified = new Date().toISOString()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

const readStore   = () => readFile(getTasksFile())
const writeStore  = (d) => writeFile(getTasksFile(), d)
const readArchive  = (file) => readFile(file)
const writeArchive = (file, d) => writeFile(file, d)

// 找到某个任务 id 所在的归档文件（遍历所有季度文件）
function findArchiveFileById(id) {
  const dir = getDataDir()
  const files = fs.readdirSync(dir).filter(f => /^archive_\d{4}_Q[1-4]\.json$/.test(f))
  for (const f of files) {
    const fullPath = path.join(dir, f)
    const data = readFile(fullPath)
    if (data.tasks.some(t => t.id === id)) return fullPath
  }
  return null
}

// ==================== 工具 ====================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ==================== CRUD ====================

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

  // 活跃列表中没有，可能在归档里（如归档任务被重新激活）
  if (idx === -1) {
    return updateArchiveTask(id, fields)
  }

  const updated = {
    ...store.tasks[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString()
  }

  if (ARCHIVE_STATUSES.has(updated.status)) {
    // 状态变为 done/deleted → 移入当前季度归档文件
    store.tasks.splice(idx, 1)
    writeStore(store)
    const archiveFile = getArchiveFile(new Date())
    const archive = readArchive(archiveFile)
    archive.tasks.push(updated)
    writeArchive(archiveFile, archive)
  } else {
    store.tasks[idx] = updated
    writeStore(store)
  }

  return updated
}

// 归档文件里的任务更新（主要用于从归档恢复到活跃状态）
function updateArchiveTask(id, fields) {
  const archiveFile = findArchiveFileById(id)
  if (!archiveFile) throw new Error(`任务 ${id} 不存在`)

  const archive = readArchive(archiveFile)
  const idx = archive.tasks.findIndex(t => t.id === id)

  const updated = {
    ...archive.tasks[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString()
  }

  if (!ARCHIVE_STATUSES.has(updated.status)) {
    // 状态变回活跃 → 从归档移回主文件
    archive.tasks.splice(idx, 1)
    writeArchive(archiveFile, archive)
    const store = readStore()
    store.tasks.push(updated)
    writeStore(store)
  } else {
    archive.tasks[idx] = updated
    writeArchive(archiveFile, archive)
  }

  return updated
}

function deleteTask(id) {
  // 先从主文件找
  const store = readStore()
  const idx = store.tasks.findIndex(t => t.id === id)
  if (idx !== -1) {
    const task = { ...store.tasks[idx], status: 'deleted', updatedAt: new Date().toISOString() }
    store.tasks.splice(idx, 1)
    writeStore(store)
    const archive = readArchive()
    archive.tasks.push(task)
    writeArchive(archive)
    return
  }

  // 再从归档找（直接硬删除归档记录）
  const archiveFile = findArchiveFileById(id)
  if (archiveFile) {
    const archive = readArchive(archiveFile)
    archive.tasks = archive.tasks.filter(t => t.id !== id)
    writeArchive(archiveFile, archive)
  }
}

module.exports = { getAllTasks, createTask, updateTask, deleteTask, getDataDir }
