import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import './index.css'
import Root from './routes/root'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'




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

