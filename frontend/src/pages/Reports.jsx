import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { api } from '../stores/authStore'
import { useAuthStore } from '../stores/authStore'
import {
  Search,
  Filter,
  Download,
  Eye,
  MapPin,
  Calendar,
  User,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

export default function Reports() {
  const { user } = useAuthStore()
  const [filters, setFilters] = useState({
    city: '',
    zone: '',
    agent: '',
    date_from: '',
    date_to: '',
    search: ''
  })
  const [page, setPage] = useState(0)
  const limit = 20

  // Build params, skip empty values
  const buildParams = () => {
    const params = {
      skip: page * limit,
      limit
    }
    if (filters.city) params.city = filters.city
    if (filters.zone) params.zone = filters.zone
    if (filters.agent) params.agent = filters.agent
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.search) params.search = filters.search
    return params
  }

  const { data, isLoading, isError, error } = useQuery(
    ['reports', filters, page],
    () => api.get('/reports', {
      params: buildParams()
    }).then(res => res.data),
    { 
      keepPreviousData: true,
      onError: (err) => console.error('Error loading reports:', err)
    }
  )

  // Handle both array response and {items, total} object
  const reports = Array.isArray(data) ? data : (data?.items || [])
  const totalCount = Array.isArray(data) ? data.length : (data?.total || 0)

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({ city: '', zone: '', agent: '', date_from: '', date_to: '', search: '' })
    setPage(0)
  }

  // Safe date formatter
  const formatDate = (dateString) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">📋 Rapports d'Interventions</h1>
            <p className="text-slate-400 mt-2">Consultez, filtrez et exportez les rapports</p>
          </div>
          {user?.role === 'employer' && (
            <Link
              to="/reports/new"
              className="px-6 py-3 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 transition-all flex items-center gap-2"
            >
              ➕ Nouveau
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ARMA-gray" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50 text-sm"
              />
            </div>
          </div>

          <select
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-ARMA-blue/50"
          >
            <option value="" className="bg-ARMA-dark">Toutes les villes</option>
            <option value="Casablanca" className="bg-ARMA-dark">Casablanca</option>
            <option value="Rabat" className="bg-ARMA-dark">Rabat</option>
            <option value="Marrakech" className="bg-ARMA-dark">Marrakech</option>
          </select>

          <select
            value={filters.zone}
            onChange={(e) => handleFilterChange('zone', e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-ARMA-blue/50"
          >
            <option value="" className="bg-ARMA-dark">Toutes les zones</option>
            <option value="Pompes" className="bg-ARMA-dark">Pompes</option>
            <option value="Boutique" className="bg-ARMA-dark">Boutique</option>
            <option value="Parking" className="bg-ARMA-dark">Parking</option>
            <option value="Toilettes" className="bg-ARMA-dark">Toilettes</option>
          </select>

          <button
            onClick={clearFilters}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div>
            <h3 className="text-red-400 font-bold">Erreur de chargement</h3>
            <p className="text-red-300/70 text-sm">{error?.message || 'Impossible de charger les rapports'}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ARMA-blue" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Filter className="w-12 h-12 mb-4" />
            <p>Aucun rapport trouvé</p>
            <p className="text-sm mt-1">Essayez de modifier les filtres</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Station</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Zone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Photos</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reports.map((report) => (
                    <tr key={report.id || report._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{report.station_code || report.station_name || '—'}</p>
                          <p className="text-sm text-slate-500">{report.station_city || report.city || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-ARMA-blue/20 text-ARMA-light">
                          {report.zone || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-300">{report.agent_name || report.created_by || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-300">
                            {formatDate(report.intervention_date || report.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(report.photo_before || report.photo_after || report.photos?.length > 0) ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-sm">
                              <ImageIcon className="w-4 h-4" />
                              {(report.photo_before && report.photo_after) ? '2 photos' : '1 photo'}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-sm">Aucune</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-ARMA-blue/20 text-slate-400 hover:text-ARMA-light transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <span className="text-sm text-slate-500">
                Page {page + 1} {totalCount > 0 && `(${totalCount} total)`}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={reports.length < limit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}