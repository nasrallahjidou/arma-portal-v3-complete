import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { api } from '../stores/authStore'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
  FileDown,
  Calendar,
  MapPin,
  Filter,
  Loader2,
  Check,
  AlertCircle,
  Eye
} from 'lucide-react'

export default function PDFGenerator() {
  const { user } = useAuthStore()
  const [params, setParams] = useState({
    station_id: '',
    station_code: '',
    date_from: '',
    date_to: '',
    zone: '',
    include_photos: true,
    language: 'fr'
  })
  const [preview, setPreview] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch stations for dropdown
  const { data: stations } = useQuery(
    'pdf-stations',
    () => api.get('/stations').then(res => res.data)
  )
  useEffect(() => {
  if (user?.role === 'client' && stations?.length > 0) {
    const clientStation = stations.find(s => s.code === user.client_code)
    if (clientStation) {
      setParams(prev => ({
        ...prev,
        station_id: clientStation.id,
        station_code: clientStation.code
      }))
    }
  }
}, [user, stations])

  // Preview data
  const { data: previewData, isLoading: previewLoading } = useQuery(
  ['pdf-preview', params],
  () => {
    const cleanParams = Object.fromEntries(
      Object.entries({
        station_id: params.station_id || null,
        station_code: params.station_code || null,
        date_from: params.date_from || null,
        date_to: params.date_to || null,
      }).filter(([_, v]) => v !== null)
    )
    return api.get('/pdf/preview', { params: cleanParams }).then(res => res.data)
  },
  { enabled: (!!params.station_id || !!params.station_code) && !!params.date_from }
)

  const handleGenerate = async () => {
  if (!params.station_id && !params.station_code) {
    toast.error('Veuillez sélectionner une station')
    return
  }

  const cleanParams = {
    ...params,
    date_from: params.date_from || null,
    date_to: params.date_to || null,
    zone: params.zone || null,
  }

  setIsGenerating(true)
  try {
    const cleanParams = {
  ...params,
  date_from: params.date_from || null,
  date_to: params.date_to || null,
  zone: params.zone || null,
}
const response = await api.post('/pdf/generate', cleanParams, {
      responseType: 'blob'
    })

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ARMA_Rapport_${params.station_code || 'Station'}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('✅ PDF généré avec succès!')
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white">📄 Générer un Rapport PDF</h1>
        <p className="text-slate-400 mt-2">Rapport professionnel par station et période</p>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
        <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Paramètres du Rapport
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Station Selection */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Station *</label>
            {user?.role === 'client' ? (
  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
    <span className="text-ARMA-light font-semibold">
      {stations?.find(s => s.code === user?.client_code)?.code} — {stations?.find(s => s.code === user?.client_code)?.name}
    </span>
    {/* نملأ params تلقائياً */}
    {(() => {
      const st = stations?.find(s => s.code === user?.client_code)
      if (st && params.station_id !== st.id) {
        setTimeout(() => setParams(prev => ({
          ...prev,
          station_id: st.id,
          station_code: st.code
        })), 0)
      }
      return null
    })()}
  </div>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <select
                  value={params.station_id}
                  onChange={(e) => {
                    const station = stations?.find(s => s.id === parseInt(e.target.value))
                    setParams(prev => ({
                      ...prev,
                      station_id: e.target.value,
                      station_code: station?.code || ''
                    }))
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50 appearance-none"
                >
                  <option value="" className="bg-ARMA-dark">Sélectionner une station</option>
                  {stations?.map(station => (
                    <option key={station.id} value={station.id} className="bg-ARMA-dark">
                      {station.code} — {station.city}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Date début</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <input
                  type="date"
                  value={params.date_from}
                  onChange={(e) => setParams(prev => ({ ...prev, date_from: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Date fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <input
                  type="date"
                  value={params.date_to}
                  onChange={(e) => setParams(prev => ({ ...prev, date_to: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50"
                />
              </div>
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Zone (optionnel)</label>
            <select
              value={params.zone}
              onChange={(e) => setParams(prev => ({ ...prev, zone: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50 appearance-none"
            >
              <option value="" className="bg-ARMA-dark">Toutes les zones</option>
              <option value="Pompes" className="bg-ARMA-dark">Pompes</option>
              <option value="Boutique" className="bg-ARMA-dark">Boutique</option>
              <option value="Parking" className="bg-ARMA-dark">Parking</option>
              <option value="Toilettes" className="bg-ARMA-dark">Toilettes</option>
            </select>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.include_photos}
                onChange={(e) => setParams(prev => ({ ...prev, include_photos: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-ARMA-blue focus:ring-ARMA-blue"
              />
              <span className="text-sm text-slate-300">Inclure les photos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewData && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-ARMA-light" />
            Aperçu — {previewData.total_interventions} intervention(s)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-ARMA-blue/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-ARMA-light">{previewData.total_interventions}</p>
              <p className="text-xs text-slate-400">Interventions</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{previewData.zones_count}</p>
              <p className="text-xs text-slate-400">Zones</p>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(previewData.zones || {}).map(([zone, items]) => (
              <div key={zone} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-white font-medium">{zone}</span>
                <span className="text-sm text-slate-400">{items.length} intervention(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
      onClick={handleGenerate}
      disabled={isGenerating || (!params.station_id && !params.station_code) || !params.date_from}
      className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Générer le PDF
          </>
        )}
      </button>
    </div>
  )
}
