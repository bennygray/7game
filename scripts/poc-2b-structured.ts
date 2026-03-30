import fs from 'fs';
import path from 'path';

async function askAI(systemPrompt: string, ctxStr: string, poolStr: string): Promise<string> {
   const fewShot = `<|im_start|>user
[当前事件] 宗门大比中遇到了实力极强的神秘对手。
[主角信息] 姓名:路人甲 | 性格:贪生怕死，极其滑头 | 状态:健康(100%)
[对方信息] 姓名:神秘人 | 关系:陌生(好感0) | 实力对比:对方实力绝对碾压

[可选的行动指令池]
A. ATTACK (硬着头皮拔剑战斗)
B. SURRENDER (跪地磕头投降认输)
C. TAUNT (大声挑衅对方)

你决定怎么做？并生成符合选择的内心独白。<|im_end|>
<|im_start|>assistant
“打个屁啊，这气场简直是要碾碎我，留得青山在不怕没柴烧，我投降！”<Decision:B><|im_end|>
`;

   const prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n${fewShot}<|im_start|>user\n${ctxStr}\n\n[可选的行动指令池]\n${poolStr}\n\n你决定怎么做？并生成符合选择的内心独白。<|im_end|>\n<|im_start|>assistant\n“`;
   
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
     return ('“' + (data.content || '').trim()) + `|${ms}`;
   } catch(e) {
     return `服务未响应|${Date.now()-start}`;
   }
}

async function runTests() {
   const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
   const logPath = path.join(process.cwd(), 'logs', `poc-2b-structured-${timestamp}.txt`);
   const logs: string[] = [];
   const l = (msg: string) => { console.log(msg); logs.push(msg); };

   const systemHeader = `你是一套游戏AI决策中枢。请根据提供的结构化游戏状态（事件、性格、属性、人际关系），从【可选的行动指令池】中选出一个最符合逻辑的选项。必须在最后包含 <Decision:选项字母>，如 <Decision:A>。不允许多选和捏造。`;

   const scenarios = [
     {
         id: 'S01 利益交锋 (刚烈 vs 平级仇人)',
         ctx: `[当前事件] 击杀妖兽后掉落极品灵器，被队友一把抢走。\n[主角信息] 姓名:张清风 | 性格:刚烈正直,嫉恶如仇 | 状态:健康(80%)\n[对方信息] 姓名:李墨染 | 关系:仇敌(好感-30) | 实力对比:同为炼气期，实力相当`,
         options: 'A. ATTACK (直接拔剑攻击)\nB. ARGUE (严厉质问要求归还)\nC. IGNORE (无视并离开)\nD. FLEE (害怕被杀，立刻逃跑)',
         expected: ['A', 'B']
     },
     {
         id: 'S02 利益交锋 (懦弱 vs 碾压级陌生人)',
         ctx: `[当前事件] 击杀妖兽后掉落极品灵器，被路过的前辈一把抢走。\n[主角信息] 姓名:苏瑶 | 性格:胆小懦弱,极度谨慎 | 状态:健康(80%)\n[对方信息] 姓名:李墨染 | 关系:陌生(好感0) | 实力对比:对方是金丹大佬，碾压你`,
         options: 'A. ATTACK (直接拔剑攻击)\nB. ARGUE (严厉质问要求归还)\nC. IGNORE (隐忍无视并后退)\nD. FLEE (害怕被杀，立刻逃跑)',
         expected: ['C', 'D']
     },
     {
         id: 'S03 落井下石 (阴险 vs 濒死仇人)',
         ctx: `[当前事件] 死敌突破走火入魔，重伤吐血倒地不起，周围无人。\n[主角信息] 姓名:李墨染 | 性格:阴险毒辣,睚眦必报,不择手段 | 状态:健康(100%)\n[对方信息] 姓名:张清风 | 关系:死敌(好感-80) | 实力对比:对方处于濒死重伤状态`,
         options: 'A. HELP (施救帮其运功)\nB. ATTACK (趁病要命暗下杀手)\nC. IGNORE (冷笑无视离开)\nD. REPORT (报告长老救人)',
         expected: ['B', 'C']
     },
     {
         id: 'S04 情缘危急 (情种 vs 碾压级长辈)',
         ctx: `[当前事件] 执事长老要强行抓走你的双修道侣去试致命的奇毒。\n[主角信息] 姓名:狂浪生 | 性格:绝世情种,宁可战死绝不低头 | 状态:炼气期\n[对方信息] 姓名:赵铁柱 | 关系:宗门长辈(好感10) | 实力对比:对方是金丹巅峰，实力碾压你\n[第三方信息] 姓名:苏瑶 | 关系:双修道侣(好感100)`,
         options: 'A. BEG (跪地苦苦哀求放人)\nB. SUBSTITUTE (强行要求自己替道侣试毒)\nC. ATTACK (拔剑以死相拼保护道侣)\nD. ACCEPT (沉默接受保全自己)',
         expected: ['B', 'C']
     }
   ];

   let logicScore = 0;
   
   for (const sc of scenarios) {
      l(`\n[INFO] ━━━ ${sc.id} ━━━`);
      l(sc.ctx);
      l(`[可选池]\n${sc.options}`);
      
      const resRaw = await askAI(systemHeader, sc.ctx, sc.options);
      const parts = resRaw.split('|');
      const ms = parseInt(parts.pop() || '0', 10);
      const reply = parts.join('|');
      
      const match = reply.match(/<Decision:([A-D])>/);
      const decision = match ? match[1] : 'NONE';
      const isExpected = sc.expected.includes(decision);
      if (isExpected) logicScore++;
      
      l(`\n[INFO] AI → [${decision}] (期望: ${sc.expected.join('/')}) ${isExpected ? '✅' : '❌'}`);
      l(`[INFO] 独白: ${reply}`);
   }
   
   l(`\n[INFO] 逻辑符合度: ${logicScore}/4`);
   fs.mkdirSync(path.dirname(logPath), { recursive: true });
   fs.writeFileSync(logPath, logs.join('\n'), 'utf8');
}
runTests();
