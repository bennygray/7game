# 7game-lite

> 从 [7waygame](https://github.com/bennygray/7waygame) 衍生的最简验证版。
> 核心玩法：文字 MUD + AI 灵智弟子经营模拟。

## 项目定位

用最低成本验证「纯文字 MUD + AI 灵智弟子」能否独立构成核心乐趣。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vite + TypeScript + DOM |
| AI 后端 | Node.js + node-llama-cpp (Qwen 0.8B) |
| 存档 | localStorage |

## 核心系统（骨架集 × 6）

1. 修炼引擎（炼气 → 筑基圆满）
2. 弟子行为树（4 人 × 7 态）+ AI 灵智台词
3. MUD 文字面板 + 命令输入
4. 灵田（2 格）
5. 炼丹（3 丹方）
6. 天劫（炼气 → 筑基）

## 开发规范

详见 [.agents/AGENTS.md](.agents/AGENTS.md)

## License

MIT
