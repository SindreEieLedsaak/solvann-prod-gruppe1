import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { TurbinesPage } from '../features/turbines/TurbinesPage';
import { TurbineDetailPage } from '../features/turbines/TurbineDetailPage';
import { ReservoirPage } from '../features/reservoir/ReservoirPage';
import { MarketPage } from '../features/market/MarketPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'turbines', element: <TurbinesPage /> },
      { path: 'turbines/:id', element: <TurbineDetailPage /> },
      { path: 'reservoir', element: <ReservoirPage /> },
      { path: 'market', element: <MarketPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
