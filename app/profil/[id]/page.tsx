'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [userAnnonces, setUserAnnonces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!profileId) return
      setLoading(true)

      // 1. Récupérer le profil public
      const { data: profileData } = await supabase
        .from('profiles')
        .select('pseudo, bio, avatar_url')
        .eq('id', profileId)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // 2. Récupérer les annonces de ce membre (en excluant les annonces en attente)
      const { data: annoncesData } = await supabase
        .from('annonces')
        .select('*')
        .eq('user_id', profileId)
        .neq('status', 'en attente')
        .order('created_at', { ascending: false })

      if (annoncesData) {
        setUserAnnonces(annoncesData)
      }

      setLoading(false)
    }

    loadData()
  }, [profileId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>
        Chargement du profil...
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h2>Profil introuvable</h2>
        <button onClick={() => router.push('/')} style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
          ← Retour à l'accueil
        </button>
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
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>Profil membre</p>
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

      {/* FICHE MEMBRE */}
      <main style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8', display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '36px' }}>👤</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#2c3e50' }}>{profile.pseudo || 'Membre TrocTruc'}</h2>
            {profile.bio ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{profile.bio}</p>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Aucune description renseignée.</p>
            )}
          </div>
        </div>

        {/* ANNONCES PUBLIÉES PAR LE MEMBRE */}
        <h3 style={{ marginTop: '40px', marginBottom: '20px', fontSize: '18px', color: '#2c3e50' }}>
          Annonces de {profile.pseudo || 'ce membre'} ({userAnnonces.length})
        </h3>

        {userAnnonces.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '14px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', textAlign: 'center' }}>
            Aucune annonce en ligne actuellement.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {userAnnonces.map((item) => {
              let imageUrl = null
              if (item.photos && item.photos.length > 0) imageUrl = item.photos[0]
              else if (item.image_url) imageUrl = item.image_url.split(',')[0]

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/annonces/${item.id}`)}
                  style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ height: '140px', backgroundColor: '#e2e8f0', position: 'relative' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#95a5a6', fontSize: '12px' }}>Aucune photo</div>
                    )}
                    <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {item.categorie}
                    </span>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titre}
                    </h4>
                    {item.prix && (
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#27ae60' }}>
                        {item.prix} €
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

    </div>
  )
}