// 初回のみパスワードで閲覧を制限する簡易ゲート。
//
// 注意: GitHub Pages は静的配信のため、これは「本人以外がうっかり開けない」
// 程度の保護です。ハッシュを照合していても JS は公開されるため、暗号学的な
// 機密性は担保されません（要件で許容済み）。

// SHA-256('0510') をハードコード。
const PASSWORD_HASH =
  '72f93cdffdd25a0cc5ed855d2388671b7e715ca09a8c844a90cb3e4e7398fc45';

const AUTH_KEY = 'walican.authed';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 入力パスワードが正しければ true を返し、認証フラグを保存する。 */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await sha256Hex(password.trim());
  const ok = hash === PASSWORD_HASH;
  if (ok) localStorage.setItem(AUTH_KEY, '1');
  return ok;
}

/** 既に認証済みか（初回のみ要求するため） */
export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1';
}

/** 認証フラグを消す（ログアウト） */
export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
