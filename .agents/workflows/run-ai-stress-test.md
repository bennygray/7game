---
description: 如何运行 AI 推理压力测试
---

# AI 推理压力测试

测试 AI 推理服务的并发处理能力和响应速度。

## 前提条件

// turbo
```bash
npm run ai
```

确认 AI 服务正常运行：
// turbo
```bash
curl http://localhost:3001/api/health
```

## 运行压力测试

### 默认梯级（1→128 弟子）
// turbo
```bash
npx tsx server/tests/ai-stress-test.ts
```

### 自定义梯级
// turbo
```bash
$env:LEVELS="1,4,16,64"; npx tsx server/tests/ai-stress-test.ts
```

### 详细模式（显示每条台词）
// turbo
```bash
npx tsx server/tests/ai-stress-test.ts --verbose
```

## 手动单条测试

// turbo
```bash
curl -X POST http://localhost:3001/api/generate -H "Content-Type: application/json" -d "@server/tests/fixtures/sample-request.json"
```

## 性能基准参考（RTX 5070 + CUDA 12.4）

| 弟子数 | 总耗时 | 吞吐量 |
|--------|--------|--------|
| 1      | ~60ms  | 17 条/秒 |
| 16     | ~1.5s  | 10 条/秒 |
| 64     | ~6.3s  | 10 条/秒 |
| 128    | ~12s   | 10 条/秒 |

CPU-only 模式下吞吐量约 1.4 条/秒。
