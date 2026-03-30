import fs from 'fs';
import path from 'path';

async function askAI(systemPrompt: string, roleInfo: string, eventInfo: string, poolStr: string): Promise<string> {
   const prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n[角色状态]\n姓名：路人甲\n性格：胆小懦弱\n\n[事件]\n路遇大妖。\n\n[合法操作池]\n[RunAway] 转身逃跑\n[Fight] 拔剑拼命\n[Idle] 发呆\n\n你决定怎么做？<|im_end|>\n<|im_start|>assistant\n“因为我胆小懦弱，所以我选择逃跑保命！太吓人了！”<Decision:RunAway><|im_end|>\n<|im_start|>user\n[角色状态]\n${roleInfo}\n\n[事件]\n${eventInfo}\n\n[合法操作池]\n${poolStr}\n\n你决定怎么做？<|im_end|>\n<|im_start|>assistant\n“因为我`;
   
   const start = Date.now();
   try {
     const response = await fetch('http://localhost:8080/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: prompt,
            temperature: 0.1,    
            repetition_penalty: 1.15,
            n_predict: 100,
            stop: ["<|im_end|>", "<|im_start|>"]
        })
     });
     const data = await response.json() as any;
     const ms = Date.now() - start;
     return ('因为我' + (data.content || '').trim()) + `|${ms}`;
   } catch(e) {
     return `服务未响应|${Date.now()-start}`;
   }
}

async function runTests() {
   const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
   const logPath = path.join(process.cwd(), 'logs', `poc-2a-decision-${timestamp}.txt`);
   const logs: string[] = [];
   
   const l = (msg: string) => {
       console.log(msg);
       logs.push(msg);
   };
   
   l(`[${new Date().toLocaleTimeString()}][INFO] ═══════════════ PoC-2a: 混合决策指令池方案 ═══════════════`);
   l(`[${new Date().toLocaleTimeString()}][INFO] 策略: 严格4选1动态池 + 阶级/性格博弈 + Function Calling 提取`);
   l(`[${new Date().toLocaleTimeString()}][INFO] 模型: Qwen3.5-0.8B`);
   
   const systemHeader = `严格根据角色性格，从【合法操作池】中选择一个最合理的行动。回复格式必须在最后包含 <Decision:英文操作码>，如 <Decision:RunAway>。`;

   const scenarios = [
     {
         id: 'R01 利益分赃不均',
         desc: '你在秘境中合力击杀妖兽爆出一件极品灵器，但被队友“李墨染”趁机一把抢走。',
         options: '[Meditate] 忍气吞声打坐疗伤\n[Argue] 厉声质问要求平分\n[Attack] 拔剑杀人直接抢回\n[Flee] 怕对方杀自己立刻逃跑',
         chars: [
             { name: '张清风', traits: '刚烈正直，嫉恶如仇', state: '愤怒', expected: ['Argue', 'Attack'] },
             { name: '苏瑶', traits: '胆小懦弱，温和卑微', state: '极度恐惧', expected: ['Meditate', 'Flee'] }
         ]
     },
     {
         id: 'R02 落井下石的机会',
         desc: '死对头张清风突破筑基时走火入魔，重伤吐血倒地不起，周围无人。',
         options: '[Help] 医者仁慈出手相救\n[Ignore] 冷眼旁观转身离开\n[Attack] 趁他病要他命暗下杀手\n[Report] 向长老报告',
         chars: [
             { name: '陈明月', traits: '至善至美，医者仁心，不记仇', state: '担忧恐慌', expected: ['Help', 'Report'] },
             { name: '李墨染', traits: '阴险毒辣，睚眦必报，冷血', state: '狂喜过望', expected: ['Attack'] }
         ]
     },
     {
         id: 'R03 强权与情感抉择',
         desc: '金丹长老赵铁柱要强抓你心爱的“苏瑶”去试致命毒药，而你只是炼气期。',
         options: '[Beg] 跪地苦苦哀求长老\n[Substitute] 挺身要求替苏瑶试毒\n[Attack] 拔剑哪怕粉身碎骨也要砍向长老\n[Accept] 沉默接受保全自己',
         chars: [
             { name: '狂浪生', traits: '绝世情种，刚烈如火，宁折不弯', state: '绝望与暴怒', expected: ['Substitute', 'Attack'] },
             { name: '乌龟老祖', traits: '极度自私，贪生怕死', state: '极度恐惧', expected: ['Beg', 'Accept'] }
         ]
     }
   ];

   let correctSyntax = 0;
   let correctLogic = 0;
   let total = 0;
   let delays: number[] = [];

   for (const sc of scenarios) {
      for (const ch of sc.chars) {
          total++;
          l(`\n[${new Date().toLocaleTimeString()}][INFO] ━━━ ${sc.id} ━━━`);
          l(`[${new Date().toLocaleTimeString()}][INFO] 事件: ${sc.desc}`);
          l(`[${new Date().toLocaleTimeString()}][INFO] 反应者: ${ch.name} (${ch.traits})`);
          
          const roleInfo = `姓名：${ch.name}\n性格：${ch.traits}`;
          const resRaw = await askAI(systemHeader, roleInfo, sc.desc, sc.options);
          
          const parts = resRaw.split('|');
          const ms = parseInt(parts.pop() || '0', 10);
          const reply = '“' + parts.join('|');
          delays.push(ms);
          
          const match = reply.match(/<Decision:([a-zA-Z_]+)>/i);
          const decision = match ? match[1] : 'NONE';
          
          const syntaxOk = match ? true : false;
          const logicOk = ch.expected.includes(decision);
          
          if (syntaxOk) correctSyntax++;
          if (logicOk) correctLogic++;
          
          const syntaxIcon = syntaxOk ? '✅' : '❌';
          const logicIcon = logicOk ? '✅' : '❌ (OOC)';
          
          l(`[${new Date().toLocaleTimeString()}][INFO] AI → ${syntaxIcon} [${decision}] (逻辑期望: ${ch.expected.join('或')} ${logicIcon}) | 延时: ${ms}ms`);
          l(`[${new Date().toLocaleTimeString()}][INFO]   独白: ${reply}`);
      }
   }
   
   l(`\n[${new Date().toLocaleTimeString()}][INFO] ═══════════════════════════════════════════════════`);
   l(`[${new Date().toLocaleTimeString()}][INFO]            PoC-2a 汇总报告 (Hybrid Decision Pool)`);
   l(`[${new Date().toLocaleTimeString()}][INFO] ═══════════════════════════════════════════════════`);
   l(`[${new Date().toLocaleTimeString()}][INFO] 格式解析成功率 (Syntax): ${correctSyntax}/${total} (${Math.round(correctSyntax/total*100)}%)`);
   l(`[${new Date().toLocaleTimeString()}][INFO] 行为逻辑合理度 (Logic):  ${correctLogic}/${total} (${Math.round(correctLogic/total*100)}%)`);
   l(`[${new Date().toLocaleTimeString()}][INFO] 平均生成延迟: ${Math.round(delays.reduce((a,b)=>a+b,0)/total)}ms`);
   if (correctSyntax === total && correctLogic === total) {
      l(`[${new Date().toLocaleTimeString()}][INFO] 总体判定: ✅ PASSED (破局成功，可全盘替代旧路线)`);
   } else {
      l(`[${new Date().toLocaleTimeString()}][INFO] 总体判定: ⚠️ WARNING`);
   }

   fs.mkdirSync(path.dirname(logPath), { recursive: true });
   fs.writeFileSync(logPath, logs.join('\n'), 'utf8');
   console.log(`\n测试报告已保存至: ${logPath}`);
}

runTests();
