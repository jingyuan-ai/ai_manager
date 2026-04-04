/**
 * 项目列表（Projects）模块
 * 多步骤任务，每个项目只有一个下一步行动
 */

window.ProjectsModule = {
  render(container, tasks) {
    const projects = tasks.filter(t => t.status === 'project')

    container.innerHTML = `
      <div class="content-header">
        <h1>📁 项目列表</h1>
        <span style="font-size:13px;color:var(--text-secondary)">${projects.length} 个项目</span>
      </div>
      <div class="content-body">
        ${projects.length === 0 ? renderEmpty() : projects.map(p => renderProject(p, tasks)).join('')}
      </div>
    `

    // 绑定项目完成按钮
    container.querySelectorAll('.project-done-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        await window.electronAPI.tasks.update(id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })
  }
}

function renderProject(project, allTasks) {
  const subtasks = allTasks.filter(t => t.parentProjectId === project.id)
  const nextAction = project.nextActionId
    ? allTasks.find(t => t.id === project.nextActionId)
    : subtasks.find(t => t.status === 'next_action')

  const doneCount = subtasks.filter(t => t.status === 'done').length
  const total = subtasks.length
  const percent = total > 0 ? Math.round(doneCount / total * 100) : 0

  return `
    <div class="project-card">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div class="project-title">${escapeHtml(project.title)}</div>
          ${project.projectGoal
            ? `<div class="project-goal">目标：${escapeHtml(project.projectGoal)}</div>`
            : ''}
        </div>
        <button class="project-done-btn" data-id="${project.id}"
          style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:4px 10px;
          font-size:12px;color:var(--text-secondary);cursor:pointer;-webkit-app-region:no-drag;flex-shrink:0"
          onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
          完成项目
        </button>
      </div>

      ${nextAction
        ? `<div class="project-next-action">⚡ 下一步：${escapeHtml(nextAction.title)}</div>`
        : `<div class="project-next-action" style="color:var(--orange);background:rgba(255,149,0,0.1)">⚠️ 尚未定义下一步行动</div>`}

      ${total > 0 ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${doneCount}/${total} 子任务完成</div>
      ` : ''}
    </div>
  `
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <div class="empty-icon">📁</div>
      <div class="empty-text">暂无进行中的项目</div>
      <div class="empty-sub">从工作篮判定多步骤任务时<br>会自动创建项目</div>
    </div>
  `
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
