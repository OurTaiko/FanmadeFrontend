import { StrictMode } from 'react'
import { IconContext } from '@phosphor-icons/react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './session'
import { Layout } from './components'
import { Auth, Detail, Library } from './pages'
import { UpdatePage, UploadPage } from './upload'
import { NotificationProvider } from './notifications'
import { CategoryProvider } from './categories'
import { ProfilePage } from './profile'
import './styles.css'
import { ThemeProvider } from './theme'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ weight: 'bold' }}>
      <ThemeProvider>
        <BrowserRouter>
          <NotificationProvider>
            <SessionProvider>
              <CategoryProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Library />} />
                    <Route path="me/profile" element={<ProfilePage />} />
                    <Route path="me/charts" element={<Library mine />} />
                    <Route path="upload" element={<UploadPage />} />
                    <Route path="charts/:id/update" element={<UpdatePage />} />
                    <Route path="charts/:id" element={<Detail />} />
                    <Route path="login" element={<Auth key="login" />} />
                    <Route path="register" element={<Auth key="register" register />} />
                    <Route
                      path="*"
                      element={
                        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center [&>p]:max-w-lg [&>p]:text-muted-foreground">
                          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            页面不存在
                          </h1>
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
      </ThemeProvider>
    </IconContext.Provider>
  </StrictMode>,
)
