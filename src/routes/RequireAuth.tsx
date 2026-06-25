import { Navigate, Outlet } from 'react-router-dom';
import { isAuthed } from '../lib/auth';

/** 未認証なら /login へ。認証済みは初回以降そのまま通す。 */
export function RequireAuth() {
  if (!isAuthed()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
