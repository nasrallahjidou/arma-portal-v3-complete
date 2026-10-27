import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  FileDown,
  Users,
  MapPin,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  HardHat,
  Building2
} from 'lucide-react'

const roleConfig = {
  admin: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'ADMIN' },
  employer: { icon: HardHat, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'EMPLOYEUR' },
  client: { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'CLIENT' }
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de Bord', roles: ['admin', 'employer', 'client'] },
  { path: '/reports', icon: FileText, label: 'Rapports', roles: ['admin', 'employer', 'client'] },
  { path: '/reports/new', icon: PlusCircle, label: 'Nouvelle Intervention', roles: ['employer'] },
  { path: '/pdf', icon: FileDown, label: 'Générer PDF', roles: ['admin', 'client'] },
  { path: '/users', icon: Users, label: 'Utilisateurs', roles: ['admin'] },
  { path: '/stations', icon: MapPin, label: 'Stations', roles: ['admin'] },
]

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const role = user?.role || 'client'
  const config = roleConfig[role]
  const RoleIcon = config.icon

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item => item.roles.includes(role))

  return (
    <div className="min-h-screen bg-ARMA-dark flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#0d1426] to-[#0a0f1e]
        border-r border-ARMA-blue/20 transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-ARMA-blue/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ARMA-blue to-ARMA-light flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider">ARMA</h1>
              <p className="text-[10px] text-ARMA-gray uppercase tracking-[0.2em]">Environnement</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-ARMA-blue/5 border border-ARMA-blue/20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
              <RoleIcon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-6 space-y-1">
          <p className="px-3 text-[10px] text-ARMA-gray uppercase tracking-[0.2em] mb-3">
            Navigation
          </p>
          {filteredNav.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-ARMA-blue/20 text-ARMA-light' 
                    : 'text-slate-400 hover:bg-ARMA-blue/10 hover:text-slate-200'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ARMA-blue/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
          <p className="text-center text-[10px] text-slate-700 mt-3">
            v3.0 © 2025 ARMA 
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-4 p-4 border-b border-ARMA-blue/20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-ARMA-blue/10 text-ARMA-light"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-white">ARMA Portal</h1>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
