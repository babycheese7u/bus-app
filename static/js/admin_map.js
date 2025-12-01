// ==========================
//  admin_map.js（管理者用）
// ==========================

// バス停通過ログをサーバに送信
async function logPass(stopName) {
  await fetch("/log_bus_pass", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ stop: stopName })
  });
  console.log("【送信済】通過記録:", stopName);
}

// 共通コードから呼ばれるコールバック
function onStopPassed(stopName) {
  logPass(stopName);   // 管理者は送信する
}