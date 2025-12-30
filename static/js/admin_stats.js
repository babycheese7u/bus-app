document.getElementById("loadStats").addEventListener("click", loadStats);

let chartTime, chartStops, chartBuses;

// --------------------
// データ取得
// --------------------
async function loadStats() {
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    const res = await fetch(`/api/stats/usage?start=${start}&end=${end}`);
    const data = await res.json();

    drawCharts(data);
}

// --------------------
// グラフ描画
// --------------------
function drawCharts(data) {
    // 既存グラフ破棄
    if (chartTime) chartTime.destroy();
    if (chartStops) chartStops.destroy();
    if (chartBuses) chartBuses.destroy();

    // -------- 時間（日付）別 --------
    const byDate = {};
    data.forEach(d => {
        const date = d.timestamp.slice(0, 10);
        byDate[date] = (byDate[date] || 0) + d.count;
    });

    chartTime = new Chart(
        document.getElementById("chartTime").getContext("2d"),
        {
            type: "line",
            data: {
                labels: Object.keys(byDate),
                datasets: [{
                    label: "日別利用者数",
                    data: Object.values(byDate),
                    borderWidth: 2
                }]
            }
        }
    );

    // -------- バス停別 --------
    const byStop = {};
    data.forEach(d => {
        byStop[d.stop] = (byStop[d.stop] || 0) + d.count;
    });

    chartStops = new Chart(
        document.getElementById("chartStops").getContext("2d"),
        {
            type: "bar",
            data: {
                labels: Object.keys(byStop),
                datasets: [{
                    label: "バス停別利用者数",
                    data: Object.values(byStop)
                }]
            }
        }
    );

    // -------- バス別 --------
    const byBus = {};
    data.forEach(d => {
        byBus[d.bus_id] = (byBus[d.bus_id] || 0) + d.count;
    });

    chartBuses = new Chart(
        document.getElementById("chartBuses").getContext("2d"),
        {
            type: "pie",
            data: {
                labels: Object.keys(byBus),
                datasets: [{
                    data: Object.values(byBus)
                }]
            }
        }
    );
}