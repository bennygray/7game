"""
Trinity Pipeline Gate 确定性验证器。
被 SubagentStop Hook 自动调用，也可手动运行。
不涉及 LLM，纯确定性文件/格式检查。

部署路径：scripts/gate-check.py
Hook 触发：SubagentStop(doc-reviewer) → python scripts/gate-check.py --phase auto --from-review

用法：
  python scripts/gate-check.py --phase phaseZ --gate 1
  python scripts/gate-check.py --phase auto --from-review
"""

import sys
import os
import re
import glob
import time
import argparse
from datetime import date


def file_exists(path):
    return os.path.exists(path)


def has_gate_signature(filepath, gate_num):
    """检查文件中是否有对应的 GATE 签章"""
    if not filepath or not os.path.exists(filepath):
        return False
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = rf'\[x\]\s*GATE\s*{gate_num}\s*PASSED'
    return bool(re.search(pattern, content, re.IGNORECASE))


def review_exists(phase, stage):
    """检查审查记录是否存在"""
    pattern = f".reviews/{phase}-{stage}-r*.md"
    return len(glob.glob(pattern)) > 0


def check_review_has_substance(phase, stage):
    """检查审查报告是否包含实质内容（对抗橡皮图章）
    
    如果审查报告中没有任何 WARN、改进建议、或 Devil's Advocate 记录，
    说明审查可能是橡皮图章。
    """
    files = sorted(glob.glob(f".reviews/{phase}-{stage}-r*.md"))
    if not files:
        return False
    with open(files[-1], 'r', encoding='utf-8') as f:
        content = f.read()
    has_suggestions = '改进建议' in content or '⚠️' in content or 'WARN' in content
    has_devils_advocate = "Devil's Advocate" in content or '反向验证' in content
    return has_suggestions or has_devils_advocate


def file_modified_recently(filepath, days=3):
    """检查文件是否在最近 N 天内被修改"""
    if not os.path.exists(filepath):
        return False
    mtime = os.path.getmtime(filepath)
    return (time.time() - mtime) < (days * 86400)


def find_prd(phase):
    """查找 Phase 对应的 PRD 文件"""
    for p in [f"docs/features/{phase}-PRD.md", f"docs/features/{phase}-analysis.md"]:
        if os.path.exists(p):
            return p
    return None


def find_tdd(phase):
    """查找 Phase 对应的 TDD 文件"""
    path = f"docs/design/specs/{phase}-TDD.md"
    return path if os.path.exists(path) else None


def find_user_stories(phase):
    """查找 Phase 对应的 User Stories 文件"""
    path = f"docs/design/specs/{phase}-user-stories.md"
    return path if os.path.exists(path) else None


def report(gate_name, phase, checks):
    """输出检查报告并返回 pass/fail"""
    print(f"\n{'=' * 60}")
    print(f"  {gate_name} 检查 — Phase: {phase}")
    print(f"  日期: {date.today()}")
    print(f"{'=' * 60}\n")

    all_pass = True
    for item, passed in checks.items():
        status = "✅" if passed else "❌"
        if not passed:
            all_pass = False
        print(f"  {status}  {item}")

    print(f"\n{'─' * 60}")
    if all_pass:
        print(f"  ✅ {gate_name} PASS")
        # 写入 Gate 通过记录
        os.makedirs(".reviews/gates", exist_ok=True)
        with open(f".reviews/gates/{phase}-gate-report.md", 'a', encoding='utf-8') as f:
            f.write(f"\n## {gate_name} — {date.today()} PASS\n")
            for item, passed in checks.items():
                f.write(f"- {'✅' if passed else '❌'} {item}\n")
    else:
        print(f"  ❌ {gate_name} FAIL — 以上标记 ❌ 的项目需要完成")
    print(f"{'=' * 60}\n")

    return 0 if all_pass else 1


# ===== Gate 检查函数 =====

def check_gate_1(phase):
    """Gate 1: SPM → SGA 转换检查"""
    prd_path = find_prd(phase)
    checks = {
        "PRD 文件存在": prd_path is not None,
        "User Stories 文件存在": find_user_stories(phase) is not None,
        "GATE 1 签章存在": has_gate_signature(prd_path, 1),
        "审查记录存在": review_exists(phase, "spm"),
        "审查包含实质内容": check_review_has_substance(phase, "spm"),
        "SPM 分析过程存在": file_exists(f"docs/pipeline/{phase}/spm-analysis.md"),
    }
    return report("GATE 1", phase, checks)


def check_gate_2(phase):
    """Gate 2: SGA → SGE 转换检查"""
    tdd_path = find_tdd(phase)
    checks = {
        "Gate 1 已通过": has_gate_signature(find_prd(phase), 1),
        "TDD 文件存在": tdd_path is not None,
        "GATE 2 签章存在": has_gate_signature(tdd_path, 2),
        "审查记录存在": review_exists(phase, "sga"),
        "审查包含实质内容": check_review_has_substance(phase, "sga"),
        "实施计划存在": file_exists(f"docs/pipeline/{phase}/plan.md"),
    }
    return report("GATE 2", phase, checks)


def check_gate_3(phase):
    """Gate 3: SGE → 完成检查"""
    checks = {
        "Gate 2 已通过": has_gate_signature(find_tdd(phase), 2),
        "审查记录存在": review_exists(phase, "sge"),
        "审查包含实质内容": check_review_has_substance(phase, "sge"),
        "task.md 存在": file_exists(f"docs/pipeline/{phase}/task.md"),
        "walkthrough.md 存在": file_exists(f"docs/pipeline/{phase}/walkthrough.md"),
        "handoff.md 近期更新": file_modified_recently("docs/project/handoff.md"),
    }
    return report("GATE 3", phase, checks)


def detect_phase():
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


# ===== 入口 =====

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Trinity Pipeline Gate 确定性验证")
    parser.add_argument("--phase", required=True, help="Phase 名称（如 phaseZ）或 auto")
    parser.add_argument("--gate", type=int, help="Gate 编号（1/2/3）")
    parser.add_argument("--from-review", action="store_true", help="自动检测并报告所有 Gate 状态")
    args = parser.parse_args()

    phase = args.phase if args.phase != "auto" else detect_phase()
    if not phase:
        print("未检测到活跃 Phase")
        sys.exit(0)

    if args.gate == 1:
        sys.exit(check_gate_1(phase))
    elif args.gate == 2:
        sys.exit(check_gate_2(phase))
    elif args.gate == 3:
        sys.exit(check_gate_3(phase))
    elif args.from_review:
        check_gate_1(phase)
        check_gate_2(phase)
        check_gate_3(phase)
    else:
        print("请指定 --gate N 或 --from-review")
        sys.exit(1)
