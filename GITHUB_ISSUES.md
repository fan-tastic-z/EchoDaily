# Echo Daily — GitHub Issues 拆分（可直接复制）

> 说明：下面按里程碑拆成 Issue。每条都带“验收标准”，复制到 GitHub 后可按需加 label / milestone。

## 建议 Labels

- `milestone/v0.1` `milestone/v0.2` `milestone/v0.3` `milestone/v0.4`
- `area/ui` `area/editor` `area/storage` `area/ai` `area/audio` `area/settings`
- `type/feature` `type/chore` `type/bug` `type/test`

## v0.1 MVP：本地日记（写得稳）

### 1) App Shell：基础布局与状态（`area/ui` `type/feature`）
**目标**
- 搭出侧边栏 + 主编辑区的基础框架

**验收标准**
- 启动后能看到侧边栏与编辑区
- 点击日期/条目能切换当前 entry（可先用 mock 数据）

### 2) Editor：TipTap 最小可用编辑器（`area/editor` `type/feature`）
**目标**
- 集成 TipTap，支持基本输入/撤销/重做

**验收标准**
- 输入、撤销、重做可用
- 编辑器内容能序列化/反序列化为 ProseMirror JSON

### 3) Storage：SQLite schema + migrations（`area/storage` `type/feature`）
**目标**
- 设计并落地 `entries` 等基础表 + `schema_migrations`（使用 `sqlx`）

**验收标准**
- 应用首次启动能创建数据库
- schema 版本可升级（至少 1 个 migration 流程跑通）
- `entry_date (YYYY-MM-DD)` 唯一约束生效

### 4) Tauri Commands：Entry CRUD（`area/storage` `type/feature`）
**目标**
- 提供 `upsert/get/list/delete`（按里程碑计划可裁剪）

**验收标准**
- 前端可调用命令创建/更新/读取
- 同一天重复 upsert 覆盖更新，不产生重复记录

### 5) Autosave：去抖保存 + 保存状态（`area/editor` `type/feature`）
**目标**
- 编辑后 N 秒保存，UI 显示 Saving/Saved/Error

**验收标准**
- 连续输入不会触发过于频繁的写库（去抖生效）
- 强关应用后重启，能看到最近一次成功保存的内容

### 6) Sidebar：按月列表/快速打开（`area/ui` `type/feature`）
**目标**
- 以 `YYYY-MM` 为粒度列出条目并快速打开

**验收标准**
- 切换月份能更新列表
- 点击列表项可打开对应 entry

### 7) Tests：DB CRUD + 唯一键（`area/storage` `type/test`）
**目标**
- 给数据库层加最小单元测试

**验收标准**
- 覆盖：创建、更新、按 date 读取、按 month 列表、唯一键冲突行为

## v0.2：AI 润色（用得上）

### 1) Selection UI：选区菜单 + 操作面板（`area/ui` `area/editor` `type/feature`）
**目标**
- 选中文本时出现菜单，触发润色/扩写/语法修正

**验收标准**
- 有选区才显示；无选区不显示
- 操作期间 UI 有 loading 状态，支持取消（可先只做“忽略结果”）

### 2) AI Provider：接口抽象 + 智谱实现（`area/ai` `type/feature`）
**目标**
- 统一 `polish/expand/fix_grammar` 接口与错误映射

**验收标准**
- 超时与网络错误可识别；鉴权失败可识别
- 返回结构包含 `request_id`（可选）与可重试标记（或等价）

### 3) Settings：Provider/Model + Key 安全保存（`area/settings` `type/feature`）
**目标**
- 配置 provider/model；API Key 不在前后端命令间来回传

**验收标准**
- 未配置 key 时，AI 操作提示引导而非崩溃
- UI 不回显完整 key（掩码显示）

### 4) Persistence：保存 AI 操作记录（`area/storage` `area/ai` `type/feature`）
**目标**
- 保存原文/结果/时间/entry_id/provider/model

**验收标准**
- 任一 AI 输出都可在本地查询到对应原文

### 5) Tests：AI 错误映射与序列化（`area/ai` `type/test`）
**目标**
- 不打真实网络的测试：请求构造、响应解析、错误映射

**验收标准**
- 覆盖：鉴权失败、超时、配额/限流（若 provider 支持）

## v0.3：TTS + 播放器（能练习）

### 1) TTS：生成语音并落盘（`area/audio` `type/feature`）
**目标**
- 输入文本生成音频文件，写入应用数据目录

**验收标准**
- 重启后音频仍可播放（路径与引用稳定）
- 可选：重复文本命中去重策略（先简单也可）

### 2) Player：播放/进度/倍速（`area/ui` `area/audio` `type/feature`）
**目标**
- 最小可用播放器组件

**验收标准**
- 播放/暂停、进度条、倍速可用

### 3) Persistence：音频记录 + 清理策略（`area/storage` `area/audio` `type/feature`）
**目标**
- 保存 AudioRecord，并在删除 entry 时同步处理音频

**验收标准**
- 删除 entry 后不会遗留大量孤儿文件（清理或回收机制二选一）

## v0.4：检索与数据管理（可长期用）

### 1) Search：全文检索（FTS5）（`area/storage` `type/feature`）
**目标**
- 支持按关键字搜日记内容

**验收标准**
- 1000 篇量级仍可顺畅搜索与打开（体感不卡）

### 2) Backup：导入/导出（`area/storage` `type/feature`）
**目标**
- JSON 备份；音频可选一起打包

**验收标准**
- 导出→清空→导入后，日期与内容正确恢复

### 3) Calendar UX：浏览体验完善（`area/ui` `type/feature`）
**目标**
- 周/月视图、历史列表的体验打磨

**验收标准**
- 日历/列表之间切换顺畅；打开当天一步到位

## DoD（每条 Issue 的完成定义）

- 有验收步骤（最少手工步骤）
- 失败场景有提示（网络/鉴权/权限/IO）
- 不把用户正文/密钥写入日志
