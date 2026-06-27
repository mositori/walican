# walican

2人だけの割り勘・貸し借り管理アプリ。スマホ向けPWAで、誰がいくら立て替えたかを
記録し、月単位・週単位で貸し借りを集計します。

## 主な機能

- 支払い記録（支払者・金額・用途・日付）
- グループ（例: 旅行ごと）で割り勘をまとめ、一覧で絞り込み（紐付けなしも可）
- 按分の設定（デフォルト 50:50、1件ごとに変更可）
- 1円未満は floor（切り捨て）で按分
- 貸し借りの累計表示（どちらがどちらに、いくら）
- 月単位・週単位での集計・閲覧
- 初回のみパスワードで閲覧制限
- PWA（ホーム画面に追加・オフライン動作）
- Firebase Firestore で2端末リアルタイム同期（未設定時はローカル保存）

## 技術スタック

- React 19 + TypeScript + Vite
- React Router v7（`createHashRouter`／SPA）
- Tailwind CSS v4
- Framer Motion（アニメーション）
- vite-plugin-pwa（manifest + Service Worker）
- Firebase Firestore（任意・同期用）
- パッケージマネージャ: pnpm

## ローカル開発

```bash
pnpm install
pnpm dev
```

ブラウザをモバイル幅にして確認してください。パスワードは **0510** です。

```bash
pnpm build      # 本番ビルド（dist/）
pnpm preview    # ビルド結果をプレビュー
pnpm typecheck  # 型チェックのみ
```

## データ保存モード

`.env` に Firebase の設定が無い場合は、自動的に **ローカル保存モード**
（ブラウザの localStorage）で動作します。この場合データは端末内のみで、
2人の端末間では同期されません。1台を共有して使うならこのままで問題ありません。

2人がそれぞれの端末で同じ残高を見たい場合は、以下で Firebase を設定します。

## Firebase（リアルタイム同期）のセットアップ

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成。
2. **Firestore Database** を作成（本番モード or テストモード）。
3. プロジェクト設定 → 「アプリを追加」→ Web アプリを登録し、表示される
   `firebaseConfig` の値を控える。
4. `.env.example` を `.env` にコピーし、値を貼り付ける。

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

5. `pnpm dev` で起動し、設定画面に「クラウド同期（Firestore）」と表示されれば成功。

### Firestore セキュリティルールについて

このアプリはアカウント認証を行わない単一台帳構成のため、ルールは緩くなります
（パスワードはクライアント側のみの簡易ゲートで、暗号学的な機密性は担保しません）。
最低限、テスト用の全開放ルールではなく、コレクションを限定する例を示します。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{doc} {
      allow read, write: if true;
    }
    match /settings/{doc} {
      allow read, write: if true;
    }
  }
}
```

> 本番運用では Anonymous Auth を有効化し、`if request.auth != null` などへ
> ルールを強化することを推奨します。

## GitHub Pages へのデプロイ

このリポジトリには `.github/workflows/deploy.yml` が含まれており、`main`
（および開発ブランチ）への push で自動ビルド・デプロイします。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を
   **GitHub Actions** に設定。
2. （同期を使う場合）**Settings → Secrets and variables → Actions** に
   `VITE_FIREBASE_*` をシークレットとして登録。
3. push するとデプロイされ、`https://<ユーザー名>.github.io/walican/` で公開されます。

> 公開パスが `walican` 以外になる場合は `vite.config.ts` の `BASE` を変更してください。
> ルーティングは HashRouter（`/#/...`）のため、リロードしても 404 になりません。
