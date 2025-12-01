from flask import Flask, render_template, jsonify, request
from ic_reader import read_card_uid  # UID読み取り関数
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Secret Managerから秘密鍵を取得
firebase_key_json = os.environ.get("FIREBASE_KEY")
firebase_key_dict = json.loads(firebase_key_json)

app = Flask(__name__)

# Firebase 接続
cred = credentials.Certificate(firebase_key_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()

# 現在の区間を保持
current_section = 0


# ------------------------------------------------------
# 乗降記録を Firestore に保存
# ------------------------------------------------------
def save_usage(uid: str, status: str):
    if not uid:
        return False

    record = {
        "uid": uid,
        "status": status,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "section": current_section
    }
    db.collection("bus_usage").add(record)
    return True


# ------------------------------------------------------
# ページルーティング
# ------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/user")
def user():
    return render_template("user.html", google_maps_key=GOOGLE_MAPS_API_KEY)


@app.route("/admin")
def admin():
    return render_template("admin.html", google_maps_key=GOOGLE_MAPS_API_KEY)


# 管理者：ICカード読み取りページ
@app.route("/admin/iccard")
def admin_iccard():
    return render_template("admin_iccard.html", section=current_section)


# ------------------------------------------------------
# Firestore からバス停を取得
# ------------------------------------------------------
@app.route("/get_stops")
def get_stops():
    stops_ref = db.collection("bus_stops").stream()
    stops = []

    for doc in stops_ref:
        data = doc.to_dict()
        stops.append({
            "name": data.get("name"),
            "lat": data.get("lat"),
            "lng": data.get("lng")
        })
    return jsonify(stops)


# ------------------------------------------------------
# 管理者：ICカードの UID 取得
# ------------------------------------------------------
@app.route("/get_uid", methods=["POST"])
def get_uid():
    data = request.get_json()
    status = data.get("status", "乗車")

    uid = read_card_uid()

    if uid:
        save_usage(uid, status)

    return jsonify({"uid": uid, "status": status})


# ------------------------------------------------------
# 区間切り替え（管理者）
# ------------------------------------------------------
@app.route("/next_section", methods=["POST"])
def next_section():
    global current_section

    # 現在の区間の乗車・降車数を集計
    docs = list(db.collection("bus_usage").where("section", "==", current_section).stream())
    geton = sum(1 for doc in docs if doc.to_dict().get("status") == "乗車")
    getoff = sum(1 for doc in docs if doc.to_dict().get("status") == "降車")

    # section コレクションに保存
    db.collection("section").document(str(current_section)).set({
        "geton": geton,
        "getoff": getoff,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

    # 区間を進める
    current_section += 1

    return jsonify({
        "message": f"区間 {current_section} の乗車 {geton} 名, 降車 {getoff} 名を記録しました。",
        "next_section": current_section + 1
    })


# ------------------------------------------------------
# バス停通過記録（GPS）
# ------------------------------------------------------
@app.route("/log_bus_pass", methods=["POST"])
def log_bus_pass():
    data = request.get_json()
    stop = data.get("stop")

    if stop:
        db.collection("bus_pass_log").add({
            "stop": stop,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "ok"})

    return jsonify({"status": "error"}), 400

# ------------------------------------------------------
# バスの現在位置をサーバーに送信
# ------------------------------------------------------
@app.route("/update_bus_location", methods=["POST"])
def update_bus_location():
    data   = request.get_json()
    bus_id = data.get("bus_id")
    lat    = data.get("lat")
    lng    = data.get("lng")

    if bus_id and lat is not None and lng is not None:
        # Firestoreに保存（またはサーバー側で保持）
        db.collection("bus_locations").document(str(bus_id)).set({
            "lat": lat,
            "lng": lng,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 400

# ------------------------------------------------------
# 現在の全バス位置を返す
# ------------------------------------------------------
@app.route("/get_all_bus_locations")
def get_all_bus_locations():
    docs = db.collection("bus_locations").stream()
    buses = {}
    for doc in docs:
        data = doc.to_dict()
        buses[doc.id] = {"lat": data.get("lat"), "lng": data.get("lng")}
    return jsonify(buses)

# ------------------------------------------------------
# バス停通過ログ取得
# ------------------------------------------------------
@app.route("/get_bus_pass_log")
def get_bus_pass_log():
    # Firestoreから最新50件を取得（timestamp降順）
    docs = db.collection("bus_pass_log").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(50).stream()
    
    logs = []
    for doc in docs:
        data = doc.to_dict()
        logs.append({
            "stop": data.get("stop"),
            "timestamp": data.get("timestamp")  # Firestore タイムスタンプ
        })

    # クライアントで表示しやすいよう降順を逆転（古い順）
    logs.reverse()

    return jsonify(logs)

# ------------------------------------------------------
# Flask 起動
# ------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
