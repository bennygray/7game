"""
Trinity Pipeline 文档完整性检查器。
由 Stop hook 自动调用——每次 Claude Code 会话结束前执行。
确保文档联动更新不被遗漏。

部署路径：scripts/doc-integrity-check.py
Hook 触发：Stop → python scripts/doc-integrity-check.py

重要：此脚本不阻塞会话结束，只输出检查结果供人类参考。
"""

import os
import sys
import subprocess
import time
from datetime import date

# Windows 终端 GBK 编码兼容
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def get_git_changes():
    """获取当前未提交的 Git 变更文件列表"""
    all_files = set()
    try:
        # 已修改未暂存
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            capture_output=True, text=True, cwd="."
        )
        if result.returncode == 0:
            all_files.update(f.strip() for f in result.stdout.strip().split('\n') if f.strip())

        # 已暂存
        staged = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True, text=True, cwd="."
        )
        if staged.returncode == 0:
            all_files.update(f.strip() for f in staged.stdout.strip().split('\n') if f.strip())

        # 未跟踪
        untracked = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            capture_output=True, text=True, cwd="."
        )
        if untracked.returncode == 0:
            all_files.update(f.strip() for f in untracked.stdout.strip().split('\n') if f.strip())
    except Exception:
        pass
    return all_files


def has_code_changes(files):
    """检查是否有代码文件变更"""
    code_dirs = ["src/", "server/"]
    return any(f.startswith(d) for f in files for d in code_dirs)


def has_doc_changes(files):
    """检查是否有文档变更"""
    return any(f.startswith("docs/") for f in files)


def file_modified_today(filepath):
    """检查文件是否今天被修改过"""
    if not os.path.exists(filepath):
        return False
    mtime = os.path.getmtime(filepath)
    mod_date = time.strftime('%Y-%m-%d', time.localtime(mtime))
    today = time.strftime('%Y-%m-%d')
    return mod_date == today


def detect_active_phase():
    """从 pipeline 目录检测最近活跃的 Phase"""
    pipeline_dir = "docs/pipeline"
    if not os.path.isdir(pipeline_dir):
        return None
    phases = [d for d in os.listdir(pipeline_dir)
              if os.path.isdir(os.path.join(pipeline_dir, d))]
    if not phases:
        return None
    phases.sort(
        key=lambda d: os.path.getmtime(os.path.join(pipeline_dir, d)),
        reverse=True
    )
    return phases[0]


def run_checks():
    """执行文档完整性检查"""
    changes = get_git_changes()
    phase = detect_active_phase()

    # 无变更时静默退出
    if len(changes) == 0:
        return

    print(f"\n{'=' * 60}")
    print(f"  📋 文档完整性检查（会话结束前自动执行）")
    print(f"  日期: {date.today()} | 活跃 Phase: {phase or '未检测到'}")
    print(f"  变更文件数: {len(changes)}")
    print(f"{'=' * 60}\n")

    warnings = []

    # 检查 1：handoff.md 是否更新（有实质性工作时）
    if len(changes) > 3:
        if not file_modified_today("docs/project/handoff.md"):
            warnings.append(
                "⚠️  handoff.md 今天未更新"
                "（AGENTS.md §3.12 要求每次会话结束前更新）"
            )

    # 检查 2：代码变更是否有对应文档变更
    if has_code_changes(changes) and not has_doc_changes(changes):
        warnings.append(
            "⚠️  有代码变更但无文档变更"
            "（AGENTS.md §四要求先文档后编码）"
        )

    # 检查 3：Pipeline 过程资产
    if phase:
        pipeline_dir = f"docs/pipeline/{phase}"
        if os.path.isdir(pipeline_dir):
            assets = os.listdir(pipeline_dir)
            if not any(a.endswith('.md') for a in assets):
                warnings.append(f"⚠️  {pipeline_dir}/ 中无过程文档")

    # 检查 4：新增代码文件是否在 layers.md 注册
    new_ts_files = [f for f in changes
                    if (f.startswith("src/") or f.startswith("server/"))
                    and f.endswith(".ts")]
    if new_ts_files and os.path.exists("docs/design/arch/layers.md"):
        with open("docs/design/arch/layers.md", 'r', encoding='utf-8') as fd:
            layers_content = fd.read()
        for cf in new_ts_files[:5]:
            basename = os.path.basename(cf)
            if basename not in layers_content:
                warnings.append(f"⚠️  新/改文件 {cf} 可能未在 layers.md 中注册")

    # 输出结果
    if warnings:
        print("  发现以下问题：\n")
        for w in warnings:
            print(f"    {w}")
        print(f"\n  💡 这些是提醒，不会阻塞你的工作。")
        print(f"     建议在下次会话开始时优先处理。")
    else:
        print("  ✅ 文档完整性检查通过，无遗漏项。")

    print(f"\n{'=' * 60}\n")


if __name__ == "__main__":
    run_checks()
