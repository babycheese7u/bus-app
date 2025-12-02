import os

USE_CARD_READER = os.getenv("USE_CARD_READER", "true").lower() == "true"

def read_card_uid():
    """
    ICカードリーダーのUIDを取得する。
    Cloud Run上では常に無効化される。
    """
    if not USE_CARD_READER:
        print("[INFO] ICカード読み取りは無効化されています")
        return None

    try:
        from smartcard.System import readers
        r = readers()
        if len(r) == 0:
            print("[ERROR] カードリーダーが見つかりません")
            return None

        reader = r[0]
        connection = reader.createConnection()
        connection.connect()

        GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
        data, sw1, sw2 = connection.transmit(GET_UID)

        if sw1 == 0x90 and sw2 == 0x00:
            uid = "".join(format(x, "02X") for x in data)
            return uid
        else:
            print(f"[ERROR] カード読み取り失敗: {sw1:02X} {sw2:02X}")
            return None

    except Exception as e:
        print(f"[ERROR] ICカード読み取りエラー: {e}")
        return None