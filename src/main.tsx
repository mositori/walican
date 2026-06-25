import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { DataProvider } from './context/DataContext';
import { AppLayout } from './routes/AppLayout';
import { RequireAuth } from './routes/RequireAuth';
import { Login } from './routes/Login';
import { Dashboard } from './routes/Dashboard';
import { History } from './routes/History';
import { AddExpense } from './routes/AddExpense';
import { Settings } from './routes/Settings';

// HashRouter（createHashRouter）で GitHub Pages のサブパス配信に対応。
const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'history', element: <History /> },
          { path: 'add', element: <AddExpense /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  </StrictMode>,
);
