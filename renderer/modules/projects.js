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

    // 绑定「定义下一步行动」按钮
    container.querySelectorAll('.add-next-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        showAddNextActionModal(btn.dataset.projectId)
      })
    })

    // 绑定「完成项目」按钮
    container.querySelectorAll('.project-done-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await window.electronAPI.tasks.update(btn.dataset.id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })

    // 绑定「完成行动」按钮（项目卡片内的下一步行动）
    container.querySelectorAll('.action-done-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await window.electronAPI.tasks.update(btn.dataset.id, { status: 'done' })
        window.App && window.App.refresh()
      })
    })
  }
}

// ==================== 定义下一步行动 Modal ====================

function showAddNextActionModal(projectId) {
  // 复用判定面板的 modal overlay
  const modal = document.getElementById('decision-modal')
  const card = document.getElementById('decision-card')

  card.innerHTML = `
    <div class="modal-task-title">定义项目的下一步行动</div>
    <div class="modal-step-label">下一步行动</div>
    <div class="modal-question" style="font-size:15px;margin-bottom:12px">具体要做什么？</div>
    <input class="modal-input" id="project-action-input" type="text"
           placeholder="动词开头，例：整理项目需求文档（1小时）" autocomplete="off" />
    <div class="modal-hint" id="project-action-hint">✅ 动词开头，可执行，有明确结果</div>
    <div class="tags" style="margin:12px 0 4px;gap:12px;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;-webkit-app-region:no-drag">
        <input type="checkbox" id="pa-tag-important" />
        <span>🔴 重要</span>
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;-webkit-app-region:no-drag">
        <input type="checkbox" id="pa-tag-urgent" />
        <span>⚡ 紧急</span>
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="document.getElementById('decision-modal').classList.add('hidden')">取消</button>
      <button class="btn-primary" id="pa-confirm-btn">添加行动</button>
    </div>
  `

  modal.classList.remove('hidden')
  setTimeout(() => document.getElementById('project-action-input').focus(), 50)

  // 回车确认
  document.getElementById('project-action-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('pa-confirm-btn').click()
  })

  document.getElementById('pa-confirm-btn').addEventListener('click', async () => {
    const input = document.getElementById('project-action-input')
    const title = input.value.trim()
    if (!title) {
      input.style.borderColor = 'var(--red)'
      input.focus()
      return
    }

    const ACTION_VERBS = ['梳理','整理','写','发','打','联系','确认','完成','设计','创建',
      '制作','准备','研究','分析','检查','审核','修改','更新','安排','预约','回复','处理',
      '解决','讨论','沟通','汇报','提交','阅读','学习','规划','列出','统计','收集','输出']
    const isVerb = ACTION_VERBS.some(v => title.startsWith(v))
    if (!isVerb) {
      document.getElementById('project-action-hint').textContent = '⚠️ 建议动词开头（梳理/整理/写/确认...），行动更清晰'
      document.getElementById('project-action-hint').classList.add('warn')
    }

    const tags = []
    if (document.getElementById('pa-tag-important').checked) tags.push('important')
    if (document.getElementById('pa-tag-urgent').checked) tags.push('urgent')

    // 创建下一步行动任务
    const action = await window.electronAPI.tasks.create({
      title,
      status: 'next_action',
      tags,
      verbCheck: isVerb,
      parentProjectId: projectId,
      decidedAt: new Date().toISOString()
    })

    // 更新项目的 nextActionId
    await window.electronAPI.tasks.update(projectId, { nextActionId: action.id })

    modal.classList.add('hidden')
    window.App && window.App.refresh()
  })
}

// ==================== 项目卡片渲染 ====================

function renderProject(project, allTasks) {
  const subtasks = allTasks.filter(t => t.parentProjectId === project.id)
  const nextAction = project.nextActionId
    ? allTasks.find(t => t.id === project.nextActionId && t.status === 'next_action')
    : subtasks.find(t => t.status === 'next_action')

  const doneCount = subtasks.filter(t => t.status === 'done').length
  const total = subtasks.length
  const percent = total > 0 ? Math.round(doneCount / total * 100) : 0

  const nextActionSection = nextAction
    ? `<div class="project-next-action" style="display:flex;align-items:center;gap:8px">
         <span style="flex:1">⚡ 下一步：${escapeHtml(nextAction.title)}</span>
         <button class="action-done-btn" data-id="${nextAction.id}"
           style="background:none;border:1.5px solid currentColor;border-radius:5px;padding:2px 8px;
           font-size:11px;color:var(--accent);cursor:pointer;-webkit-app-region:no-drag;flex-shrink:0;opacity:0.8"
           title="标记此行动完成">✓ 完成</button>
       </div>`
    : `<button class="add-next-action-btn" data-project-id="${project.id}"
         style="width:100%;text-align:left;padding:8px 12px;border-radius:var(--radius-sm);
         border:1.5px dashed var(--orange);background:rgba(255,149,0,0.06);
         color:var(--orange);font-size:13px;cursor:pointer;-webkit-app-region:no-drag;
         font-weight:500;transition:background 0.1s"
         onmouseover="this.style.background='rgba(255,149,0,0.12)'"
         onmouseout="this.style.background='rgba(255,149,0,0.06)'">
         ＋ 定义下一步行动
       </button>`

  return `
    <div class="project-card">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <div style="flex:1;min-width:0">
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

      ${nextActionSection}

      ${total > 0 ? `
        <div class="progress-bar" style="margin-top:10px">
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
