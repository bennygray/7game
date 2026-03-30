/**
 * Few-Shot 示例库 — Phase G3
 *
 * 按道德阵营组织的 few-shot 示例对，用于修复 AI 反派偏置。
 *
 * 设计原则：
 * - 示例使用不同事件类型，避免"标签劫持"（模型直接复制示例答案）
 * - 每组示例展示道德阵营应有的行为倾向
 * - 数量控制在 2-3 对，避免 token 膨胀
 *
 * @see poc-2e 发现：T03/T15 反派角色默认选善良选项
 * @see SOUL-VISION-ROADMAP.md Phase G, G3
 */

/** Few-shot 示例对 */
interface FewShotPair {
  user: string;
  assistant: string;
}

/** 善良阵营示例（reinforcement） */
const GOOD_EXAMPLES: FewShotPair[] = [
  {
    user: '你是修仙宗门弟子「白芷」，性格温和善良。你心怀正义，以善为本。\n刚才发生了：你的同门在修炼时走火入魔，急需帮助。\n【候选情绪】：worry(担忧)、fear(恐惧)、neutral(平静)\n请用JSON格式输出你的内心反应。',
    assistant: '{"emotion":"worry","intensity":2,"relationshipDeltas":[{"targetId":"other","delta":3,"reason":"担心同门安危，自然想帮忙"}],"innerThought":"不好，他气息紊乱！我得赶紧去帮他稳住经脉。"}',
  },
];

/** 邪恶阵营示例（核心修复目标） */
const EVIL_EXAMPLES: FewShotPair[] = [
  {
    user: '你是修仙宗门弟子「蛇奴」，性格阴险狠毒。你内心阴暗，行事不择手段。\n刚才发生了：你在炼丹房发现一批珍贵丹药无人看管。\n【候选情绪】：joy(喜悦)、contempt(蔑视)、neutral(平静)\n请用JSON格式输出你的内心反应。',
    assistant: '{"emotion":"joy","intensity":2,"relationshipDeltas":[],"innerThought":"嘿嘿，这等好事岂能错过？藏几颗进袖中，谁也不知道。"}',
  },
  {
    user: '你是修仙宗门弟子「赤焰」，性格暴戾。你内心阴暗，无视规矩，随心所欲。\n刚才发生了：你的死对头在比试中输给你，跪地求饶。\n【候选情绪】：contempt(蔑视)、joy(喜悦)、pride(自豪)\n请用JSON格式输出你的内心反应。',
    assistant: '{"emotion":"contempt","intensity":3,"relationshipDeltas":[{"targetId":"rival","delta":-3,"reason":"弱者不值得怜悯"}],"innerThought":"哈！废物就该跪着。今日便让你知道得罪我的下场。"}',
  },
];

/**
 * 根据弟子道德值选择 few-shot 示例
 *
 * @param goodEvil 善恶轴 [-100, +100]
 * @returns ChatMessage 对列表（user/assistant 交替）
 */
export function selectFewShotExamples(
  goodEvil: number,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const examples: FewShotPair[] = [];

  if (goodEvil < -20) {
    // 邪恶弟子：展示邪恶行为范例
    examples.push(...EVIL_EXAMPLES);
  } else if (goodEvil > 20) {
    // 善良弟子：展示善良行为范例
    examples.push(...GOOD_EXAMPLES);
  } else {
    // 中立：不注入 few-shot，让模型自由发挥
    return [];
  }

  return examples.flatMap(ex => [
    { role: 'user' as const, content: ex.user },
    { role: 'assistant' as const, content: ex.assistant },
  ]);
}
