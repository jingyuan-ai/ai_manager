/**
 * 已归档（Archive）模块
 * 展示已完成 / 已删除的任务，按月分组
 * 数据来自 archive_YYYY_Qn.json，与活跃 tasks.json 完全隔离
 */

window.ArchiveModule = {
  // 缓存：避免每次切回视图都走 IPC
  _cache: null,
  _filter: 'done', // done | deleted | all

  async render(container) {
    container.innerHTML = `
      <div class="content-header">
        <h1>📜 已归档</h1>
        <span class="header-count" id="archive-count" style="font-size:13px;color:var(--text-secondary)">加载中...</span>
      </div>
      <div class="content-body">
        <div id="archive-filter" class="archive-filter">
          <button class="filter-btn ${this._filter === 'done' ? 'active' : ''}" data-filter="done">✓ 已完成</button>
          <button class="filter-btn ${this._filter === 'deleted' ? 'active' : ''}" data-filter="deleted">🗑️ 已删除</button>
          <button class="filter-btn ${this._filter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
        </div>
        <div id="archive-list"></div>
      </div>
    `

    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this._filter = btn.dataset.filter
        container.querySelectorAll('.filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.filter === this._filter))
        this._renderList(container)
      })
    })

    // 每次进入视图都重新加载（保证看到最新归档）
    this._cache = await window.electronAPI.tasks.getArchive()
    this._renderList(container)
  },

  _renderList(container) {
    const list = container.querySelector('#archive-list')
    const countEl = container.querySelector('#archive-count')
    if (!this._cache) return

    const items = this._cache.filter(t =>
      this._filter === 'all' ? true : t.status === this._filter
    )
    countEl.textContent = `${items.length} 条`

    if (items.length === 0) {
      list.innerHTML = renderEmpty(this._filter)
      return
    }

    // 按月分组
    const groups = groupByMonth(items)
    list.innerHTML = groups.map(g => `
      <div class="group-header">${g.label} <span style="color:var(--text-secondary);font-weight:normal;font-size:12px">${g.items.length} 条</span></div>
      <div class="task-list">
        ${g.items.map(renderArchiveItem).join('')}
      </div>
    `).join('')
  }
}

function renderArchiveItem(task) {
  const isDone = task.status === 'done'
  const icon = isDone ? '✓' : '×'
  const iconColor = isDone ? 'var(--green)' : 'var(--text-placeholder)'
  const completedAt = task.completedAt || task.updatedAt
  const createdAt = task.createdAt
  const duration = formatDuration(createdAt, completedAt)

  // 完成人：done 才显示，deleted 不显示
  const byStr = isDone && task.completedBy
    ? `<span class="archive-by">由 ${escapeHtml(task.completedBy)} 完成</span>`
    : ''

  // 标签标记
  const tags = []
  if (task.tags && task.tags.includes('important')) tags.push('🔴')
  if (task.tags && task.tags.includes('urgent')) tags.push('⚡')
  if (task.parentProjectId) tags.push('📁')
  const tagPrefix = tags.length ? tags.join(' ') + ' ' : ''

  return `
    <div class="archive-item ${isDone ? 'done' : 'deleted'}">
      <div class="archive-icon" style="color:${iconColor}">${icon}</div>
      <div style="flex:1;min-width:0">
        <div class="archive-title">${tagPrefix}${escapeHtml(task.title)}</div>
        <div class="archive-meta">
          <span>创建于 ${formatDate(createdAt)}</span>
          <span class="dot">·</span>
          <span>${isDone ? '完成' : '删除'}于 ${formatDate(completedAt)}</span>
          ${duration ? `<span class="dot">·</span><span>${duration}</span>` : ''}
          ${byStr ? `<span class="dot">·</span>${byStr}` : ''}
        </div>
      </div>
    </div>
  `
}

function groupByMonth(items) {
  const map = new Map()
  for (const t of items) {
    const d = new Date(t.completedAt || t.updatedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) {
      const now = new Date()
      let label
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        label = '本月'
      } else if (d.getFullYear() === now.getFullYear() &&
                 d.getMonth() === now.getMonth() - 1) {
        label = '上月'
      } else {
        label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
      }
      map.set(key, { key, label, items: [] })
    }
    map.get(key).items.push(t)
  }
  // map 内顺序由插入决定，因为 _cache 已倒序所以这里直接转数组就是按月倒序
  return Array.from(map.values())
}

function renderEmpty(filter) {
  const text = filter === 'deleted' ? '没有已删除的任务'
             : filter === 'done'    ? '还没有完成的任务'
             : '归档是空的'
  const sub = filter === 'done'
    ? '完成任务后会出现在这里<br>记录你做过的每一件事'
    : '判定为「不做」或主动删除的任务会出现在这里'
  return `
    <div class="empty-state">
      <div class="empty-icon">📜</div>
      <div class="empty-text">${text}</div>
      <div class="empty-sub">${sub}</div>
    </div>
  `
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const dateStr = sameYear
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${dateStr} ${timeStr}`
}

function formatDuration(start, end) {
  if (!start || !end) return ''
  const ms = new Date(end) - new Date(start)
  if (ms < 0) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return '耗时 < 1分钟'
  if (min < 60) return `耗时 ${min} 分钟`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `耗时 ${hr} 小时`
  const day = Math.floor(hr / 24)
  return `耗时 ${day} 天`
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
