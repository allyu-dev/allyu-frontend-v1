import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { Roles } from './pages/Roles'
import { Test } from './pages/Test'
import { Result } from './pages/Result'
import { PlacementLayout } from './placement/PlacementProvider'

const brandAssets = import.meta.glob<string>('./assets/allyu-logo.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const brandLogo = Object.values(brandAssets)[0]

export function Application() {
  return (
    <div className="app-shell">
      <svg className="network-background" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="0.7">
          <path d="M0 140 130 205 54 365 196 470 80 650 212 825 0 940M130 205 300 110 366 290 196 470 0 490M54 365 366 290M80 650 270 670 196 470M212 825 270 670 390 890 570 1000" />
          <path d="m1440 60-180 115 110 160-200 140 180 170-125 180 215 145m-180-795-190-65-90 225 190 140-170 190 225 165-100 170m-115-750 280 20m-200 140-90 225m270-55-270 55" />
        </g>
        <g fill="currentColor">
          <circle cx="130" cy="205" r="2" /><circle cx="54" cy="365" r="2" />
          <circle cx="196" cy="470" r="2" /><circle cx="80" cy="650" r="2" />
          <circle cx="270" cy="670" r="2" /><circle cx="366" cy="290" r="2" />
          <circle cx="1260" cy="175" r="2" /><circle cx="1370" cy="335" r="2" />
          <circle cx="1170" cy="475" r="2" /><circle cx="1350" cy="645" r="2" />
          <circle cx="1080" cy="335" r="2" /><circle cx="1000" cy="665" r="2" />
        </g>
      </svg>
      <header className="site-header">
        <span className="brand">
          {brandLogo ? <img className="brand-logo" src={brandLogo} alt="Allyu" width={128} height={40} /> : 'Allyu'}
        </span>
        <nav aria-label="Navegacion principal">
          <NavLink to="/perfil">Perfil</NavLink>
          <NavLink to="/roles">Evaluacion</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<PlacementLayout />}>
            <Route path="/" element={<Navigate to="/perfil" replace />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/test" element={<Test />} />
            <Route path="/resultado" element={<Result />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer>Driven by Mindful Code</footer>
    </div>
  )
}