import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Shield,
  HardHat,
  Building2,
  Save,
  Loader2
} from 'lucide-react'

const ROLE_CONFIG = {
  admin: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Administrateur' },
  employer: { icon: HardHat, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Employeur' },
  client: { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Client' }
}

export default function Profile() {
  const { user, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  })

  const config = ROLE_CONFIG[user?.role]
  const RoleIcon = config?.icon

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const success = await updateProfile(formData)
    setIsLoading(false)

    if (success) {
      toast.success('Profil mis à jour!')
      setIsEditing(false)
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-ARMA-blue/20 to-ARMA-light/10 border border-ARMA-blue/30 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-white">👤 Mon Profil</h1>
        <p className="text-slate-400 mt-2">Gérer vos informations personnelles</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        {/* Avatar & Role */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-20 h-20 rounded-2xl ${config?.bg} flex items-center justify-center`}>
            {RoleIcon && <RoleIcon className={`w-10 h-10 ${config?.color}`} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.full_name || user?.email}</h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config?.bg} ${config?.color} mt-1`}>
              {RoleIcon && <RoleIcon className="w-4 h-4" />}
              {config?.label}
            </span>
          </div>
        </div>

        {/* Info */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-ARMA-blue/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ARMA-gray" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-gradient-to-r from-ARMA-blue to-[#1d4ed8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-ARMA-blue/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Sauvegarder
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-slate-500 mb-1">Email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-slate-500 mb-1">Nom complet</p>
              <p className="text-white font-medium">{user?.full_name || 'Non défini'}</p>
            </div>

            {user?.role === 'employer' && (
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-slate-500 mb-1">Stations assignées</p>
                <p className="text-white font-medium">
                  {Array.isArray(user?.assigned_stations) 
                    ? user.assigned_stations.join(', ') 
                    : user?.assigned_stations || 'Toutes'}
                </p>
              </div>
            )}

            {user?.role === 'client' && (
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-slate-500 mb-1">Code station</p>
                <p className="text-white font-medium">{user?.client_code || 'Non défini'}</p>
              </div>
            )}

            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              ✏️ Modifier le profil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
