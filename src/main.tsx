import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './session'
import { Layout } from './components'
import { Auth, Detail, Library } from './pages'
import { UploadPage } from './upload'
import { NotificationProvider } from './notifications'
import { CategoryProvider } from './categories'
import './styles.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <SessionProvider>
          <CategoryProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Library />} />
                <Route path="me/charts" element={<Library mine />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="charts/:id" element={<Detail />} />
                <Route path="login" element={<Auth key="login" />} />
                <Route path="register" element={<Auth key="register" register />} />
                <Route
                  path="*"
                  element={
                    <div className="empty">
                      <h1>页面不存在</h1>
                      <Link to="/">返回发现</Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </CategoryProvider>
        </SessionProvider>
      </NotificationProvider>
    </BrowserRouter>
  </StrictMode>,
)
