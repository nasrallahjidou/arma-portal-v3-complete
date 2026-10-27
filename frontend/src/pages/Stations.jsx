import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { api, useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  Building2
} from 'lucide-react'
export default function Stations() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingStation, setEditingStation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: '',
    address: '',
    zones: ''
  })

  // Fetch stations
  const { data: stations, isLoading } = useQuery(
    'stations-list',
    () => api.get('/stations?limit=1000').then(res => res.data)
  )

  // Create mutation
  const createMutation = useMutation(
    (data) => api.post('/stations', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stations-list')
        toast.success('Station créée avec succès!')
        setShowModal(false)
        resetForm()
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la création')
      }
    }
  )

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/stations/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stations-list')
        toast.success('Station modifiée avec succès!')
        setEditingStation(null)
        setShowModal(false)
        resetForm()
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la modification')
      }
    }
  )

  // Delete mutation
  const deleteMutation = useMutation(
    (id) => api.delete(`/stations/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stations-list')
        toast.success('Station supprimée!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
      }
    }
  )

  const resetForm = () => {
    setFormData({ code: '', name: '', city: '', address: '', zones: '' })
  }

  const handleEdit = (station) => {
    setEditingStation(station)
    setFormData({
      code: station.code,
      name: station.name,
      city: station.city,
      address: station.address || '',
      zones: Array.isArray(station.zones) ? station.zones.join(',') : station.zones || ''
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...formData,
      zones: formData.zones.split(',').map(s => s.trim()).filter(Boolean)
    }

    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // ⭐ فلترة حسب الدور (Role) + البحث
const filteredStations = stations?.filter(station => {
    // أولاً: فلترة حسب الصلاحيات
    let hasAccess = false
    
    if (user?.role === 'admin') {
        hasAccess = true  // الأدمن يشوف الكل
    } 
    else if (user?.role === 'employer') {
        // العامل يشوف المحطات المخصصة له فقط
        const assignedStations = user?.assigned_stations || []
        hasAccess = assignedStations.includes(station.name) || 
                    assignedStations.includes(station.code) ||
                    assignedStations.includes(String(station.id))
    } 
    else if (user?.role === 'client') {
        // العميل يشوف محطته فقط (حسب client_code)
        hasAccess = station.code === user?.client_code
    }
    
    // ثانياً: فلترة البحث (Search)
    const matchesSearch = 
        station.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.city.toLowerCase().includes(searchTerm.toLowerCase())
    
    return hasAccess && matchesSearch
}) || []

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">📍 Gestion des Stations</h1>
            <p className="text-slate-400 mt-2">Gérer les stations et leurs zones</p>
          </div>
          <button
            onClick={() => { setEditingStation(null); resetForm(); setShowModal(true); }}
            className="px-6 py-3 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
        <input
          type="text"
          placeholder="Rechercher une station..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
        />
      </div>

      {/* Stations Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ARMA-blue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations?.map((station) => (
            <div key={station.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-ARMA-blue/10">
                  <Building2 className="w-6 h-6 text-ARMA-light" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(station)}
                    className="p-2 rounded-lg hover:bg-ARMA-blue/20 text-slate-400 hover:text-ARMA-light transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cette station?')) {
                        deleteMutation.mutate(station.id)
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white">{station.name}</h3>
              <p className="text-ARMA-light font-mono text-sm mt-1">{station.code}</p>

              <div className="flex items-center gap-2 mt-3 text-slate-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{station.city}</span>
              </div>

              {station.address && (
                <p className="text-sm text-slate-500 mt-2">{station.address}</p>
              )}

              {station.zones && station.zones.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {station.zones.map(zone => (
                    <span key={zone} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-400">
                      {zone}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-ARMA-dark border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingStation ? '✏️ Modifier Station' : '➕ Nouvelle Station'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="AK1234"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Nom *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Station Name"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Ville *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Casablanca"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Rue Example"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Zones (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.zones}
                  onChange={(e) => setFormData(prev => ({ ...prev, zones: e.target.value }))}
                  placeholder="Pompes, Boutique, Parking, Toilettes"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createMutation.isLoading || updateMutation.isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {editingStation ? 'Sauvegarder' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
