# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Manager (V0.1)** is a personal task management desktop application that enforces the GTD-like methodology from the book *小强升职记* (Small Strong Rises in Rank). The core value proposition is *forcing structured thinking*, not just recording tasks.

> System value = forcing you to think, not helping you record

## 开发命令

```bash
npm install    # 安装依赖（所有依赖本地安装，不装系统级）
npm start      # 启动 Electron 开发模式
npm run build  # 打包为 macOS .app（输出到 dist/）
```

键盘快捷键（应用内）：
- `Cmd+Shift+Space`：全局快捷键，从任何应用唤起窗口并聚焦 Inbox 输入框
- `Cmd+1/2/3/4`：切换视图（工作篮/下一步行动/项目/等待）
- `Escape`：关闭判定面板

## 目录结构与数据隔离

```
ai_manager/
├── main/          ← 主进程代码（Electron/Node.js）
├── renderer/      ← 渲染进程代码（HTML/CSS/JS）
├── data/          ← 持久化数据（与代码隔离，可单独同步）
│   └── tasks.json
├── package.json
└── ...
```

**数据目录解析优先级**（`main/store.js`）：
1. 环境变量 `AI_MANAGER_DATA_DIR`（优先，可指向任意路径，适合多机同步）
2. 开发模式（`npm start`）：项目根目录下的 `data/`
3. 打包后：`.app` 文件同级目录下的 `data/`

**多机同步方案**：
- 方式一：用 git 同步 `data/` 目录（删除 `.gitignore` 中的注释行即可纳入 git）
- 方式二：设置 `AI_MANAGER_DATA_DIR` 指向 iCloud/Dropbox 等同步目录

升级代码时（`git pull`）不影响 `data/`，数据完全独立。

## Tech Stack

- **Frontend:** Electron（macOS 桌面）
- **Storage:** JSON 文件，本地存储，无后端

## Architecture

The system is built around **5 modules** and 1 core engine:

```
Inbox → Decision Panel (engine) → Next Actions / Projects / Waiting
```

**Decision Panel (判定面板)** is the core engine — every task from Inbox must pass through a mandatory 5-step decision flow before being routed:

1. **Do it?** → Discard / Reference / Someday / Yes
2. **2-minute rule?** → Do now / No
3. **Who does it?** → Self / Delegate → Waiting
4. **Fixed time?** → Scheduled / No
5. **Is it a project?** → Projects / Next Actions

**System rules (enforced at the UI level):**
- All tasks must enter Inbox first — no direct routing
- Every Inbox task must be processed through the Decision Panel exactly once
- Next Actions must start with a verb, be executable, and have a clear result
- Tasks cannot return to Inbox once processed

**Four-quadrant prioritization** is simplified to two tags (重要 / 紧急) with auto-sort: Important+Urgent → Important-only → Others.

## MVP Layout

```
Left panel:  Inbox | Next Actions | Projects | Waiting
Right panel: Task detail + Decision Panel flow
```

Core interaction:
```
New task → auto-enters Inbox
Click task → forces Decision flow
Decision complete → auto-routes to correct list
```

## AI Upgrade Roadmap (future phases)

1. **Phase 1:** AI assists decision (classify project vs action, suggest next actions)
2. **Phase 2:** AI drafts sub-task breakdowns, plans, delegation messages
3. **Phase 3:** AI executes autonomously (send messages, track delegated tasks, generate reports)
