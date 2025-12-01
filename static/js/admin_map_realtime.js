let map;
let buses = {}; // { busId: { marker, polyline, path, tracking, watchID } }
let stops = [];
let stopStates = {};
const NEAR_DISTANCE = 30;
const FAR_DISTANCE  = 80;

async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: 35.9946, lng: 138.1543 }
  });

  // バス停取得
  const res = await fetch("/get_stops");
  stops = await res.json();
  stops.forEach(stop => stopStates[stop.name] = false);

  stops.forEach(stop => {
    new google.maps.Marker({
      position: { lat: stop.lat, lng: stop.lng },
      map,
      title: stop.name,
      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    });
  });

  document.getElementById("startBusBtn").onclick = () => {
    const busId = document.getElementById("busIdInput").value;
    if (busId) startBusTracking(busId);
  };
  document.getElementById("stopBusBtn").onclick = () => {
    const busId = document.getElementById("busIdInput").value;
    if (busId) stopBusTracking(busId);
  };

  setInterval(fetchBusLocations, 3000); // 3秒ごと
}

function fetchBusLocations() {
  fetch("/get_all_bus_locations")
    .then(res => res.json())
    .then(data => {
      for (const busId in data) {
        const latLng = new google.maps.LatLng(data[busId].lat, data[busId].lng);

        if (!buses[busId]) {
          buses[busId] = {
            marker: new google.maps.Marker({
              position: latLng,
              map,
              title: `Bus ${busId}`,
              icon: { url: "http://maps.google.com/mapfiles/ms/icons/bus.png" }
            }),
            path: [latLng],
            polyline: new google.maps.Polyline({
              path: [latLng],
              map,
              strokeColor: "#FF0000",
              strokeWeight: 4
            }),
            tracking: false
          };
        } else {
          buses[busId].path.push(latLng);
          buses[busId].marker.setPosition(latLng);
          buses[busId].polyline.setPath(buses[busId].path);

          // バス停通過判定
          checkStops(busId, latLng);
        }
      }
    });
}

function startBusTracking(busId) {
  if (!navigator.geolocation) return alert("GPS非対応");
  if (!buses[busId]) buses[busId] = { path: [], marker: null, polyline: null, tracking: false };

  if (buses[busId].tracking) return alert("すでに追跡中です");
  buses[busId].tracking = true;

  buses[busId].watchID = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    fetch("/update_bus_location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bus_id: busId, lat, lng })
    });
  }, err => console.error(err), { enableHighAccuracy: true });
}

function stopBusTracking(busId) {
  if (!buses[busId] || !buses[busId].tracking) return alert("追跡していません");

  navigator.geolocation.clearWatch(buses[busId].watchID);
  buses[busId].tracking = false;
}

// ----------------------------------------
// バス停通過判定
// ----------------------------------------
function checkStops(busId, latLng) {
  stops.forEach(stop => {
    const dist = getDistanceMeters(latLng.lat(), latLng.lng(), stop.lat, stop.lng);

    if (!stopStates[stop.name] && dist < NEAR_DISTANCE) {
      stopStates[stop.name] = true;
      console.log(`${busId} 接近: ${stop.name}`);
    }

    if (stopStates[stop.name] && dist > FAR_DISTANCE) {
      stopStates[stop.name] = false;
      console.log(`${busId} 通過: ${stop.name}`);

      // Firestoreに記録
      fetch("/log_bus_pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop: stop.name })
      });
    }
  });
}

// 距離計算
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6378137;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

window.onload = initMap;