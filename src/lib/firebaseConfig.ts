// Firebase の接続設定（firebase SDK を import しない軽量モジュール）。
// isFirebaseConfigured はバンドル分割の判定に使うため、ここに firebase の
// import を持ち込まないこと（持ち込むと初期バンドルに SDK が載ってしまう）。
//
// 設定値は VITE_FIREBASE_* があればそれを優先し、無ければ既定値を使う。
// Firebase の web 設定（apiKey 等）は公開前提の識別子であり秘密情報ではない
// （アクセス制御は Firestore のセキュリティルールで行う）。

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBUiaFIDhYrnmszFrr7l8Ju4UiGqMownc8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'walican-9285a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'walican-9285a',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'walican-9285a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1050471624469',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    '1:1050471624469:web:bc25af3d94ef096c53431c',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);
