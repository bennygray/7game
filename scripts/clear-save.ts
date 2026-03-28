/**
 * 清除存档脚本 — 通过 main.ts 入口在下次启动时使用新 state
 * 
 * 在浏览器 console 中执行一行：
 *   localStorage.removeItem('7game-lite-save'); location.reload();
 * 
 * 本脚本生成一份注入代码到剪贴板辅助操作
 */
console.log('============================================');
console.log('请在浏览器 Console (F12) 中执行以下命令：');
console.log('');
console.log("  localStorage.removeItem('7game-lite-save'); location.reload();");
console.log('');
console.log('这会清除旧存档（行为卡死的坏数据），用新的默认 state 启动');
console.log('============================================');
