/**
 * 将来某时（Someday）模块
 * 显示「将来某时」和「参考资料」两类任务
 * 支持重新激活（移回工作篮重新判定）
 */

window.SomedayModule = {
  render(container, tasks) {
    const someday   = tasks.filter(t => t.status === 'someday')
    const reference = tasks.filter(t => t.status === 'reference')

    container.innerHTML = `
      <div class="content-header">
        <h1>🌙 将来某时</h1>
        <span class="header-count">${someday.length + reference.length} 条</span>
      </div>
      <div class="content-body">
        ${someday.length === 0 && reference.length === 0
          ? renderEmpty()
          : `
            ${someday.length > 0 ? `
              <div class="group-header">🌙 将来某时</div>
              <div class="task-list">${someday.map(t => renderItem(t, 'someday')).join('')}</div>
            ` : ''}
            ${reference.length > 0 ? `
              <div class="group-header">📦 参考资料</div>
              <div class="task-list">${reference.map(t => renderItem(t, 'reference')).join('')}</div>
            ` : ''}
          `
        }
      </div>
    `

    // 移回工作篮
    container.querySelectorAll('.revive-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await window.electronAPI.tasks.update(btn.dataset.id, {
          status: 'inbox',
          decidedAt: null
        })
        window.App && window.App.refresh()
      })
    })

    // 删除
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await window.electronAPI.tasks.delete(btn.dataset.id)
        window.App && window.App.refresh()
      })
    })
  }
}

function renderItem(task, type) {
  const time = formatTime(task.updatedAt)
  return `
    <div class="task-item" data-id="${task.id}">
      <div style="flex:1;min-width:0">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta" style="margin-top:3px">${time}</div>
      </div>
      <button class="revive-btn" data-id="${task.id}"
        title="移回工作篮重新判定"
        style="background:none;border:1.5px solid var(--border);border-radius:6px;
        padding:3px 9px;font-size:11.5px;color:var(--text-secondary);cursor:pointer;
        -webkit-app-region:no-drag;flex-shrink:0;margin-left:8px;transition:all 0.12s"
        onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
        移回工作篮
      </button>
      <button class="delete-btn" data-id="${task.id}"
        title="删除"
        style="background:none;border:none;cursor:pointer;color:var(--text-placeholder);
        font-size:16px;padding:2px 6px;-webkit-app-region:no-drag;flex-shrink:0;transition:color 0.12s"
        onmouseover="this.style.color='var(--red)'"
        onmouseout="this.style.color='var(--text-placeholder)'">
        ×
      </button>
    </div>
  `
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">🌙</div>
      <div class="empty-text">没有「将来某时」的事项</div>
      <div class="empty-sub">判定任务时选择「将来某时」<br>或「存为参考资料」，会出现在这里</div>
    </div>
  `
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
