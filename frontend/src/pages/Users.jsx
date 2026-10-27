import { useState } from 'react'
import { useQueryClient, useQuery, useMutation } from 'react-query'
import { Shield, HardHat, Building2 } from 'lucide-react'
import { api } from '../stores/authStore'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  ChevronDown
} from  'lucide-react'
  

const ROLE_CONFIG = {
    admin: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Admin' },
    employer: { icon: HardHat, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Employer' },
    client: { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Client' }
}

export default function UsersPage() {
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: ''
    })

    // --- استدعاء المستخدمين من API (عدّله حسب مشروعك الحقيقي) ---
    const { data: users = [], isLoading } = useQuery(
    ['users'],
    () => api.get('/users').then(res => res.data),
    {
        onError: (err) => console.error('Error fetching users:', err)
    }
)
    // يمكنك أيضاً استخدام useMutation لعمليات الحذف/التعديل
        if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ARMA-blue" />
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Gestion des utilisateurs</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    + Nouvel utilisateur
                </button>
            </div>

            {/* يمكنك إضافة شريط البحث هنا */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-700"
                />
            </div>

            {/* جدول عرض المستخدمين */}
            <table className="w-full text-left text-gray-300">
                <thead>
                    <tr className="border-b border-gray-700">
                       <th className="py-2 px-4">Nom complet</th>
                        <th className="py-2 px-4">Email</th>
                        <th className="py-2 px-4">Rôle</th>
                        <th className="py-2 px-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-2 px-4">{user.full_name}</td>
                            <td className="py-2 px-4">{user.email}</td>
                            <td className="py-2 px-4">
                                {user.role && (
                                    <span className={`px-2 py-1 rounded-full text-xs ${ROLE_CONFIG[user.role]?.bg} ${ROLE_CONFIG[user.role]?.color}`}>
                                        {ROLE_CONFIG[user.role]?.label}
                                    </span>
                                )}
                            </td>
                            <td className="py-2 px-4">
                                <button
                                    onClick={() => {
                                        setEditingUser(user)
                                        setFormData({
                                            email: user.email,
                                            full_name: user.full_name,
                                            password: ''
                                        })
                                        setShowModal(true)
                                    }}
                                    className="text-blue-400 hover:underline mr-2"
                                >
                                    Modifier
                                </button>
                                <button className="text-red-400 hover:underline">Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* المودال ستضيفه لاحقاً أو هو موجود في الملف الأصلي */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md">
                        <h2 className="text-xl text-white mb-4">
                            {editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
                        </h2>
                        {/* حقول الإدخال الخاصة بـ formData */}
                        <button onClick={() => setShowModal(false)} className="mt-4 bg-gray-700 text-white px-4 py-2 rounded">
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}