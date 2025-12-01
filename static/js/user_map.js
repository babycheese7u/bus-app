// =======================
//  user_map.js（利用者用）
// =======================

// 共通コード側の "onStopPassed" を利用者用に上書き
function onStopPassed(stopName) {
  console.log("利用者画面：通過検知（送信なし） →", stopName);
}