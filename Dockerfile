# ベースイメージ（Debian系 slim イメージ）
FROM python:3.12-slim

# システム依存パッケージのインストール
RUN apt-get update && \
    apt-get install -y build-essential libpcsclite-dev pcscd && \
    rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
WORKDIR /app

# 依存関係のコピーとインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリのコピー
COPY . .

# ポート指定
ENV PORT 8080
ENV USE_ICCARD false

# Flask 実行
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
