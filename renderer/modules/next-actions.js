/**
 * 下一步行动（Next Actions）模块
 * 按四象限排序：重要+紧急 → 重要 → 其他
 */

window.NextActionsModule = {
  render(container, tasks, onToggleTag) {
    const actions = tasks.filter(t => t.status === 'next_action')

    // 分组
    const groups = [
      {
        label: '🔴⚡ 重要且紧急',
        items: actions.filter(t => t.tags.includes('important') && t.tags.includes('urgent'))
      },
      {
        label: '🔴 重要',
        items: actions.filter(t => t.tags.includes('important') && !t.tags.includes('urgent'))
      },
      {
        label: '📋 其他行动',
        items: actions.filter(t => !t.tags.includes('important'))
      }
    ]

    const groupsHTML = groups
      .filter(g => g.items.length > 0)
      .map(g => `
        <div class="group-header">${g.label}</div>
        <div class="task-list">
          ${g.items.map(t => renderActionItem(t)).join('')}
        </div>
      `).join('')

    container.innerHTML = `
      <div class="content-header">
        <h1>⚡ 下一步行动</h1>
        <span style="font-size:13px;color:var(--text-secondary)">${actions.length} 条</span>
      </div>
      <div class="content-body">
        ${actions.length === 0 ? renderEmpty() : groupsHTML}
      </div>
    `

    // 绑定完成按钮
    container.querySelectorAll('.done-btn[data-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        await window.electronAPI.tasks.update(id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })

    // 绑定标签切换按钮
    container.querySelectorAll('.tag-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        const tag = btn.dataset.tag
        const task = tasks.find(t => t.id === id)
        if (!task) return
        const tags = task.tags.includes(tag)
          ? task.tags.filter(t => t !== tag)
          : [...task.tags, tag]
        await window.electronAPI.tasks.update(id, { tags })
        window.App && window.App.refresh()
      })
    })
  }
}

function renderActionItem(task) {
  const hasImportant = task.tags.includes('important')
  const hasUrgent = task.tags.includes('urgent')
  const scheduledStr = task.scheduledAt
    ? `<span style="font-size:11px;color:var(--accent)">📅 ${formatDate(task.scheduledAt)}</span>`
    : ''

  return `
    <div class="task-item" data-id="${task.id}">
      <button class="done-btn" data-id="${task.id}" title="标记完成"></button>
      <div style="flex:1">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div style="display:flex;gap:6px;margin-top:4px;align-items:center">
          ${scheduledStr}
          <button class="tag-toggle-btn" data-id="${task.id}" data-tag="important"
            style="background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;
            background:${hasImportant ? 'rgba(255,59,48,0.12)' : 'var(--bg-hover)'};
            color:${hasImportant ? 'var(--red)' : 'var(--text-secondary)'};
            -webkit-app-region:no-drag">
            🔴 重要
          </button>
          <button class="tag-toggle-btn" data-id="${task.id}" data-tag="urgent"
            style="background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;
            background:${hasUrgent ? 'rgba(255,149,0,0.12)' : 'var(--bg-hover)'};
            color:${hasUrgent ? 'var(--orange)' : 'var(--text-secondary)'};
            -webkit-app-region:no-drag">
            ⚡ 紧急
          </button>
        </div>
      </div>
    </div>
  `
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">⚡</div>
      <div class="empty-text">暂无下一步行动</div>
      <div class="empty-sub">从工作篮中判定任务后<br>单步行动会出现在这里</div>
    </div>
  `
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
