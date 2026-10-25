import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Spinner } from './components/States'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

// Public pages other than Home and admin pages are split into separate chunks.
const Explore = lazy(() => import('./pages/Explore'))
const Categories = lazy(() => import('./pages/Categories'))
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const About = lazy(() => import('./pages/About'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Changelog = lazy(() => import('./pages/Changelog'))
const Saved = lazy(() => import('./pages/Saved'))

const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProjects = lazy(() => import('./pages/admin/Projects'))
const AdminProjectForm = lazy(() => import('./pages/admin/ProjectForm'))
const AdminCategories = lazy(() => import('./pages/admin/Categories'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:slug" element={<CategoryDetail />} />
          <Route path="projects/:slug" element={<ProjectDetail />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="changelog" element={<Changelog />} />
          <Route path="saved" element={<Saved />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin/login" element={<AdminLogin />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="projects/new" element={<AdminProjectForm />} />
          <Route path="projects/:id/edit" element={<AdminProjectForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound backTo="/admin" backLabel="Dashboard" />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
