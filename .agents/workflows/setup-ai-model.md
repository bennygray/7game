---
description: 如何安装和运行本地 AI 模型（Qwen3.5-0.8B GGUF）
---

# Qwen3.5-0.8B 本地 AI 安装指南

> 本文档记录了完整的安装调试经验，帮助在新机器上快速部署。

## 一、架构总览

```
游戏前端 (Vite :5173)
    ↓ HTTP
ai-server.ts (Node.js :3001)     ← 游戏 API 网关
    ↓ HTTP (OpenAI 兼容)
llama-server.exe (:8080)         ← llama.cpp 原生推理引擎
    ↓ 加载
Qwen3.5-0.8B-Q4_K_M.gguf        ← 模型文件 (508MB)
```

**为什么不直接用 `node-llama-cpp`？**
Qwen3.5 使用了全新的 **Gated DeltaNet** 架构。`node-llama-cpp` 的原生 C++ 绑定在 Windows 上加载该架构会直接崩溃（模型能加载，推理时进程退出，无错误信息）。而预编译的 `llama-server.exe` (b8390+) 正确实现了 fused Gated DeltaNet kernel，可以稳定推理。

---

## 二、前置条件

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 x64 |
| Node.js | v18+ |
| 磁盘空间 | ~600MB（模型） + ~40MB（llama-server） |
| 内存 | 建议 8GB+（推理时占用 ~1GB） |
| GPU | **推荐**，支持 CUDA，大幅提升推理速度 |

---

## 三、安装步骤

### 步骤 1：克隆项目并安装依赖

```powershell
git clone https://github.com/bennygray/7game.git
cd 7game
npm install
```

### 步骤 2：下载 GGUF 模型（从 ModelScope）

```powershell
npm run download-model
```

或手动下载：
```powershell
# 创建目录
mkdir server\models

# 从 ModelScope（国内高速）下载
curl.exe -L -o server\models\Qwen3.5-0.8B-Q4_K_M.gguf `
  "https://modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/master/Qwen3.5-0.8B-Q4_K_M.gguf"
```

- 文件大小：~508MB
- 国内下载速度：15-20 MB/s
- 验证方式：确认文件大小约 508MB，文件名为 `Qwen3.5-0.8B-Q4_K_M.gguf`

### 步骤 3：下载 llama-server.exe

从 llama.cpp GitHub Releases 下载预编译 Windows CPU 版本：

```powershell
# 下载
curl.exe -L -o llama-server.zip `
  "https://github.com/ggml-org/llama.cpp/releases/download/b8390/llama-b8390-bin-win-cpu-x64.zip"

# 解压到项目目录
Expand-Archive -Path llama-server.zip -DestinationPath server\llama-server -Force

# 删除压缩包
Remove-Item llama-server.zip
```

> **⚠️ 版本要求**：必须 b8390 或更新版本，旧版本不支持 Gated DeltaNet。
> 推荐下载带 CUDA 12.4 的 Windows 压缩包，以获得 GPU 加速。
> 最新版下载地址：https://github.com/ggml-org/llama.cpp/releases

### 步骤 4：启动

```powershell
# 终端 1：启动 AI 后端
npm run ai

# 终端 2：启动游戏前端
npm run dev
```

### 步骤 5：验证

```powershell
curl.exe http://localhost:3001/api/health
# 预期：{"status":"ok","model":"qwen3.5-0.8b","modelReady":true}
```

---

## 四、踩坑记录

### 踩坑 1：node-llama-cpp 原生绑定崩溃

| 现象 | 原因 | 解决 |
|------|------|------|
| 模型加载成功，发送推理请求后进程直接退出，无错误信息 | Qwen3.5 的 Gated DeltaNet 架构在 node-llama-cpp 的 Windows 原生绑定中有 bug | 改用 llama-server.exe 独立进程 |

### 踩坑 2：node-llama-cpp 上下文序列耗尽

| 现象 | 原因 | 解决 |
|------|------|------|
| 第一次推理成功，后续报 `Error: No sequences left` | 全局共享 context，session 未正确释放序列 | 每次请求创建独立 context，用 `finally` 确保 dispose |

### 踩坑 3：模型输出思考内容，正文为空

| 现象 | 原因 | 解决 |
|------|------|------|
| API 返回 `"content":""` | llama-server 自动检测 Qwen3.5 启用 thinking=1，所有 token 都用在 `<think>` 里 | 请求中加 `chat_template_kwargs: {enable_thinking: false}` |

### 踩坑 4：模型输出旁白/动作描写

| 现象 | 原因 | 解决 |
|------|------|------|
| 输出 "懒散地打着哈欠，低声说道" | 小模型容易生成叙述文体 | prompt 中明确禁止，给出好/坏示例对比 |

### 踩坑 5：PowerShell curl 中文参数乱码

| 现象 | 原因 | 解决 |
|------|------|------|
| curl.exe 的 `-d` 参数含中文时报错 | PowerShell 编码与 curl 不兼容 | 将 JSON body 存为文件，用 `-d "@文件路径"` 传参 |

### 踩坑 6：源码编译 llama.cpp 失败

| 现象 | 原因 | 解决 |
|------|------|------|
| `npx node-llama-cpp source download` 失败 | Windows 缺少 C++ 编译工具链（Visual Studio Build Tools） | 直接用 GitHub Releases 预编译版本，无需编译 |

---

## 五、文件清单

```
7game/
├── server/
│   ├── ai-server.ts          ← AI API 网关（启动子进程 + 转发请求）
│   ├── download-model.ts     ← 模型下载脚本
│   ├── models/
│   │   └── Qwen3.5-0.8B-Q4_K_M.gguf  ← 模型文件（.gitignore）
│   └── llama-server/
│       ├── llama-server.exe   ← 推理引擎（.gitignore）
│       ├── ggml-cpu-*.dll     ← CPU 后端
│       └── ...
├── package.json              ← 含 "ai" 和 "download-model" 脚本
└── .gitignore                ← 排除 models/ 和 llama-server/
```

---

## 六、性能参考

在 Intel i7-12700H (14核) 笔记本上测试：

| 指标 | 数值 |
|------|------|
| 模型加载 | ~5 秒 |
| AI 服务启动总时间 | ~8 秒 |
| 推理速度 | ~37 tokens/s |
| 单条台词生成 | ~1-3 秒 |
| 推理时内存占用 | ~1 GB |

---

## 七、快速排错

| 问题 | 检查 |
|------|------|
| `model":"placeholder"` | 检查 `server/models/` 下有无 gguf 文件 |
| `llama-server.exe 未找到` | 检查 `server/llama-server/` 目录 |
| 端口 3001 被占用 | `netstat -aon \| findstr ":3001"` 查进程 PID，然后 `taskkill /PID xxx /F` |
| 端口 8080 被占用 | 同上检查 8080 端口 |
| 推理返回空内容 | 确认 prompt 中有 `/no_think` 或请求中有 `enable_thinking: false` |
