/**
 * 工作篮（Inbox）模块
 * 快速输入 + 等待判定的任务列表
 */

window.InboxModule = {
  render(container, tasks, onDecide) {
    const inboxTasks = tasks.filter(t => t.status === 'inbox')

    container.innerHTML = `
      <div class="content-header">
        <h1>📥 工作篮</h1>
      </div>
      <div class="content-body">
        <div class="quick-input-wrap">
          <input
            class="quick-input"
            id="inbox-input"
            type="text"
            placeholder="有什么需要处理的？按 Enter 快速记录..."
            autocomplete="off"
          />
        </div>
        <div class="task-list" id="inbox-list">
          ${inboxTasks.length === 0 ? renderEmpty() : inboxTasks.map(renderTaskItem).join('')}
        </div>
      </div>
    `

    // 绑定输入框 Enter 事件
    const input = container.querySelector('#inbox-input')
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const title = input.value.trim()
        if (!title) return
        input.value = ''
        const task = await window.electronAPI.tasks.create({ title, status: 'inbox' })
        // 重新渲染（通过 app.js 刷新）
        window.App && window.App.refresh()
      }
    })

    // 绑定任务点击 → 打开判定面板
    container.querySelectorAll('.task-item[data-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return
        const id = el.dataset.id
        const task = inboxTasks.find(t => t.id === id)
        if (task) onDecide(task)
      })
    })

    // 绑定删除按钮
    container.querySelectorAll('.delete-btn').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = el.dataset.id
        await window.electronAPI.tasks.delete(id)
        window.App && window.App.refresh()
      })
    })
  },

  focusInput() {
    const input = document.getElementById('inbox-input')
    if (input) input.focus()
  }
}

function renderTaskItem(task) {
  const time = formatTime(task.createdAt)
  return `
    <div class="task-item" data-id="${task.id}">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">${time}</div>
      <button class="delete-btn" data-id="${task.id}" title="删除"
        style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:16px;padding:2px 6px;border-radius:4px;-webkit-app-region:no-drag;"
        onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-secondary)'">
        ×
      </button>
    </div>
  `
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">📥</div>
      <div class="empty-text">工作篮是空的</div>
      <div class="empty-sub">把所有需要处理的事情记录在这里<br>然后逐一判定，清空工作篮</div>
    </div>
  `
}

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
