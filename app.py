from flask import Flask, render_template, jsonify, request
from ic_reader import read_card_uid     # UID読み取り関数のインポート
# firebase関連のインポート
import firebase_admin
from firebase_admin import credentials, firestore

from dotenv import load_dotenv
import os

load_dotenv()           # .envの読み込み
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

app = Flask(__name__)

# Firebase接続（アプリ起動時一度のみ）
cred = credentials.Certificate("C:\\Users\\pcwvs\\firebase_keys\\bus-app-service-key.json")    # 秘密鍵ファイルによる認証
firebase_admin.initialize_app(cred)                         # 初期設定
db = firestore.client()                                     # クライアントインスタンスの作成

# 現在の区間をグローバル変数として保持
current_section = 0

# 乗降記録をDBに保存する関数
def save_usage(uid: str, status: str):
    if not uid:
        return False

    # 保存内容
    record = {
        "uid"      : uid,                                 # ICカードUID
        "status"   : status,                              # 乗降者情報
        "timestamp": firestore.SERVER_TIMESTAMP,          # タイムスタンプ
        "section"  : current_section                      # 現在のセクション
    }

    # コレクション"bus_usage"にrecordを保存
    db.collection("bus_usage").add(record)

    return True

# ルートページ
@app.route("/")
def index():
    return render_template("index.html")

# 地図表示ページ
@app.route("/map")
def map_view():
    return render_template("map.html", google_maps_key=GOOGLE_MAPS_API_KEY)

# バス停情報の参照
@app.route("/get_stops")
def get_stops():
    # bus_stopsコレクション内の情報取得
    stops_ref = db.collection("bus_stops").stream()
    # データ格納用の配列用意
    stops = []

    for doc in stops_ref:
        data = doc.to_dict()        # Python用の辞書型変換
        stops.append({
            "name": data.get("name"),
            "lat" : data.get("lat"),
            "lng" : data.get("lng")
        })
    return jsonify(stops)

# ICカードスキャンページ
@app.route("/uid")
def show_uid():
    return render_template("uid.html")

# ICカードのUID取得,保存
@app.route("/get_uid", methods=["POST"])
def get_uid():
    data = request.get_json()               # uid.htmlからの情報取得
    status = data.get("status", "乗車")     # 乗車情報を取得（デフォルト乗車）
    uid = read_card_uid()

    if uid:     # UID保存
        save_usage(uid, status)
    return jsonify({"uid": uid, "status": status})      # JSON形式のHTTPレスポンス送信
    
@app.route("/next_section", methods=["POST"])
def next_section():
    global current_section      # グローバル変数を変更するため定義

    # 現在の区間の乗車数を集計
    docs = list(db.collection("bus_usage").where("section", "==", current_section).stream())
    geton = sum(1 for doc in docs if doc.to_dict().get("status") == "乗車")
    docs = list(db.collection("bus_usage").where("section", "==", current_section).stream())
    getoff = sum(1 for doc in docs if doc.to_dict().get("status") == "降車")

    # 集計結果をsectionコレクションに保存
    db.collection("section").document(str(current_section)).set({
        "geton"    : geton,                             # 乗車人数
        "getoff"   : getoff,                            # 降車人数
        "timestamp": firestore.SERVER_TIMESTAMP         # タイムスタンプ
    })

    #次の区間に進む
    current_section += 1

    return jsonify({
        "message": f"区間 {current_section} の乗車 {geton} 名, 降車 {getoff} 名を記録しました。",
        "next_section": current_section+1
    })

# 通過したバス停を保存
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)