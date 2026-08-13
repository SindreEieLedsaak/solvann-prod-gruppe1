import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DamagochiPage } from '../features/damagochi/DamagochiPage';
import { TurbinesPage } from '../features/turbines/TurbinesPage';
import { TurbineDetailPage } from '../features/turbines/TurbineDetailPage';
import { RegistreringPage } from '../features/registrering/RegistreringPage';
import { TurbinvurderingPage } from '../features/turbinvurdering/TurbinvurderingPage';
import { PrisoptimeringPage } from '../features/prisoptimering/PrisoptimeringPage';
import { RapportPage } from '../features/rapport/RapportPage';
import { ReservoirPage } from '../features/reservoir/ReservoirPage';
import { MarketPage } from '../features/market/MarketPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [

      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'damagochi', element: <DamagochiPage /> },
      { path: 'turbines', element: <TurbinesPage /> },
      { path: 'turbines/:id', element: <TurbineDetailPage /> },
      { path: 'registrering', element: <RegistreringPage /> },
      { path: 'turbinvurdering', element: <TurbinvurderingPage /> },
      { path: 'prisoptimering', element: <PrisoptimeringPage /> },
      { path: 'rapport', element: <RapportPage /> },
      { path: 'reservoir', element: <ReservoirPage /> },
      { path: 'market', element: <MarketPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
