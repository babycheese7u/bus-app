from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os
import json
import random

# .envを読み込む（ローカルのみ）
load_dotenv()

firebase_key_json = os.getenv("FIREBASE_KEY")
if not firebase_key_json:
    raise RuntimeError("FIREBASE_KEYが見つかりません")

firebase_key_dict = json.loads(firebase_key_json)

# Firebase 接続
cred = credentials.Certificate(firebase_key_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()

# -------------------------
# bus_usageを一度クリアする関数
# -------------------------
def clear_bus_usage_collection():
    docs = db.collection("bus_usage").stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"bus_usage コレクションを {count} 件削除しました")

clear_bus_usage_collection()


# -------------------------
# 設定値
# -------------------------
stops = [
    "飯島",
    "聖ヨゼフ保育園前",
    "沖田町",
    "アクアランド前",
    "上原",
    "横内下河原",
    "横内送水所",
    "茅野駅",
    "永明中学入口",
    "市役所入口",
    "本町5丁目",
    "本町2丁目",
    "粟沢橋",
    "中央保育園前",
    "鬼場",
    "福沢入口",
    "理科大入口",
    "理科大"
]

bus_ids = ["1", "2", "3"]

START_HOUR = 8
END_HOUR = 18
DAYS = 5

MAX_BOARD = 5    # 最大乗車人数
MAX_ALIGHT = 5  # 最大降車人数

base_date = datetime(2025, 2, 1, START_HOUR, 0)

# -------------------------
# データ生成
# -------------------------
docs = []

for day in range(DAYS):
    for hour in range(START_HOUR, END_HOUR):
        for bus_id in bus_ids:
            onboard = 0  # 現在の乗車人数

            for stop in stops:
                board = random.randint(0, MAX_BOARD)
                alight = random.randint(0, MAX_ALIGHT)

                # 降車人数は現在乗車人数を超えない
                alight = min(alight, onboard)

                onboard = onboard + board - alight

                docs.append({
                    "timestamp": base_date + timedelta(days=day, hours=hour),
                    "bus_id": bus_id,
                    "stop": stop,
                    "board": board,
                    "alight": alight
                })

# Firestoreに投入
for d in docs:
    db.collection("bus_usage").add(d)

print("サンプルデータ投入完了")