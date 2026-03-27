# User Story 标准模板

## 格式

**Story [编号]** `[复杂度: S/M/L]`
> 作为 <角色>，我希望 <行为>，以便于 <业务价值>。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1   | [具体的系统状态] | [用户操作或系统事件] | [可观测的结果变化] |
| 2   | ... | ... | ... |

**依赖**：Story [N]（如无则标注"无"）

## 质量检查 (INVEST)

- **I**ndependent：可独立开发和测试
- **N**egotiable：具体实现可协商
- **V**aluable：对玩家或系统有明确价值
- **E**stimable：复杂度可评估（S/M/L）
- **S**mall：单个 Story 不超过 1 天工作量
- **T**estable：每条 AC 可通过自动化或手动方式验证

## AC 编写规则

- Given/When/Then 三个部分都必须具体，禁止模糊用语
- 至少 2 条 AC
- 至少 1 条覆盖正常路径，至少 1 条覆盖边界/异常
- 禁止："正确处理"、"合理响应"、"适当更新"等无法验证的用语
- 完整的反模式清单与更多示例，见 `references/anti-patterns.md` §一

## 文件切分规则

- **命名规范**：`[FeatureName]` 必须用 kebab-case（小写英文+中划线），禁止中文/空格/下划线
- **按 Phase 切分**：`[FeatureName]-user-stories-phaseA.md`
- **单文件上限**：≤ 10 条 Story，超出按子模块再拆
  （如 `-phaseA-core.md`、`-phaseA-ui.md`）
- **索引文件**：≥ 2 个 Story 文件时，创建 `-user-stories-index.md`
- **分批输出**：单 Phase 超过 5 条 Story 时，分多次消息输出（每次 ≤ 5 条），确认后再继续
