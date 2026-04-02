/**
 * Phase I-beta: 社交事件 MUD 文案模板
 *
 * 每类事件 ≥3 条模板，使用 {A}/{B}/{L} 占位符
 * A = 发起方，B = 目标方，L = 地点
 *
 * @see phaseI-beta-PRD.md §5.9
 */

import type { SoulEventType } from '../types/soul';

/** 社交事件类型子集 */
export type SocialEventType = Extract<SoulEventType,
  | 'social-flirt'
  | 'social-confession'
  | 'social-confession-accepted'
  | 'social-confession-rejected'
  | 'social-sworn-proposal'
  | 'social-sworn-accepted'
  | 'social-sworn-rejected'
  | 'social-nemesis-declare'
  | 'social-nemesis-accepted'
  | 'social-nemesis-rejected'
  | 'social-lover-broken'
  | 'social-sworn-broken'
  | 'social-nemesis-resolved'
>;

export const SOCIAL_EVENT_TEMPLATES: Record<SocialEventType, string[]> = {
  'social-flirt': [
    '{A}望向{B}的眼神中多了几分温柔。',
    '{A}在{L}故意走近{B}身旁，两人目光交汇了一瞬。',
    '{A}低声对{B}说了什么，{B}的脸微微泛红。',
  ],
  'social-confession': [
    '{A}鼓起勇气走向{B}，红着脸低声说了什么。',
    '{A}在{L}趁无人时，向{B}递出了一枝灵花。',
    '{A}深吸一口气，对{B}说道："我……有些话想跟你说。"',
  ],
  'social-confession-accepted': [
    '{B}怔了片刻，{P_B}嘴角浮现出温暖的笑意。两人在{L}并肩而立。',
    '{B}接过灵花，轻声道："我也是。"——{L}的月光格外柔和。',
    '{A}与{B}在{L}互许道心，从此结为道侣。',
  ],
  'social-confession-rejected': [
    '{B}沉默良久，轻轻摇了摇头。{A}独自转身离去。',
    '{B}叹了口气："你是好人，但……"。{A}勉强一笑。',
    '{A}的心意被{B}婉拒，{L}的风似乎冷了几分。',
  ],
  'social-sworn-proposal': [
    '{A}在{L}郑重其事地对{B}说："我愿与你义结金兰。"',
    '{A}取出两碗灵酒，推到{B}面前："愿同甘共苦，不弃不离？"',
    '{A}望着{B}，{P_A}眼中满是信任："我想和你结为异姓手足。"',
  ],
  'social-sworn-accepted': [
    '{A}与{B}在{L}对天盟誓，义结金兰！从此祸福与共。',
    '两碗灵酒一饮而尽——{A}与{B}在{L}结为异姓手足。',
    '{A}与{B}并肩而立，彼此之间的羁绊又深了一层。',
  ],
  'social-sworn-rejected': [
    '{B}犹豫了很久，最终放下了酒碗："我还没准备好。"',
    '{B}婉言谢绝了{A}的结拜邀约。{A}面色微变。',
    '{A}的结拜提议被{B}婉拒。两人之间似乎多了一丝尴尬。',
  ],
  'social-nemesis-declare': [
    '{A}在{L}冷冷地盯着{B}："从今以后，你我势不两立。"',
    '{A}指着{B}的鼻子："你给我记住——这笔账迟早要算。"',
    '{A}再也无法忍受{B}，在{L}当众宣告决裂。',
  ],
  'social-nemesis-accepted': [
    '{B}冷笑一声："正合我意。"——两人从此势同水火。',
    '{B}拍案而起："既然你撕破了脸，那就不必客气。"',
    '{A}与{B}在{L}公开对立，宗门气氛骤然紧张。',
  ],
  'social-nemesis-rejected': [
    '{B}不屑地转过身："你不值得我当对手。"',
    '{B}淡淡一笑，并未接茬。{A}攥紧了拳头。',
    '{A}的宣战被{B}无视了——这让{P_A}更加愤怒。',
  ],
  'social-lover-broken': [
    '{A}与{B}在{L}长谈之后，黯然分手。道侣缘尽。',
    '{B}取下定情灵花放在桌上，转身离去。{A}一言不发。',
    '曾经的道侣{A}与{B}分道扬镳，{L}的空气都沉重了几分。',
  ],
  'social-sworn-broken': [
    '{A}将盟约令牌摔在地上："你我情义到此为止！"',
    '金兰之盟一朝崩裂——{A}与{B}在{L}决裂。',
    '{A}冷冷地看着{B}："我不该信你。"手足反目成仇。',
  ],
  'social-nemesis-resolved': [
    '{A}在{L}主动向{B}递出灵茶。多年恩怨，一笑泯之。',
    '{A}与{B}在{L}不约而同地低下了头——宿敌之间的坚冰终于消融。',
    '经历了诸多波折，{A}与{B}终于放下了往日仇怨。',
  ],
};

/** 随机选取一条模板 */
export function pickSocialTemplate(eventType: SocialEventType): string {
  const templates = SOCIAL_EVENT_TEMPLATES[eventType];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 填充社交事件文案模板
 *
 * @param template 含 {A}/{B}/{L} 占位符的模板（{P_A}/{P_B} 可选）
 * @param nameA 发起方姓名
 * @param nameB 目标方姓名
 * @param locationLabel 地点中文名
 * @param pronounA 发起方代词（他/她/其），undefined 时跳过替换
 * @param pronounB 目标方代词（他/她/其），undefined 时跳过替换
 */
export function fillSocialTemplate(
  template: string,
  nameA: string,
  nameB: string,
  locationLabel: string,
  pronounA?: string,
  pronounB?: string,
): string {
  let result = template
    .replace(/\{A\}/g, nameA)
    .replace(/\{B\}/g, nameB)
    .replace(/\{L\}/g, locationLabel);
  if (pronounA !== undefined) result = result.replace(/\{P_A\}/g, pronounA);
  if (pronounB !== undefined) result = result.replace(/\{P_B\}/g, pronounB);
  return result;
}
