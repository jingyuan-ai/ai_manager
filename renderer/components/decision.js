/**
 * 判定面板 —— 系统核心引擎
 * 5步决策状态机：do_it → 2min → who → has_time → is_project
 */

// 常见任务动词（用于校验 Next Action 是否动词开头）
const ACTION_VERBS = [
  '梳理', '整理', '写', '写出', '发', '发送', '打', '打电话', '联系', '确认', '完成',
  '设计', '创建', '制作', '准备', '研究', '分析', '检查', '审核', '修改', '更新',
  '安排', '预约', '回复', '处理', '解决', '讨论', '沟通', '汇报', '提交', '上传',
  '下载', '安装', '配置', '部署', '测试', '调试', '优化', '重构', '阅读', '学习',
  '规划', '列出', '统计', '收集', '筛选', '删除', '清理', '备份', '迁移', '转发',
  '通知', '提醒', '跟进', '评估', '调研', '查看', '了解', '记录', '总结', '输出'
]

function startsWithVerb(text) {
  return ACTION_VERBS.some(v => text.startsWith(v))
}

// 全局决策状态
let currentTask = null
let currentStep = null
let onCompleteCallback = null

const modal = document.getElementById('decision-modal')
const card = document.getElementById('decision-card')

// 打开判定面板
function openDecision(task, onComplete) {
  currentTask = task
  onCompleteCallback = onComplete
  renderStep('do_it')
  modal.classList.remove('hidden')
}

// 关闭面板
function closeDecision() {
  modal.classList.add('hidden')
  currentTask = null
  currentStep = null
}

// 点击遮罩关闭
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeDecision()
})

// 渲染对应步骤
function renderStep(step) {
  currentStep = step
  card.innerHTML = `
    <div class="modal-task-title">「${currentTask.title}」</div>
    ${getStepHTML(step)}
  `
  // 自动聚焦输入框
  const input = card.querySelector('input, textarea')
  if (input) setTimeout(() => input.focus(), 50)
}

function getStepHTML(step) {
  switch (step) {
    case 'do_it':
      return `
        <div class="modal-step-label">第 1 步 / 共 5 步</div>
        <div class="modal-question">这件事要做吗？</div>
        <div class="modal-options">
          <button class="modal-btn" onclick="handleDoIt('delete')">
            <span class="btn-icon">🗑️</span>
            <div class="btn-text">
              <div>不做，删除</div>
              <div class="btn-sub">这件事不重要，直接丢弃</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleDoIt('reference')">
            <span class="btn-icon">📦</span>
            <div class="btn-text">
              <div>存为参考资料</div>
              <div class="btn-sub">不需要行动，但有参考价值</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleDoIt('someday')">
            <span class="btn-icon">🌙</span>
            <div class="btn-text">
              <div>将来某时再说</div>
              <div class="btn-sub">现在不做，但以后可能会做</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleDoIt('yes')">
            <span class="btn-icon">✅</span>
            <div class="btn-text">
              <div>要做</div>
              <div class="btn-sub">这件事需要行动</div>
            </div>
          </button>
        </div>
      `

    case '2min':
      return `
        <div class="modal-step-label">第 2 步 / 共 5 步</div>
        <div class="modal-question">2分钟内能完成吗？</div>
        <div class="modal-options">
          <button class="modal-btn" onclick="handle2min('now')">
            <span class="btn-icon">⚡</span>
            <div class="btn-text">
              <div>立即做，2分钟搞定</div>
              <div class="btn-sub">做完后标记完成</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handle2min('no')">
            <span class="btn-icon">⏰</span>
            <div class="btn-text">
              <div>不行，需要更多时间</div>
              <div class="btn-sub">继续判定</div>
            </div>
          </button>
        </div>
      `

    case 'who':
      return `
        <div class="modal-step-label">第 3 步 / 共 5 步</div>
        <div class="modal-question">谁来做？</div>
        <div class="modal-options">
          <button class="modal-btn" onclick="handleWho('self')">
            <span class="btn-icon">👤</span>
            <div class="btn-text">
              <div>我自己做</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleWho('delegate')">
            <span class="btn-icon">👥</span>
            <div class="btn-text">
              <div>指派给他人</div>
              <div class="btn-sub">进入等待列表</div>
            </div>
          </button>
        </div>
      `

    case 'delegate_input':
      return `
        <div class="modal-step-label">指派给他人</div>
        <div class="modal-question">谁负责？什么时候？</div>
        <input class="modal-input" id="assignee-input" type="text" placeholder="负责人姓名" />
        <input class="modal-input" id="due-input" type="date" />
        <div class="modal-hint">填写负责人后，任务会进入等待列表，方便跟进</div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="renderStep('who')">← 返回</button>
          <button class="btn-primary" onclick="handleDelegate()">确认指派</button>
        </div>
      `

    case 'has_time':
      return `
        <div class="modal-step-label">第 4 步 / 共 5 步</div>
        <div class="modal-question">有明确的执行时间吗？</div>
        <div class="modal-options">
          <button class="modal-btn" onclick="handleHasTime('yes')">
            <span class="btn-icon">📅</span>
            <div class="btn-text">
              <div>有，安排到具体时间</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleHasTime('no')">
            <span class="btn-icon">📋</span>
            <div class="btn-text">
              <div>没有，随时可做</div>
              <div class="btn-sub">进入下一步行动列表</div>
            </div>
          </button>
        </div>
      `

    case 'schedule_input':
      return `
        <div class="modal-step-label">安排执行时间</div>
        <div class="modal-question">什么时候做？</div>
        <input class="modal-input" id="schedule-input" type="datetime-local" />
        <div class="modal-hint">安排后会作为「下一步行动」并标记执行时间</div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="renderStep('has_time')">← 返回</button>
          <button class="btn-primary" onclick="handleSchedule()">确认安排</button>
        </div>
      `

    case 'is_project':
      return `
        <div class="modal-step-label">第 5 步 / 共 5 步</div>
        <div class="modal-question">这是一个项目吗？</div>
        <div class="modal-options">
          <button class="modal-btn" onclick="handleIsProject('yes')">
            <span class="btn-icon">📁</span>
            <div class="btn-text">
              <div>是项目（多步骤任务）</div>
              <div class="btn-sub">需要拆解子任务</div>
            </div>
          </button>
          <button class="modal-btn" onclick="handleIsProject('no')">
            <span class="btn-icon">⚡</span>
            <div class="btn-text">
              <div>不是，单个行动</div>
              <div class="btn-sub">进入下一步行动列表</div>
            </div>
          </button>
        </div>
      `

    case 'project_input':
      return `
        <div class="modal-step-label">创建项目</div>
        <div class="modal-question">这个项目的目标是？</div>
        <input class="modal-input" id="project-goal-input" type="text" placeholder="完成后你希望达到什么结果？" />
        <div class="modal-hint">好的项目目标：具体、可验证、有截止感</div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="renderStep('is_project')">← 返回</button>
          <button class="btn-primary" onclick="handleProjectCreate()">创建项目</button>
        </div>
      `

    case 'next_action_input':
      return `
        <div class="modal-step-label">定义下一步行动</div>
        <div class="modal-question">具体要做什么？</div>
        <input class="modal-input" id="action-title-input" type="text"
               placeholder="动词开头，例：梳理AI方案PPT结构（30min）"
               value="${currentTask.title}" />
        <div class="modal-hint" id="verb-hint">✅ 必须动词开头，可执行，有明确结果</div>
        <div class="tags" style="margin-bottom:12px; gap:8px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="tag-important" style="-webkit-app-region:no-drag" />
            <span>🔴 重要</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="tag-urgent" style="-webkit-app-region:no-drag" />
            <span>⚡ 紧急</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="renderStep('is_project')">← 返回</button>
          <button class="btn-primary" onclick="handleNextAction()">加入行动列表</button>
        </div>
      `

    default:
      return `<div>未知步骤</div>`
  }
}

// ====== 步骤处理函数（挂在 window 上供 onclick 调用）======

window.handleDoIt = function(choice) {
  switch (choice) {
    case 'delete':
      completeDecision({ status: 'deleted' }, '任务已删除')
      break
    case 'reference':
      completeDecision({ status: 'reference' }, '已存为参考资料')
      break
    case 'someday':
      completeDecision({ status: 'someday' }, '已移至「将来某时」')
      break
    case 'yes':
      renderStep('2min')
      break
  }
}

window.handle2min = function(choice) {
  if (choice === 'now') {
    completeDecision({ status: 'done', decidedAt: new Date().toISOString() }, '已完成 ✅')
  } else {
    renderStep('who')
  }
}

window.handleWho = function(choice) {
  if (choice === 'self') {
    renderStep('has_time')
  } else {
    renderStep('delegate_input')
  }
}

window.handleDelegate = function() {
  const assignee = document.getElementById('assignee-input').value.trim()
  const dueDate = document.getElementById('due-input').value
  if (!assignee) {
    document.getElementById('assignee-input').style.borderColor = 'var(--red)'
    document.getElementById('assignee-input').focus()
    return
  }
  completeDecision({
    status: 'waiting',
    assignee,
    dueDate: dueDate || null,
    decidedAt: new Date().toISOString()
  }, `已指派给 ${assignee}，进入等待列表`)
}

window.handleHasTime = function(choice) {
  if (choice === 'yes') {
    renderStep('schedule_input')
  } else {
    renderStep('is_project')
  }
}

window.handleSchedule = function() {
  const val = document.getElementById('schedule-input').value
  const title = currentTask.title
  completeDecision({
    status: 'next_action',
    scheduledAt: val || null,
    verbCheck: startsWithVerb(title),
    decidedAt: new Date().toISOString()
  }, '已安排到日程')
}

window.handleIsProject = function(choice) {
  if (choice === 'yes') {
    renderStep('project_input')
  } else {
    renderStep('next_action_input')
  }
}

window.handleProjectCreate = function() {
  const goal = document.getElementById('project-goal-input').value.trim()
  if (!goal) {
    document.getElementById('project-goal-input').style.borderColor = 'var(--red)'
    document.getElementById('project-goal-input').focus()
    return
  }
  completeDecision({
    status: 'project',
    projectGoal: goal,
    decidedAt: new Date().toISOString()
  }, '已创建项目 📁')
}

window.handleNextAction = function() {
  const titleInput = document.getElementById('action-title-input')
  const title = titleInput.value.trim()
  if (!title) {
    titleInput.style.borderColor = 'var(--red)'
    titleInput.focus()
    return
  }

  const isVerb = startsWithVerb(title)
  if (!isVerb) {
    const hint = document.getElementById('verb-hint')
    hint.textContent = '⚠️ 建议动词开头（如：梳理/整理/写/发/确认...），这样行动更清晰'
    hint.classList.add('warn')
    // 警告但不阻止
  }

  const tags = []
  if (document.getElementById('tag-important').checked) tags.push('important')
  if (document.getElementById('tag-urgent').checked) tags.push('urgent')

  completeDecision({
    title, // 用户可能修改了标题
    status: 'next_action',
    tags,
    verbCheck: isVerb,
    decidedAt: new Date().toISOString()
  }, '已加入下一步行动 ⚡')
}

// 完成决策：更新任务 + 回调
async function completeDecision(updates, message) {
  try {
    const updated = await window.electronAPI.tasks.update(currentTask.id, updates)
    closeDecision()
    if (onCompleteCallback) onCompleteCallback(updated, message)
  } catch (e) {
    console.error('更新任务失败:', e)
  }
}

// 导出给 app.js 使用
window.Decision = { open: openDecision, close: closeDecision }
