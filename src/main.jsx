import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import './index.css'
import Root from './routes/root'
import DashboardPage from '../src/pages/DashboardPage'
import ProjectsPage from '../src/pages/ProjectsPage'
import AnalyticsPage from '../src/pages/AnalyticsPage'
import ReportsPage from '../src/pages/ReportsPage'
import SettingsPage from '../src/pages/SettingsPage'
import MapPage from '../src/pages/MapPage'




const routes = [
  {
    path: "/",
    element: <Root />,
/*     errorElement: <ErrorPage />, */
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "projects/",
        element: <ProjectsPage />,
      },
      {
        path: "analytics/",
        element: <AnalyticsPage />,
      },
      {
        path: "reports/",
        element: <ReportsPage />,
      },
      {
        path: "settings/",
        element: <SettingsPage />,
      },
      {
        path: "map/",
        element: <MapPage />,
      },
    ],
  },
];

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);

