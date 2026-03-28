# 架构反模式清单（Architecture Anti-Patterns）

> **适用**：/SGA 产出物自检
> **来源**：从原 SGPA `anti-patterns.md` §三 迁移 + 新增

---

## 一、跨层通信反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 跨层直接调用 | UI 层直接修改 GameState | 通过 Engine 层的事件/Action |
| 逻辑写在 UI 层 | Electron 进程中计算收益 | 写在 `engine/` 或 `shared/` |
| 公式散落各处 | 三个文件里各写一遍倍率 | 公式统一在 `shared/formulas/` |

## 二、Pipeline 挂载反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 跨阶段因果依赖 | Phase 500 写入的值在 Phase 200 读取 | 调整挂载阶段，确保读在写之后 |
| 同阶段多写者 | 两个 Handler 在 Phase 500 都写 aura | 合并逻辑或分离到不同阶段 |
| 未注册到 Pipeline | 在 tick() 末尾直接写逻辑 | 创建 Handler + 注册到 Pipeline |
| 忽略阶段顺序 | 随意选择挂载阶段编号 | 按 `arch/pipeline.md` 的阶段定义选择 |

## 三、GameState 膨胀反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 存储可计算值 | 在 state 中存 `totalAura`（可从 ticks 算出） | 仅存源数据，计算值实时推导 |
| 无限增长数组 | `state.history[]` 无上限 | 设置 maxLength 或定期清理 |
| 嵌套过深 | `state.sect.buildings[0].rooms[1].items[2]` | 扁平化设计，用 ID 引用 |
| 未定义 Owner | 新字段无明确写入者 | 每个字段必须在 TDD 中标注唯一 Owner |
| 无默认值 | 新字段在旧存档中为 undefined | `createDefaultLiteGameState` 中定义默认值 |

## 四、依赖管理反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 循环依赖 | A import B，B import A | 提取共用逻辑到第三方模块 |
| 跨层 import | engine 文件 import ui 文件 | 遵循分层架构的依赖方向 |
| 隐式依赖 | 通过全局变量或副作用传递数据 | 显式 import + 参数传递 |
| 未更新矩阵 | 添加新依赖后不更新 `arch/dependencies.md` | 每次变更同步更新依赖矩阵 |

## 五、存档迁移反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 破坏性迁移 | 删除字段但不迁移数据 | 提供迁移函数保留数据 |
| 跳版本迁移 | v1 直接迁移到 v3 | 链式迁移 v1→v2→v3 |
| 无默认值兜底 | 新字段无 fallback | defaults 对象兜底所有新字段 |

## 六、文档模块化反模式

| 反模式 | 示例 | 正确做法 |
|--------|------|---------|
| 写入索引而非 detail | 在 MASTER-ARCHITECTURE.md 中添加新的 GameState 拓扑 | 写入 `arch/gamestate.md`，索引仅保留摘要+链接 |
| 超过 400 行不拆分 | detail 文件膨胀到 500 行 | 按关注点进一步拆分，在索引中注册新文件 |
| 新增 detail 未注册 | 创建了新的 detail 文件但未在索引中添加链接 | 必须在对应 MASTER 索引的 Detail 文件清单 中注册 |
