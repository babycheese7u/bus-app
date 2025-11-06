# ベースイメージ(slimは軽量化Ver.)
FROM python:3.9-slim

# コンテナにappディレクトリが作成され、作業ディレクトリとなる
WORKDIR /app

# pyscard をビルドするために必要なツールをインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    swig \
    pcscd \
    libpcsclite-dev \
    && rm -rf /var/lib/apt/lists/*

# テキストファイルをコンテナにコピー
COPY requirements.txt .
# テキストファイルの内容をインストール
RUN pip install -r requirements.txt

# カレントフォルダの中身をappフォルダにコピー
COPY . .

#Flaskを起動
CMD ["python", "app.py"]