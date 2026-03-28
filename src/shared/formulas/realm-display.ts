/**
 * 境界显示名工具函数（共享）
 *
 * CR-A3: 从 breakthrough-engine.ts 和 main.ts 中提取，
 * 避免重复定义。
 */

/** 获取境界的中文显示名 */
export function getRealmDisplayName(realm: number, subRealm: number): string {
  if (realm === 1) return `炼气${subRealm}层`;
  if (realm === 2) {
    const names = ['初期', '中期', '后期', '圆满'];
    return `筑基${names[subRealm - 1] ?? ''}`;
  }
  return '未知';
}
