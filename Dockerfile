# ベースイメージ
FROM python:3.12-slim

# 作業ディレクトリ
WORKDIR /app

# 依存関係コピー
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリのコピー
COPY . .

# ポート指定
ENV PORT 8080

# Flask 実行
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]