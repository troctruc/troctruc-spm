'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [pseudo, setPseudo] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('profiles')
        .select('pseudo, bio, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setPseudo(data.pseudo || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setErrorMsg('')
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      setUploading(true)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setAvatarUrl(publicUrlData.publicUrl)
      setMessage('Photo téléversée avec succès ! Cliquez sur "Enregistrer mon profil" pour valider.')
    } catch (err: any) {
      setErrorMsg("Erreur d'envoi : " + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setErrorMsg('')

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        pseudo: pseudo.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString()
      })

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Ce pseudo est déjà pris.')
      } else {
        setErrorMsg('Erreur : ' + error.message)
      }
    } else {
      setMessage('Profil mis à jour avec succès !')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Chargement de votre profil...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', paddingBottom: '60px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e1e4e8', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="Logo TrocTruc SPM" 
            style={{ width: '45px', height: '45px', objectFit: 'contain', borderRadius: '8px' }} 
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: 'bold' }}>TrocTruc SPM</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>Mon profil public</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}
        >
          ← Retour à l'accueil
        </button>
      </header>

      {/* FORMULAIRE */}
      <main style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8' }}>
          
          <h2 style={{ marginTop: 0, fontSize: '20px', color: '#2c3e50', marginBottom: '8px' }}>
            👤 Mon profil
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '25px' }}>
            Personnalisez la façon dont vous apparaissez sur vos annonces et trajets.
          </p>

          {message && (
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
              ✓ {message}
            </div>
          )}

          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Téléversement photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl('')} />
                ) : (
                  <span style={{ fontSize: '32px' }}>👤</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  Photo de profil (facultative)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ fontSize: '13px', color: '#475569' }}
                />
                {uploading && <p style={{ fontSize: '12px', color: '#2563eb', margin: '4px 0 0 0' }}>Envoi de l'image en cours...</p>}
              </div>
            </div>

            {/* Pseudo */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Pseudo public *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Maxime975"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Phrase de présentation */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                Phrase de description (facultatif)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Passionné de bricolage et de troc à Saint-Pierre !"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* E-mail */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                Adresse e-mail associée
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '14px', boxSizing: 'border-box', cursor: 'not-allowed' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving || uploading}
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '10px', opacity: saving || uploading ? 0.7 : 1 }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
            </button>

          </form>
        </div>
      </main>

    </div>
  )
}