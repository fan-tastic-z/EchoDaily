# Echo Daily 项目规划（可验收版）

一个用于每日英语日记记录的桌面客户端：本地优先、写作体验优先，在“选中一段文本 → AI 润色/扩写 → 一键生成练习语音”这条链路上做到极致。

---

## 1. 目标与范围

### 1.1 产品目标（Goal）
- 每天打开就能写：启动快、打开当天即写、自动保存、可恢复
- AI 不打扰：只在用户选中/触发时工作，输出可追溯（原文/结果/时间）
- 练习闭环：文本 → TTS → 播放/跟读（先满足“能听能练”，再做波形/打点等高级功能）

### 1.2 非目标（Non-goals，前 2 个版本不做）
- 多端同步、账号体系
- 复杂协作/分享/发布
- “全自动 AI 写日记”（可做为实验，但不作为主线）

---

## 2. 里程碑（版本化交付）

> 每个里程碑都包含“可交付物 + 验收标准”。做到验收即算完成，不追加 scope。

### v0.1 MVP：本地日记（写得稳）
**可交付物**
- 基础布局：侧边栏（日期列表/简单日历占位）+ 主编辑区
- 日记：按“日历日”创建/打开/编辑/删除
- 自动保存：编辑后 N 秒/失焦保存；异常退出可恢复（至少不丢最后一次保存前内容）
- 本地存储：SQLite（含 schema version）

**当前状态（仓库内实现对齐 v0.1）**
- 状态：功能已具备，待按下述清单手工验收
- 覆盖点：
  - 创建/打开/编辑：按 `YYYY-MM-DD` 本地日历日作为唯一键
  - 自动保存：编辑后去抖保存；编辑器失焦触发立即保存
  - 删除：支持删除当前日期条目（含确认对话框）
  - 本地存储：SQLite + `schema_migrations` 版本表
- 建议验收命令：
```bash
pnpm -s build
cd src-tauri && cargo test
```

**手工验收清单（v0.1）**
- 创建/编辑：打开当天，输入文本，等待 2 秒，看到 Saved；重启后内容仍在
- 连续编辑：持续输入 > 2 秒，仍会持续保存（不会只保存第一次）
- 失焦保存：输入后点击侧边栏日期切换，旧日期内容不会丢失
- 删除：对有内容的日期执行删除，重启后该日期为空

**验收标准**
- 重启应用后，当天内容不丢失；同一天只有一篇（唯一键约束生效）
- 断电/崩溃模拟（强关进程）后，能恢复到“最近一次成功保存”的内容
- 列表能按月份浏览并快速打开（<= 200ms 级别的体感，先不做精确指标）

### v0.2：AI 润色（用得上）
**可交付物**
- 选区操作：选中文本后出现操作菜单（润色/扩写/语法修正）
- AI 服务：Provider 抽象（至少接入“智谱”作为开发默认）
- AI 记录：保存原文、结果、时间、关联 entry
- 设置：配置 Provider/Model/Key（Key 安全保存）

**验收标准**
- 不配置 Key 时有明确引导与错误提示；不会崩溃
- AI 请求失败可重试；错误信息可读（区分鉴权失败/超时/额度等）
- 每次 AI 输出都能在本地追溯到对应原文

### v0.3：TTS + 播放器（能练习）
**可交付物**
- TTS：对选中文本或整段生成语音，落盘为音频文件
- 播放器：播放/暂停/进度条/倍速（最少 0.75x/1x/1.25x）
- 语音记录：保存 text、音频文件引用、创建时间、关联 entry

**验收标准**
- 语音文件在重启后可播放；删除条目能同时清理关联音频（或标记为可回收）
- 同一段文本重复生成有去重策略（可选：hash 命中即复用；先做简单也可）

### v0.4：检索与数据管理（可长期用）
**可交付物**
- 搜索：按全文搜索日记内容（SQLite FTS5 或索引策略落地）
- 导入/导出：JSON 备份（包含 entries/ai/audio 元数据；音频可选打包）
- 日历/历史：更完整的浏览体验（周/月视图、连续写作 streak 等可后置）

**验收标准**
- 1000 篇量级仍可顺畅搜索与打开（先以“体感不卡”为准）
- 导出后删除本地数据，再导入可恢复（至少文本与日期准确）

---

## 3. 关键技术决策（先定，避免返工）

### 3.1 “日记日期”的定义
- 日记以“本地日历日”为唯一键：`entry_date` 使用 `YYYY-MM-DD` 字符串（或等价结构）
- 不用 JS `Date` 作为“日记日期”的存储类型，避免时区/跨天导致同一篇错位

### 3.2 富文本存储格式
- 编辑器：TipTap（ProseMirror）
- 存储：以 ProseMirror JSON 为主（`content_json TEXT`），导出时可同时生成 HTML 作为互操作
- 未来需要迁移时，通过 `schema_version` + 迁移函数处理（避免“HTML 解析回 JSON”的高成本）

### 3.3 数据库与表结构（建议）
**entries**
- `id TEXT PRIMARY KEY`（UUID）
- `entry_date TEXT NOT NULL UNIQUE`（`YYYY-MM-DD`）
- `content_json TEXT NOT NULL`
- `created_at INTEGER NOT NULL`（unix ms）
- `updated_at INTEGER NOT NULL`

**ai_operations**
- `id TEXT PRIMARY KEY`
- `entry_id TEXT NOT NULL`（FK）
- `op_type TEXT NOT NULL`（polish/expand/fix_grammar）
- `original_text TEXT NOT NULL`
- `result_text TEXT NOT NULL`
- `provider TEXT NOT NULL`
- `model TEXT NOT NULL`
- `created_at INTEGER NOT NULL`

**audio_records**
- `id TEXT PRIMARY KEY`
- `entry_id TEXT NOT NULL`（FK）
- `text TEXT NOT NULL`
- `audio_relpath TEXT NOT NULL`（相对应用数据目录）
- `voice TEXT` / `speed REAL`（可选）
- `created_at INTEGER NOT NULL`

**schema_migrations**
- `version INTEGER PRIMARY KEY`
- `applied_at INTEGER NOT NULL`

### 3.4 文件存储（音频）
- 音频落在应用数据目录下（如 `audio/{entry_id}/{audio_id}.mp3`）
- DB 只存相对路径；导出时可选择“仅元数据/连同音频打包”

### 3.5 密钥与隐私
- API Key 不应在命令参数里来回传；后端负责安全保存与读取
- Key 优先使用系统 Keychain/凭据库（跨平台）；退路才用加密存储（并明确威胁模型）
- 日志默认不写入用户日记正文；错误日志需脱敏（不包含 key、完整文本）

### 3.6 错误与返回值约定
- Rust 命令返回结构化错误（错误码 + message + 可重试标记），避免 `String` 难以分流处理
- AI/TTS 返回结构包含 `request_id`/`cached`（可选）/`record_id`，便于 UI 状态与追踪
- 错误实现建议：用 `thiserror` 定义领域错误枚举；用 `exn`（或等价机制）在服务层附加上下文/回溯；在 Tauri 命令边界统一映射成可序列化的 `AppError`

---

## 4. 实现顺序（任务拆分骨架）

### 4.1 v0.1（本地日记）
- UI：布局（侧边栏 + 编辑区）与路由状态
- Editor：TipTap 集成 + content_json 序列化/反序列化
- Storage：Rust SQLite（`sqlx` + migrations + CRUD）
- Autosave：去抖保存、保存状态提示、崩溃后恢复策略

### 4.2 v0.2（AI 润色）
- Selection：选区菜单 + 操作面板
- Provider：AI 接口抽象 + 智谱实现 + 超时/重试/取消
- Persistence：保存 AIOperation
- Settings：Provider/Model/Key（Keychain）

### 4.3 v0.3（TTS + 播放器）
- TTS：生成语音并落盘
- Audio：播放器组件 + 倍速
- Persistence：保存 AudioRecord + 清理策略

### 4.4 v0.4（搜索与数据管理）
- Search：FTS5 / 索引落地
- Backup：导入/导出（含 schema version）
- UX：日历/历史完善

### 4.5 Issue 拆分（GitHub）
- 见 `GITHUB_ISSUES.md`（按 v0.1~v0.4 拆分，含验收标准与建议 labels）

---

## 5. 风险与依赖（提前规避）

- TipTap 版本与 React 19 兼容性：先跑通最小编辑器，再叠加扩展（placeholder、history、link 等）
- SQLite schema 变更：必须有 migration；不要“删库重建”当策略
- AI/TTS 网络不稳定：需要超时、取消、重试、错误码；UI 不阻塞编辑
- 成本与配额：记录 provider/model/用量（可选），至少能提示“额度/鉴权问题”
- 隐私：默认不上传整篇，仅上传选区；并在 UI 明确提示上传范围

---

## 6. 测试与验收（最小可持续）

- Rust：数据库层（`sqlx` CRUD + 迁移 + 唯一键）单元测试
- Rust：AI Provider 的序列化/错误映射测试（不打真实网络）
- 手工验收清单（每个里程碑一页）：启动/保存/重启/导出导入/错误提示

---

## 7. 技术选型

### 7.1 当前仓库已使用（与版本）

| 层级 | 技术选择 |
|------|----------|
| 桌面框架 | Tauri v2（`@tauri-apps/api@^2` / `tauri@2`） |
| 前端框架 | React 19.1 + TypeScript |
| 构建工具 | Vite 7 |
| Rust | edition 2021；`serde` / `serde_json` |
| Node 包管理 | pnpm（仓库已有 `pnpm-lock.yaml`） |

### 7.2 计划引入（随里程碑落地）

| 场景 | 技术/库 | 备注 |
|------|---------|------|
| UI | Tailwind CSS + shadcn/ui | v0.1 早期引入，用于统一风格与组件 |
| 状态管理 | Zustand | 轻量，适合编辑器/面板状态 |
| 富文本编辑 | TipTap | 存储 ProseMirror JSON（见 3.2） |
| 本地存储 | SQLite（Rust 侧）+ `sqlx` | v0.1；选择 `sqlx`（SQLite driver）+ migrations；配合 `tokio` runtime |
| AI HTTP | `reqwest` + `tokio`（或 `ureq`） | v0.2；需要超时/重试/取消与错误映射 |
| 错误处理 | `thiserror` + `exn` | v0.1 起；统一错误码/可重试标记（见 3.6） |
| 密钥安全存储 | `keyring` | v0.2；优先用系统 Keychain/凭据库（见 3.5） |
| 音频播放 | Howler.js（或原生 Audio） | v0.3；先满足“能播/倍速” |

### 7.3 工程约定（落地方式）

- Rust 分层：`commands`（Tauri 命令）→ `services`（AI/TTS/业务）→ `db`（SQLite）→ `models`
- DB：必须 migrations；以 `entry_date (YYYY-MM-DD)` 为唯一键；避免直接用 JS `Date` 当“日记日期”
- 依赖注入：AI Provider / TTS Provider 通过 trait 抽象，便于切换与测试
- 隐私与日志：默认不记录日记正文；所有错误日志脱敏（不含 key、原文全文）

---

## 附录 A：功能架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Echo Daily 客户端                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  日记编辑器  │  │  AI助手面板  │  │  语音播放器  │     │
│  │             │  │             │  │             │     │
│  │ · 富文本编辑 │  │ · 文本润色  │  │ · MP3播放   │     │
│  │ · 选区操作  │  │ · 内容扩展  │  │ · 跟读练习  │     │
│  │ · 自动保存  │  │ · 语法建议  │  │ · 语速调节  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │               侧边栏                              │   │
│  │  · 日历视图  · 历史日记  · 搜索  · 设置          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                    Rust 后端层                           │
├─────────────────────────────────────────────────────────┤
│  · 本地数据库  · AI API 调用  · 文件系统  · 设置管理    │
└─────────────────────────────────────────────────────────┘
```

---

## 附录 B：设计规范（纸质质感风格）

### 配色方案

```css
/* 纸质色调 */
--paper-bg: #F5F1E8;          /* 米白纸张底色 */
--paper-dark: #E8E0D0;        /* 深色纸张纹理 */
--ink-primary: #2C2416;       /* 深褐墨水色 */
--ink-secondary: #5C4A3A;     /* 浅褐墨水色 */
--accent-blue: #4A6FA5;       /* 蓝墨水强调色（AI内容）*/
--accent-red: #A54A4A;        /* 红墨水批注色（建议）*/

/* 纸张质感阴影 */
--shadow-paper: 0 2px 8px rgba(44, 36, 22, 0.08);
--shadow-elevated: 0 4px 16px rgba(44, 36, 22, 0.12);
```

### 组件设计要点

| 元素 | 设计说明 |
|------|----------|
| 背景纹理 | CSS 噪点纹理模拟纸张质感，轻微内阴影 |
| 选中高亮 | 荧光笔划线效果，半透明黄色/蓝色 |
| 按钮 | 轻微圆角 + 纸片按压阴影效果 |
| AI 内容 | 蓝墨水色调，与用户内容区分 |
| 批注建议 | 红墨水色调，类似老师批改 |
| 卡片 | 纸张堆叠阴影效果 |

---

## 附录 C：UI 布局示意

```
┌─────────────────────────────────────────────────────────────┐
│  Echo Daily                    [🔍 搜索]    [⚙️ 设置]      │
├──────┬──────────────────────────────────────────────────────┤
│      │  📅 2026年1月1日  周四                           [✏️]│
│  📅  │  ────────────────────────────────────────────────── │
│      │                                                      │
│ 日历 │  Today I learned something amazing about Rust...     │
│ 31   │  The ownership system makes memory safety            │
│  1←  │  [guaranteed..................]                      │
│  2   │                                                      │
│  3   │  ┌─────────────────────────────────────────────┐    │
│ ...  │  │ 🤖 AI Suggestion                            │    │
│      │  │ │ "makes memory safety guaranteed" can be   │    │
│      │  │ │ refined to:                               │    │
│      │  │ │ "ensures memory safety at compile time"   │    │
│      │  │ └───────────────────────────────────────────┘    │
│      │                                                      │
│      │  [🎧 Listen to Pronunciation]                        │
│      │                                                      │
└──────┴──────────────────────────────────────────────────────┘
```

---

## 附录 D：命令接口草案（占位）

> 这里先保留为“草案”，等 v0.1/v0.2 具体落地时再按实际数据结构调整。

```rust
// 日记管理
#[tauri::command]
async fn upsert_entry(entry_date: String, content_json: String) -> Result<DiaryEntry, AppError>

#[tauri::command]
async fn get_entry(entry_date: String) -> Result<Option<DiaryEntry>, AppError>

#[tauri::command]
async fn list_entries(month: String) -> Result<Vec<DiaryEntry>, AppError> // month: "YYYY-MM"

// AI 操作（settings 由后端安全读取）
#[tauri::command]
async fn ai_polish(text: String) -> Result<AIOperationResult, AppError>

#[tauri::command]
async fn ai_expand(text: String) -> Result<AIOperationResult, AppError>

// TTS
#[tauri::command]
async fn tts_generate(text: String) -> Result<AudioRecord, AppError>

// 设置管理（不回传 api_key）
#[tauri::command]
async fn save_ai_settings(settings: AISettingsPublic) -> Result<(), AppError>

#[tauri::command]
async fn get_ai_settings() -> Result<AISettingsPublic, AppError>
```
