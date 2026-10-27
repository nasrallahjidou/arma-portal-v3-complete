import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { api } from '../stores/authStore'
import {
  FileText, MapPin, Users, Brush, TrendingUp, Calendar,
  Download, Eye, Image as ImageIcon, ChevronRight, Clock,
  CheckCircle, Plus, Activity
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#3b82f6']

const KPICard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <TrendingUp className="w-5 h-5 text-slate-600 group-hover:text-ARMA-light transition-colors" />
    </div>
    <h3 className="text-3xl font-black text-white">{value}</h3>
    <p className="text-sm text-slate-400 mt-1">{title}</p>
    {subtitle && <p className="text-xs text-slate-600 mt-1 truncate">{subtitle}</p>}
  </div>
)

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
)

const Section = ({ children, className = '' }) => (
  <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
)

const SectionTitle = ({ icon: Icon, title }) => (
  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
    <Icon className="w-5 h-5 text-ARMA-light shrink-0" />
    {title}
  </h3>
)

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
    <p className="text-slate-400 font-medium">{title}</p>
    {subtitle && <p className="text-slate-600 text-sm mt-1">{subtitle}</p>}
  </div>
)

const ReportCard = ({ report, onView }) => {
  const [showPhotos, setShowPhotos] = useState(false)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-ARMA-blue/30 transition-all">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ARMA-blue/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-ARMA-light" />
          </div>
          <div>
            <p className="text-white font-medium">{report.zone}</p>
            <p className="text-sm text-slate-500">
              {new Date(report.intervention_date || report.created_at).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          report.status === 'completed' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {report.status === 'completed' ? 'Terminé' : 'En cours'}
        </span>
      </div>

      {/* Agent Info */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="w-4 h-4" />
          <span>{report.station_code || report.station_name}</span>
          <span className="mx-2">•</span>
          <span>Agent: {report.agent_name}</span>
        </div>
      </div>

      {/* Photos Toggle */}
      {(report.photo_before || report.photo_after) && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowPhotos(!showPhotos)}
            className="flex items-center gap-2 text-sm text-ARMA-light hover:text-white transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            {showPhotos ? 'Masquer les photos' : 'Voir les photos'}
            <ChevronRight className={`w-4 h-4 transition-transform ${showPhotos ? 'rotate-90' : ''}`} />
          </button>
        </div>
      )}

      {/* Photos */}
      {showPhotos && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          {report.photo_before && (
            <div>
              <p className="text-xs text-slate-500 mb-1">AVANT</p>
              <img 
                src={report.photo_before} 
                alt="Avant" 
                className="w-full h-32 object-cover rounded-xl"
              />
            </div>
          )}
          {report.photo_after && (
            <div>
              <p className="text-xs text-slate-500 mb-1">APRÈS</p>
              <img 
                src={report.photo_after} 
                alt="Après" 
                className="w-full h-32 object-cover rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onView(report)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-ARMA-blue/20 text-ARMA-light rounded-lg hover:bg-ARMA-blue/30 transition-all text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          Détails
        </button>
        {report.pdf_url && (
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            PDF
          </a>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const role = user?.role || 'client'

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => api.get('/dashboard/stats').then(res => res.data),
    { enabled: role !== 'client' }
  )

  // Fetch client reports (all reports for client's station)
  const { data: clientReports, isLoading: clientLoading } = useQuery(
    'client-reports',
    () => api.get('/reports', {
      params: { 
        search: user?.client_code,
        limit: 100 
      }
    }).then(res => res.data),
    { enabled: role === 'client' }
  )

  // Fetch employer's stations
  const { data: employerStations, isLoading: stationsLoading } = useQuery(
    'employer-stations',
    () => api.get('/stations').then(res => {
      const all = res.data
      const assigned = user?.assigned_stations || []
      return all.filter(s => assigned.includes(s.name) || assigned.includes(s.code))
    }),
    { enabled: role === 'employer' }
  )

  // Fetch employer's reports
  const { data: employerReports, isLoading: reportsLoading } = useQuery(
    'employer-reports',
    () => api.get('/reports', {
      params: { agent: user?.full_name, limit: 5 }
    }).then(res => res.data),
    { enabled: role === 'employer' }
  )

  // ==================== CLIENT DASHBOARD (NEW DESIGN!) ====================
  if (role === 'client') {
    const reports = Array.isArray(clientReports) ? clientReports : (clientReports?.items || [])
    
    // Stats for client
    const totalReports = reports.length
    const thisMonth = reports.filter(r => {
      const d = new Date(r.intervention_date || r.created_at)
      return d.getMonth() === new Date().getMonth()
    }).length
    const uniqueZones = [...new Set(reports.map(r => r.zone))].length
    const lastReport = reports[0]

    if (clientLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-3xl p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">🏢 Espace Client</h1>
              <p className="text-slate-400 mt-2">
                Station: <span className="text-emerald-400 font-semibold">{user?.client_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Actif</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Interventions"
            value={totalReports}
            icon={FileText}
            color="bg-blue-500"
            subtitle="Totales"
          />
          <KPICard
            title="Ce mois"
            value={thisMonth}
            icon={Calendar}
            color="bg-emerald-500"
            subtitle="Interventions"
          />
          <KPICard
            title="Zones"
            value={uniqueZones}
            icon={Brush}
            color="bg-amber-500"
            subtitle="Nettoyées"
          />
          <KPICard
            title="Dernière"
            value={lastReport ? new Date(lastReport.intervention_date || lastReport.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
            icon={Clock}
            color="bg-purple-500"
            subtitle="Intervention"
          />
        </div>

        {/* Last Intervention Highlight */}
        {lastReport && (
          <Section className="border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Dernière Intervention</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p className="text-white font-medium">
                  {new Date(lastReport.intervention_date || lastReport.created_at).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Zone</p>
                <p className="text-white font-medium">{lastReport.zone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Agent</p>
                <p className="text-white font-medium">{lastReport.agent_name}</p>
              </div>
            </div>
            {(lastReport.photo_before || lastReport.photo_after) && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {lastReport.photo_before && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">AVANT</p>
                    <img src={lastReport.photo_before} alt="Avant" className="w-full h-40 object-cover rounded-xl" />
                  </div>
                )}
                {lastReport.photo_after && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">APRÈS</p>
                    <img src={lastReport.photo_after} alt="Après" className="w-full h-40 object-cover rounded-xl" />
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* All Reports Timeline */}
        <Section>
          <SectionTitle icon={FileText} title="Historique des Interventions" />
          {reports.length === 0 ? (
            <EmptyState 
              icon={FileText} 
              title="Aucune intervention enregistrée"
              subtitle="Les rapports de votre station apparaîtront ici"
            />
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onView={(r) => console.log('View report:', r)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    )
  }

  // ==================== EMPLOYER DASHBOARD ====================
  if (role === 'employer') {
    const reports = Array.isArray(employerReports) ? employerReports : (employerReports?.items || [])

    const isEmployerLoading = stationsLoading || reportsLoading

    if (isEmployerLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-48" />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">👷 Mon Tableau de Bord</h1>
              <p className="text-slate-400 mt-2">
                Bienvenue, <span className="text-ARMA-light font-semibold">{user?.full_name}</span>
              </p>
            </div>
            <Link
              to="/reports/new"
              className="px-6 py-3 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouveau Rapport
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Mes Stations"
            value={employerStations?.length || 0}
            icon={MapPin}
            color="bg-blue-500"
            subtitle="Assignées"
          />
          <KPICard
            title="Mes Rapports"
            value={reports?.length || 0}
            icon={FileText}
            color="bg-emerald-500"
            subtitle="Total"
          />
          <KPICard
            title="Ce mois"
            value={reports?.filter(r => {
              const d = new Date(r.intervention_date || r.created_at)
              return d.getMonth() === new Date().getMonth()
            })?.length || 0}
            icon={Calendar}
            color="bg-amber-500"
            subtitle="Interventions"
          />
          <KPICard
            title="Zones"
            value={[...new Set(reports?.map(r => r.zone))]?.length || 0}
            icon={Brush}
            color="bg-purple-500"
            subtitle="Différentes"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Stations */}
          <Section>
            <SectionTitle icon={MapPin} title="Mes Stations" />
            {employerStations?.length === 0 ? (
              <EmptyState icon={MapPin} title="Aucune station assignée" />
            ) : (
              <div className="space-y-3">
                {employerStations?.map(station => (
                  <div key={station.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-ARMA-blue/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-ARMA-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{station.name}</p>
                      <p className="text-sm text-slate-500 truncate">{station.code} — {station.city}</p>
                    </div>
                    <Link
                      to="/reports/new"
                      className="p-2 rounded-lg bg-ARMA-blue/20 text-ARMA-light hover:bg-ARMA-blue/30 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Recent Reports */}
          <Section>
            <SectionTitle icon={FileText} title="Mes Dernières Interventions" />
            {reports?.length === 0 ? (
              <EmptyState 
                icon={FileText} 
                title="Aucun rapport enregistré"
                subtitle="Créez votre premier rapport"
              />
            ) : (
              <div className="space-y-3">
                {reports?.slice(0, 5).map(report => (
                  <div key={report.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      {report.photo_before || report.photo_after ? (
                        <ImageIcon className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{report.station_code || report.station_name}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {report.zone} — {new Date(report.intervention_date || report.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-ARMA-blue/20 text-ARMA-light shrink-0">
                      {report.zone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Quick Actions */}
        <Section>
          <SectionTitle icon={Activity} title="Actions Rapides" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAction to="/reports/new" icon={Plus} title="Nouveau Rapport" desc="Saisir une intervention" primary />
            <QuickAction to="/reports" icon={Eye} title="Voir Mes Rapports" desc="Historique complet" />
            <QuickAction to="/stations" icon={MapPin} title="Mes Stations" desc="Stations assignées" />
          </div>
        </Section>
      </div>
    )
  }

  // ==================== ADMIN DASHBOARD ====================
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white">🛡️ Tableau de Bord Admin</h1>
        <p className="text-slate-400 mt-2">Accès complet — toutes les stations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Rapports"
          value={stats?.total_reports || 0}
          icon={FileText}
          color="bg-blue-500"
        />
        <KPICard
          title="Stations"
          value={stats?.total_stations || 0}
          icon={MapPin}
          color="bg-emerald-500"
        />
        <KPICard
          title="Agents"
          value={stats?.total_agents || 0}
          icon={Users}
          color="bg-amber-500"
        />
        <KPICard
          title="Zones"
          value={stats?.total_zones || 0}
          icon={Brush}
          color="bg-purple-500"
        />
        <KPICard
          title="Ce mois"
          value={stats?.reports_this_month || 0}
          icon={Calendar}
          color="bg-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📈 Interventions par Ville</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.reports_by_city || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="city" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #2563eb', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🍩 Répartition par Zone</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats?.reports_by_zone || []}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}
                dataKey="count" nameKey="zone"
              >
                {(stats?.reports_by_zone || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #2563eb', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">📅 Évolution Mensuelle</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={stats?.monthly_trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #2563eb', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">🏆 Classement des Agents</h3>
        <div className="space-y-3">
          {(stats?.top_agents || []).map((agent, index) => (
            <div key={agent.agent} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : index === 1 ? 'bg-slate-400/20 text-slate-300' : index === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-white/10 text-slate-400'}`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{agent.agent}</p>
              </div>
              <div className="text-right">
                <p className="text-ARMA-light font-bold">{agent.interventions}</p>
                <p className="text-xs text-slate-500">interventions</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const QuickAction = ({ to, icon: Icon, title, desc, primary = false }) => (
  <Link
    to={to}
    className={`flex items-center gap-4 p-4 rounded-xl transition-all border ${
      primary 
        ? 'bg-ARMA-blue/10 hover:bg-ARMA-blue/20 border-ARMA-blue/20' 
        : 'bg-white/5 hover:bg-white/10 border-white/10'
    }`}
  >
    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
      primary ? 'bg-ARMA-blue/20' : 'bg-white/10'
    }`}>
      <Icon className={`w-6 h-6 ${primary ? 'text-ARMA-light' : 'text-slate-400'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-white font-medium truncate">{title}</p>
      <p className="text-sm text-slate-500 truncate">{desc}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-slate-600 ml-auto shrink-0" />
  </Link>
)