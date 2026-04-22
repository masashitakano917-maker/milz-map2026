# milz map app

Cloudflare Pages + R2 + Supabase で運用する前提に整理した Vite/React プロジェクトです

## 変更内容

- `src/App.tsx` の JSX 崩れを修正し、`vite build` が通る状態に修正
- Node/Express ベースの `server.ts` を廃止
- Cloudflare Pages Functions に `/api/storage/upload` と `/api/health` を追加
- Firebase 関連の未使用ファイルと依存関係を削除
- 依存関係を整理し、`npm install` / `npm run typecheck` / `npm run build` が通る状態に調整
- Gemini API キー参照を `VITE_GEMINI_API_KEY` に統一

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Cloudflare Pages 設定

Build command:

```bash
npm run build
```

Build output directory:

```bash
dist
```

## Cloudflare 環境変数

Pages の Variables and Secrets に以下を設定してください。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_ADMIN_EMAIL`
- `R2_PUBLIC_DOMAIN`（任意。公開ドメインがある場合）

## R2 バインディング

Cloudflare Pages の Settings > Functions > R2 bindings で、以下の binding を追加してください。

- Binding name: `R2_BUCKET`
- Bucket: 使用する R2 バケット

## API エンドポイント

- `POST /api/storage/upload`
  - multipart/form-data で `file` を送ると R2 に保存し、`publicUrl` を返します。
- `GET /api/health`
  - Functions と R2 binding の簡易確認用です。

## GitHub にアップする前の確認

```bash
npm install
npm run typecheck
npm run build
```

## 補足

現在の AI 機能は `VITE_GEMINI_API_KEY` をフロントに埋め込む構成です。運用上は、将来的に Gemini 呼び出しも Cloudflare Functions 経由に移す方が安全です。
