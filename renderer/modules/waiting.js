/**
 * 等待列表（Waiting）模块
 * 已指派给他人的任务，跟进提醒
 */

window.WaitingModule = {
  render(container, tasks) {
    const waiting = tasks.filter(t => t.status === 'waiting')
    const now = new Date()

    container.innerHTML = `
      <div class="content-header">
        <h1>⏳ 等待列表</h1>
        <span style="font-size:13px;color:var(--text-secondary)">${waiting.length} 条</span>
      </div>
      <div class="content-body">
        ${waiting.length === 0 ? renderEmpty() : waiting.map(t => renderWaitingItem(t, now)).join('')}
      </div>
    `

    // 绑定「已收到回复」按钮 → 标记完成
    container.querySelectorAll('.received-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        await window.electronAPI.tasks.update(id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })
  }
}

function renderWaitingItem(task, now) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < now
  const dueStr = task.dueDate
    ? `截止：${formatDate(task.dueDate)}`
    : '无截止时间'

  return `
    <div class="waiting-item ${isOverdue ? 'overdue' : ''}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500">${escapeHtml(task.title)}</div>
          <div class="waiting-assignee">👤 ${escapeHtml(task.assignee || '未指定')}</div>
          <div class="waiting-due ${isOverdue ? 'overdue' : ''}">
            ${isOverdue ? '⚠️ 已超期 · ' : ''}${dueStr}
          </div>
        </div>
        <button class="received-btn" data-id="${task.id}"
          style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:4px 10px;
          font-size:12px;color:var(--text-secondary);cursor:pointer;-webkit-app-region:no-drag;flex-shrink:0;white-space:nowrap"
          onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
          已收到
        </button>
      </div>
    </div>
  `
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <div class="empty-text">没有等待中的任务</div>
      <div class="empty-sub">指派给他人的任务会出现在这里<br>方便跟进和提醒</div>
    </div>
  `
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
