import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Prompts from '../pages/Prompts';
import Settings from '../pages/Settings';
import Novels from '../pages/Novels';
import NovelEdit from '../pages/NovelEdit';
import ChapterEdit from '../pages/ChapterEdit';

// 路由配置
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'novels',
        element: <Novels />,
      },
      {
        path: 'novels/:id',
        element: <NovelEdit />,
      },
      {
        path: 'novels/:novelId/chapters/:chapterId',
        element: <ChapterEdit />,
      },
      {
        path: 'prompts',
        element: <Prompts />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
