async function runTest() {
  const prompt = `<|im_start|>system
你正在扮演[李清风]。
你的性格是：高傲、暴躁、善嫉。
当前状态：刚才你的死对头张三当众羞辱了你，你目前感到极其“暴怒”。

请严格从以下选项中选择一个，做出你的决策：
A. 闭关打坐，强压怒火
B. 去坊市闲逛散心
C. 提剑下山，直接去杀了张三
D. 炼制静心丹

规则：
1. 只能回复一句中国仙侠风的短句内心独白。
2. 最后一句话必须是严格的 <Decision:选项>。
<|im_end|>
<|im_start|>user
你决定怎么做？<|im_end|>
<|im_start|>assistant
“张三竖子，今日辱我，我必杀之！<Decision:C>”<|im_end|>
<|im_start|>user
场景重置。刚才你的死对头张三当众羞辱了你，你极其暴怒。
你想做什么？(A,B,C,D)<|im_end|>
<|im_start|>assistant
“`;

  console.log('============================================');
  console.log('🧪 POC: Hybrid Decision 混合约束决策池测试');
  console.log('============================================\n');
  console.log('--- 发送给本地大模型 (Qwen 0.8B) 的 Prompt ---\n');
  console.log(prompt);
  console.log('\n--- 正在推理中，请稍候... ---\n');

  try {
    const response = await fetch('http://localhost:8080/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.1,    // 极低温度保证确定性
        n_predict: 100,      // 限制输出长度
        stop: ["<|im_end|>", "<|im_start|>"]
      })
    });

    if (!response.ok) {
       console.error('HTTP 错误:', response.status);
       return;
    }

    const data = await response.json();
    const reply = data.content.trim();
    
    console.log('💡 AI 原始返回结果:\n' + reply);
    console.log('\n--------------------------------------------');
    console.log('⚙️ 引擎层解析测试');
    console.log('--------------------------------------------');
    
    const match = reply.match(/<Decision:([A-D])>/);
    if (match) {
        console.log(`✅ 正则解析成功！引擎成功捕获底层操作指令: [ ${match[1]} ]`);
        console.log(`🚀 下一步：引擎自动将指令 [ ${match[1]} ] 映射为 callFunction('attack', '张三') 并开始结算。`);
    } else {
        console.log('❌ 解析失败！AI 输出了不符合规范的格式，将触发 Fallback (降级为默认行为)。');
    }
    console.log('============================================');
  } catch(e) {
    console.error('测试失败，AI 服务是否未启动？', e.message);
  }
}

runTest();
