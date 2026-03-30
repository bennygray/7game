/**
 * 碰面 Fallback MUD 文案模板 — Phase F0-α
 *
 * 占位符：{A} = 弟子A姓名，{B} = 弟子B姓名，{LOC} = 地点中文名
 *
 * @see phaseF0-alpha-PRD.md §4.2
 */

import type { EncounterResult } from '../types/encounter';

/** 碰面 Fallback 文案模板（每类 ≥3 条） */
export const ENCOUNTER_TEMPLATES: Record<
  Exclude<EncounterResult, 'none'>,
  string[]
> = {
  chat: [
    '{A}在{LOC}遇到了{B}，两人有一搭没一搭地聊了几句。',
    '{B}路过{LOC}，{A}叫住了对方，闲谈片刻。',
    '{A}和{B}在{LOC}不期而遇，随口聊了几句宗门琐事。',
  ],
  discuss: [
    '{A}与{B}在{LOC}席地而坐，交流起修炼心得。',
    '{A}和{B}就某个功法的诀窍辩论了起来，两人都有所领悟。',
    '{B}向{A}请教了一个难题，{A}倾囊相授，一时相谈甚欢。',
  ],
  conflict: [
    '气氛有些紧张，{A}和{B}在{LOC}发生了言语上的冲突。',
    '{A}见到{B}后冷哼一声，两人互相挖苦了几句。',
    '{A}与{B}在{LOC}差点动起手来，幸好旁人拉住了。',
  ],
};

/**
 * 填充碰面文案模板
 *
 * @param template 含 {A}/{B}/{LOC} 占位符的模板
 * @param nameA 弟子A姓名
 * @param nameB 弟子B姓名
 * @param locationLabel 地点中文名
 */
export function fillEncounterTemplate(
  template: string,
  nameA: string,
  nameB: string,
  locationLabel: string,
): string {
  return template
    .replace(/\{A\}/g, nameA)
    .replace(/\{B\}/g, nameB)
    .replace(/\{LOC\}/g, locationLabel);
}

/**
 * 从模板库中随机选取并填充文案
 */
export function getEncounterText(
  result: Exclude<EncounterResult, 'none'>,
  nameA: string,
  nameB: string,
  locationLabel: string,
  randomFn: () => number = Math.random,
): string {
  const templates = ENCOUNTER_TEMPLATES[result];
  const idx = Math.floor(randomFn() * templates.length);
  return fillEncounterTemplate(templates[idx], nameA, nameB, locationLabel);
}
