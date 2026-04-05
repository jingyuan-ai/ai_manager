/**
 * 下一步行动（Next Actions）模块
 * 按四象限排序：重要+紧急 → 重要 → 其他
 */

window.NextActionsModule = {
  render(container, tasks) {
    const actions = tasks.filter(t => t.status === 'next_action')

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
        await window.electronAPI.tasks.update(btn.dataset.id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })

    // 绑定标签切换按钮
    container.querySelectorAll('.tag-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const { id, tag } = btn.dataset
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

  // 已设置的标签：彩色实心 badge + × 号提示可点击取消
  // 未设置的标签：虚线描边 ghost 按钮 + ＋ 前缀提示可添加
  const importantBtn = hasImportant
    ? `<button class="tag-toggle-btn tag-active-important" data-id="${task.id}" data-tag="important" title="点击取消「重要」">🔴 重要 ×</button>`
    : `<button class="tag-toggle-btn tag-ghost" data-id="${task.id}" data-tag="important" title="点击标记为「重要」">＋ 重要</button>`

  const urgentBtn = hasUrgent
    ? `<button class="tag-toggle-btn tag-active-urgent" data-id="${task.id}" data-tag="urgent" title="点击取消「紧急」">⚡ 紧急 ×</button>`
    : `<button class="tag-toggle-btn tag-ghost" data-id="${task.id}" data-tag="urgent" title="点击标记为「紧急」">＋ 紧急</button>`

  return `
    <div class="task-item" data-id="${task.id}">
      <button class="done-btn" data-id="${task.id}" title="标记完成"></button>
      <div style="flex:1;min-width:0">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-tags-row">
          ${scheduledStr}
          ${importantBtn}
          ${urgentBtn}
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
