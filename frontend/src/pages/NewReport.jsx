import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { api } from '../stores/authStore'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
  MapPin,
  Calendar,
  User,
  Brush,
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  ChevronDown,
  Video,
} from 'lucide-react'

const ZONES = [
  'Pompes',
  'Boutique',
  'Parking',
  'Toilettes',
  'Aire de lavage',
  'Cantine',
  'Bureau',
  'Espace vert',
  'Autre'
]

export default function NewReport() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    station_id: '',
    intervention_date: new Date().toISOString().split('T')[0],
    zone: '',
    custom_zone: '',
    agent_name: '',
    observations: '',
    photo_before: null,
    photo_after: null,
    photo_before_preview: null,
    photo_after_preview: null
  })

  // Camera states — keys are "before" and "after"
  const [cameraMode, setCameraMode] = useState({ before: false, after: false })

  const videoRefs = {
    before: useRef(null),
    after: useRef(null)
  }
  const canvasRefs = {
    before: useRef(null),
    after: useRef(null)
  }
  const streamRefs = {
    before: useRef(null),
    after: useRef(null)
  }

  // ─── Stations ────────────────────────────────────────────────────────────────
  const { data: allStations } = useQuery(
    'all-stations',
    () => api.get('/stations').then(res => res.data)
  )

  const stations = allStations?.filter(station => {
    if (user?.role === 'admin') return true
    if (user?.role === 'employer') {
      const assignedStations = user?.assigned_stations || []
      return assignedStations.includes(station.name) ||
        assignedStations.includes(station.code)
    }
    if (user?.role === 'client') {
      return station.code === user?.client_code
    }
    return false
  }) || []

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const uploadMutation = useMutation((file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/reports/upload-photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  })

  const createMutation = useMutation(
    (data) => api.post('/reports', data),
    {
      onSuccess: () => {
        toast.success('✅ Intervention enregistrée avec succès!')
        navigate('/reports')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement")
      }
    }
  )

  // ─── File upload ─────────────────────────────────────────────────────────────
  const handlePhotoChange = async (type, file) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setFormData(prev => ({ ...prev, [`${type}_preview`]: preview }))
    try {
      const response = await uploadMutation.mutateAsync(file)
      setFormData(prev => ({ ...prev, [type]: response.data.url }))
      toast.success('Photo téléchargée!')
    } catch {
      toast.error('Erreur lors du téléchargement de la photo')
    }
  }

  // ─── Camera helpers ───────────────────────────────────────────────────────────
  // key is always "before" or "after"
  const startCamera = useCallback(async (key) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRefs[key].current = stream

      // ✅ FIX 1: setCameraMode FIRST so the <video> element mounts in the DOM,
      //           then assign srcObject in a microtask/timeout once it exists.
      setCameraMode(prev => ({ ...prev, [key]: true }))

      setTimeout(() => {
        const video = videoRefs[key].current
        if (video) {
          video.srcObject = stream
          video.muted = true
          video.playsInline = true
          video.play().catch(err => console.error('Play error:', err))
        }
      }, 80)

    } catch (err) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Permission caméra refusée. Vérifiez les paramètres de votre navigateur.')
      } else if (err.name === 'NotFoundError') {
        toast.error('Aucune caméra détectée.')
      } else {
        toast.error('Caméra non disponible: ' + err.message)
      }
    }
  }, [])

  const stopCamera = useCallback((key) => {
    const stream = streamRefs[key].current
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      streamRefs[key].current = null
    }
    const video = videoRefs[key].current
    if (video) {
      video.srcObject = null
      video.onloadedmetadata = null
    }
    setCameraMode(prev => ({ ...prev, [key]: false }))
  }, [])

  const capturePhoto = useCallback((key, formKey) => {
    // ✅ FIX 2: key = "before"/"after" for refs; formKey = "photo_before"/"photo_after" for formData
    const video = videoRefs[key].current
    const canvas = canvasRefs[key].current

    if (!video || !canvas || video.readyState < 2) {
      toast.error('Caméra pas encore prête, attendez...')
      return
    }

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `camera_${formKey}_${Date.now()}.jpg`, { type: 'image/jpeg' })

      stopCamera(key)

      const preview = URL.createObjectURL(file)
      setFormData(prev => ({ ...prev, [`${formKey}_preview`]: preview }))

      try {
        const response = await uploadMutation.mutateAsync(file)
        setFormData(prev => ({ ...prev, [formKey]: response.data.url }))
        toast.success('Photo capturée!')
      } catch {
        toast.error('Erreur upload photo')
      }
    }, 'image/jpeg', 0.92)
  }, [stopCamera, uploadMutation])

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.station_id || !formData.agent_name || !formData.zone) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const zone = formData.zone === 'Autre' ? formData.custom_zone : formData.zone

    createMutation.mutate({
      station_id: parseInt(formData.station_id),
      intervention_date: formData.intervention_date + 'T00:00:00',
      zone,
      agent_name: formData.agent_name,
      observations: formData.observations,
      photo_before: formData.photo_before,
      photo_after: formData.photo_after
    })
  }

  // ─── PhotoUploader sub-component ─────────────────────────────────────────────
  // type  = "photo_before" | "photo_after"  (used for formData keys)
  // key   = "before"       | "after"        (used for refs & cameraMode)
  const PhotoUploader = ({ type, label }) => {
    const key = type === 'photo_before' ? 'before' : 'after'
    const preview = formData[`${type}_preview`]
    const isCamera = cameraMode[key]

    return (
      <div>
        <label className="block text-sm text-slate-300 mb-2">{label}</label>

        {preview ? (
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={preview}
              alt={label}
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({
                ...prev,
                [type]: null,
                [`${type}_preview`]: null
              }))}
              className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-lg text-white hover:bg-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        ) : isCamera ? (
          <div className="relative bg-black rounded-xl overflow-hidden border border-white/20">
            {/* ✅ ref uses key ("before"/"after"), not type */}
            <video
              ref={videoRefs[key]}
              autoPlay
              playsInline
              muted
              className="w-full h-48 object-cover"
            />
            <canvas
              ref={canvasRefs[key]}
              className="hidden"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => capturePhoto(key, type)}
                className="w-14 h-14 rounded-full bg-red-500 border-4 border-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <button
                type="button"
                onClick={() => stopCamera(key)}
                className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white text-sm hover:bg-white/30 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>

        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-ARMA-blue/50 bg-white/5 cursor-pointer transition-all hover:bg-white/10">
              <Upload className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-500">Fichier</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(type, e.target.files[0])}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => startCamera(key)}
              className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-ARMA-blue/50 bg-white/5 cursor-pointer transition-all hover:bg-white/10"
            >
              <Video className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-500">Caméra</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white">➕ Nouvelle Intervention</h1>
        <p className="text-slate-400 mt-2">Saisir un rapport de nettoyage</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Station Info */}
        <div className="bg-white/5 border border-ARMA-blue/20 rounded-2xl p-6">
          <h3 className="text-ARMA-light font-bold text-sm uppercase tracking-wider mb-4">
            📍 Informations de la Station
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Station *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <select
                  value={formData.station_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, station_id: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50 appearance-none"
                  required
                >
                  <option value="" className="bg-ARMA-dark">Sélectionner une station</option>
                  {stations?.map(station => (
                    <option key={station.id} value={station.id} className="bg-ARMA-dark">
                      {station.code} — {station.name} ({station.city})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Date d'intervention *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <input
                  type="date"
                  value={formData.intervention_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, intervention_date: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="bg-white/5 border border-ARMA-blue/20 rounded-2xl p-6">
          <h3 className="text-ARMA-light font-bold text-sm uppercase tracking-wider mb-4">
            👷 Informations de l'Agent
          </h3>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Nom de l'agent *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
              <input
                type="text"
                value={formData.agent_name}
                onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                placeholder="Prénom Nom"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                required
              />
            </div>
          </div>
        </div>

        {/* Zone & Photos */}
        <div className="bg-white/5 border border-ARMA-blue/20 rounded-2xl p-6">
          <h3 className="text-ARMA-light font-bold text-sm uppercase tracking-wider mb-4">
            🧹 Zone & Photos
          </h3>

          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2">Zone de nettoyage *</label>
            <div className="relative">
              <Brush className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
              <select
                value={formData.zone}
                onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50 appearance-none"
                required
              >
                <option value="" className="bg-ARMA-dark">Sélectionner une zone</option>
                {ZONES.map(zone => (
                  <option key={zone} value={zone} className="bg-ARMA-dark">{zone}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray pointer-events-none" />
            </div>
          </div>

          {formData.zone === 'Autre' && (
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Préciser la zone *</label>
              <input
                type="text"
                value={formData.custom_zone}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_zone: e.target.value }))}
                placeholder="Nom de la zone"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <PhotoUploader type="photo_before" label="📸 Photo AVANT" />
            <PhotoUploader type="photo_after" label="📸 Photo APRÈS" />
          </div>
        </div>

        {/* Observations */}
        <div className="bg-white/5 border border-ARMA-blue/20 rounded-2xl p-6">
          <h3 className="text-ARMA-light font-bold text-sm uppercase tracking-wider mb-4">
            💬 Observations
          </h3>
          <textarea
            value={formData.observations}
            onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            placeholder="Travaux effectués, anomalies observées..."
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-ARMA-blue/50 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isLoading || uploadMutation.isLoading}
          className="w-full py-4 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {createMutation.isLoading || uploadMutation.isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Confirmer et Enregistrer
            </>
          )}
        </button>

      </form>
    </div>
  )
}