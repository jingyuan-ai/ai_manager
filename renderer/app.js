/**
 * 应用入口 —— 路由、全局状态、模块协调
 */

let currentView = 'inbox'
let allTasks = []

// 各模块映射
const MODULES = {
  'inbox': window.InboxModule,
  'next-actions': window.NextActionsModule,
  'projects': window.ProjectsModule,
  'waiting': window.WaitingModule,
  'someday': window.SomedayModule,
  'archive': window.ArchiveModule
}

// ==================== 初始化 ====================

async function init() {
  // 从主进程加载所有任务
  allTasks = await window.electronAPI.tasks.getAll()

  // 渲染侧边栏导航
  setupSidebar()

  // 渲染当前视图
  renderView(currentView)

  // 监听主进程发来的「聚焦 Inbox」指令（全局快捷键触发）
  window.electronAPI.onFocusInbox(() => {
    switchView('inbox')
    setTimeout(() => window.InboxModule.focusInput(), 100)
  })
}

// ==================== 侧边栏 ====================

function setupSidebar() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view)
    })
  })
  updateBadges()
}

function switchView(view) {
  currentView = view

  // 更新高亮
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view)
  })

  renderView(view)
}

function updateBadges() {
  const inboxCount   = allTasks.filter(t => t.status === 'inbox').length
  const nextCount    = allTasks.filter(t => t.status === 'next_action').length
  const projectsCount = allTasks.filter(t => t.status === 'project').length
  const waitingCount = allTasks.filter(t => t.status === 'waiting').length
  const somedayCount = allTasks.filter(t => t.status === 'someday' || t.status === 'reference').length

  setBadge('inbox-badge', inboxCount)
  setBadge('next-badge', nextCount)
  setBadge('projects-badge', projectsCount)
  setBadge('waiting-badge', waitingCount)
  setBadge('someday-badge', somedayCount)
  // 归档不显示角标（历史数据数量没有提醒意义）
  setBadge('archive-badge', 0)
}

function setBadge(id, count) {
  const el = document.getElementById(id)
  if (!el) return
  if (count > 0) {
    el.textContent = count
    el.style.display = ''
  } else {
    el.style.display = 'none'
  }
}

// ==================== 视图渲染 ====================

function renderView(view) {
  const content = document.getElementById('content')
  const module = MODULES[view]
  if (!module) return

  switch (view) {
    case 'inbox':
      module.render(content, allTasks, openDecisionPanel)
      break
    case 'next-actions':
      module.render(content, allTasks)
      break
    case 'projects':
      module.render(content, allTasks)
      break
    case 'waiting':
      module.render(content, allTasks)
      break
    case 'someday':
      module.render(content, allTasks)
      break
    case 'archive':
      // 归档视图自己从主进程加载数据，不依赖 allTasks
      module.render(content)
      break
  }
}

// ==================== 判定面板 ====================

function openDecisionPanel(task) {
  window.Decision.open(task, onDecisionComplete)
}

function onDecisionComplete(updatedTask, message) {
  // 更新本地缓存
  const idx = allTasks.findIndex(t => t.id === updatedTask.id)
  if (idx !== -1) allTasks[idx] = updatedTask

  // 刷新当前视图和角标
  renderView(currentView)
  updateBadges()

  // 短暂显示操作反馈
  showToast(message)
}

// ==================== 全局刷新（供各模块调用） ====================

window.App = {
  async refresh() {
    allTasks = await window.electronAPI.tasks.getAll()
    renderView(currentView)
    updateBadges()
  }
}

// ==================== Toast 提示 ====================

function showToast(message) {
  let toast = document.getElementById('toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast'
    toast.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.78);
      color: white;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      z-index: 999;
      transition: opacity 0.25s;
      pointer-events: none;
    `
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.style.opacity = '1'
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0'
  }, 2000)
}

// ==================== 键盘快捷键 ====================

document.addEventListener('keydown', (e) => {
  // Cmd+1~6 切换视图
  if (e.metaKey && !e.shiftKey) {
    const views = ['inbox', 'next-actions', 'projects', 'waiting', 'someday', 'archive']
    const num = parseInt(e.key)
    if (num >= 1 && num <= views.length) {
      e.preventDefault()
      switchView(views[num - 1])
    }
  }
  // Escape 关闭弹层
  if (e.key === 'Escape') {
    window.Decision && window.Decision.close()
  }
})

// ==================== 启动 ====================

document.addEventListener('DOMContentLoaded', init)
