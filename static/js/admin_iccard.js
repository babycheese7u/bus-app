// =====================
// DOM 取得
// =====================
const switchE1  = document.getElementById("modeSwitch");
const modeE1    = document.getElementById("mode");
const uidE1     = document.getElementById("uid");
const sectionE1 = document.getElementById("section");
const resultE1  = document.getElementById("result");

// =====================
// モード切替
// =====================
switchE1.addEventListener("change", () => {
    modeE1.textContent = switchE1.checked ? "降車" : "乗車";
});

// =====================
// ICカードUID取得
// =====================
async function fetchUID() {
    resultE1.textContent = "読み取り中...";
    const status = switchE1.checked ? "降車" : "乗車";

    const res = await fetch("/get_uid", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ status })
    });

    const data = await res.json();

    uidE1.textContent = data.uid ?? "カードが読み取れません";
    resultE1.textContent = data.uid
        ? `${data.status} として保存しました`
        : "読み取り失敗";
}

// ボタンにイベント追加
document.getElementById("read-uid").addEventListener("click", fetchUID);

// =====================
// 区間切替
// =====================
document.getElementById("next-section").addEventListener("click", () => {
    fetch("/next_section", { method: "POST" })
    .then(res => res.json())
    .then(data => {
        resultE1.textContent = data.message;
        sectionE1.textContent = data.next_section;
    });
});
