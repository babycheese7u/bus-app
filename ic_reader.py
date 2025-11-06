# ICカード関連のインポート
from smartcard.System import readers
from smartcard.util import toHexString

# PC/SC対応リーダーからUIDを取得する関数
def read_card_uid():
    try:
        r = readers()
        if len(r) == 0:
            return None
        reader_obj = r[0]                       # 最初に見つかったリーダーを使用
        conn = reader_obj.createConnection()    # コネクションの作成
        conn.connect()                          # 接続を実行

        # PC/SC共通のGET UIDコマンド
        GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
        data, sw1, sw2 = conn.transmit(GET_UID)     # UIDとステータスワードを取得

        if sw1 == 0x90 and sw2 == 0x00:
            uid = toHexString(data)                 # バイト列dataを16進数変換
            return uid
        else:
            return None
    except Exception:
        return None

if __name__ == "__main__":
    uid = read_card_uid()
    print("UID:", uid)