// =====================
// map_common.js（共通）
// =====================

let map;
let stops = [];

// ----------------------------------------
// 地図初期化（共通）
// ----------------------------------------
window.initMap = async function() {
  const defaultLocation = { lat: 35.9946, lng: 138.1543 }; // 茅野駅

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 14,
    center: defaultLocation
  });

  // バス停リスト取得
  const response = await fetch("/get_stops");
  stops = await response.json();

  // バス停を地図に表示
  stops.forEach(stop => {
    new google.maps.Marker({
      position: { lat: stop.lat, lng: stop.lng },
      map,
      title: stop.name,
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    });
  });

  // 現在地マーカー（オプション）
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      new google.maps.Marker({
        position: userLocation,
        map,
        title: "現在地",
        icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
      });

      map.setCenter(userLocation);
    });
  }

  // バス停通過ログ取得・表示
  fetchBusPassLog();
};

// ----------------------------------------
// バス停通過ログを取得して表示
// ----------------------------------------
async function fetchBusPassLog() {
  const logContainer = document.getElementById("busPassLog");
  if (!logContainer) return;

  const res = await fetch("/get_bus_pass_log");
  const logs = await res.json(); // [{stop: "バス停名", timestamp: "..."}]

  logContainer.innerHTML = ""; // 既存内容クリア
  logs.forEach(log => {
    const li = document.createElement("li");
    li.textContent = `${log.stop} - ${new Date(log.timestamp._seconds*1000).toLocaleString()}`;
    logContainer.appendChild(li);
  });
}

// 地図初期化の最後で追跡機能も初期化
if (window.initBusTrackingControls) {
    window.initBusTrackingControls();
}