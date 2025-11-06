let map;                  
let watchID    = null;
let userPath   = [];
let polyline   = null;
let userMarker = null;

const NEAR_DISTANCE = 30;   // 接近半径(m)
const FAR_DISTANCE  = 80;   // 離脱半径(m)

let stops = [];             // Firestoreから取得するバス停リスト
let stopStates = {};        // 各バス停の接近状態{stop.name: true/false}

// 非同期関数
async function initMap() {
  const defaultLocation = {lat: 35.9946, lng: 138.1543};    // 茅野駅

  // 地図オブジェクトの初期化
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 14,
    center: defaultLocation
  });

  // バス停取得
  const response = await fetch("/get_stops");
  stops = await response.json();

  // 初期状態
  stops.forEach(stop => stopStates[stop.name] = false);

  // バス停マーカー
  stops.forEach(stop => {
    new google.maps.Marker({
      position: {lat: stop.lat, lng: stop.lng},
      map,
      title: stop.name,
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    });
  });

  // 青線（軌跡）
  polyline = new google.maps.Polyline({
    path: userPath,
    map: map,
    strokeColor: "#0000FF",
    strokeOpacity: 1.0,
    strokeWeight: 4
  });

  // 現在地マーカー初期表示
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
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
      }
    );
  }

  document.getElementById("startBtn").onclick = startTracking;
  document.getElementById("stopBtn").onclick  = stopTracking;
}

// 距離計算(Haversine)
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6378137;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// バス停通過ログをサーバーへ送信
async function logPass(stopName) {
  await fetch("/log_bus_pass", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ stop: stopName })
  });
  console.log("通過記録:", stopName);
}

// GPS追跡開始
function startTracking() {
  userPath = [];
  polyline.setPath(userPath);

  if (!navigator.geolocation) {
    alert("GPSが利用できません");
    return;
  }

  watchID = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latLng = new google.maps.LatLng(lat, lng);

      userPath.push(latLng);
      polyline.setPath(userPath);

      if (!userMarker) {
        userMarker = new google.maps.Marker({
          position: latLng,
          map,
          icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
        });
      } else {
        userMarker.setPosition(latLng);
      }

      map.setCenter(latLng);

      // バス停接近/離脱判定
      stops.forEach(stop => {
        const dist = getDistanceMeters(lat, lng, stop.lat, stop.lng);

        if (!stopStates[stop.name] && dist < NEAR_DISTANCE) {
          stopStates[stop.name] = true;  // 近づいた
          console.log(`接近: ${stop.name}`);
        }

        if (stopStates[stop.name] && dist > FAR_DISTANCE) {
          stopStates[stop.name] = false; // 離れた
          logPass(stop.name);
          console.log(`通過: ${stop.name}`);
        }
      });
    },
    (err) => console.error(err),
    { enableHighAccuracy: true }
  );

  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled  = false;
}

// GPS追跡停止
function stopTracking() {
  navigator.geolocation.clearWatch(watchID);
  watchID = null;

  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled  = true;
}

window.onload = initMap;