'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/components/ChatModal'

export default function AnnonceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [annonce, setAnnonce] = useState<any>(null)
  const [authorProfile, setAuthorProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (id) {
        const { data, error } = await supabase
          .from('annonces')
          .select('*')
          .eq('id', id)
          .single()

        if (!error && data) {
          setAnnonce(data)

          // Détecte le champ propriétaire de l'annonce (user_id, author_id, etc.)
          const sellerId = data.user_id || data.author_id || data.created_by

          if (sellerId) {
            const { data: pData } = await supabase
              .from('profiles')
              .select('id, pseudo, avatar_url, bio')
              .eq('id', sellerId)
              .maybeSingle()

            if (pData) {
              setAuthorProfile(pData)
            }
          }
        } else {
          console.error("Erreur chargement annonce:", error)
        }
      }
      setLoading(false)
    }

    init()
  }, [id])

  async function handleValidateAnnonce() {
    const { error } = await supabase
      .from('annonces')
      .update({ validated: true, status: 'validé' }) 
      .eq('id', id)

    if (error) {
      alert("Erreur lors de la validation : " + error.message)
    } else {
      alert("Annonce validée avec succès !")
      setAnnonce((prev: any) => ({ ...prev, validated: true, status: 'validé' }))
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Chargement de l'annonce...</div>
  }

  if (!annonce) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Annonce introuvable.</div>
  }

  const sellerId = annonce.user_id || annonce.author_id || annonce.created_by

  let rawImages = annonce.photos || annonce.image_url || annonce.image_urls || annonce.image || annonce.photo || []
  let rawList: string[] = []

  if (Array.isArray(rawImages)) {
    rawList = rawImages
  } else if (typeof rawImages === 'string') {
    rawList = rawImages.split(',').map((url: string) => url.trim()).filter(Boolean)
  }

  const imagesList = rawList.map((item) => {
    if (!item) return ''
    if (item.startsWith('http') || item.startsWith('data:image')) {
      return item
    }
    const { data } = supabase.storage.from('annonces-images').getPublicUrl(item)
    return data.publicUrl
  }).filter(Boolean)

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1))
  }

  const annonceTitle = annonce.titre || annonce.title || "Annonce sans titre"
  const annoncePrice = annonce.prix !== undefined && annonce.prix !== null ? `${annonce.prix} €` : ''
  const annonceDesc = annonce.description || "Aucune description fournie."
  const annonceCat = annonce.categorie || annonce.category || "Autre"

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* EN-TÊTE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/puffin-logo.jpeg" 
              alt="troctruc" 
              style={{ height: '45px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} 
            />
            <button 
              onClick={() => router.push('/')}
              style={{ padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: '500' }}
            >
              ← Retour à l'accueil
            </button>
          </div>

          {currentUser && !annonce.validated && annonce.status !== 'validé' && (
            <button 
              onClick={handleValidateAnnonce}
              style={{ padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', border: 'none', backgroundColor: '#2ecc71', color: 'white', fontWeight: 'bold' }}
            >
              ✅ Valider cette annonce
            </button>
          )}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8' }}>
          
          {/* TOURNIQUET DE PHOTOS */}
          {imagesList.length > 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#1e293b' }}>
              <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '8px' }}>
                <img 
                  src={imagesList[selectedImageIndex]} 
                  alt={annonceTitle} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />

                {imagesList.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      style={{
                        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white', border: 'none',
                        borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
                        fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      ❮
                    </button>
                    <button 
                      onClick={handleNextImage}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white', border: 'none',
                        borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
                        fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      ❯
                    </button>

                    <div style={{
                      position: 'absolute', bottom: '10px', right: '10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                    }}>
                      {selectedImageIndex + 1} / {imagesList.length}
                    </div>
                  </>
                )}
              </div>

              {/* Miniatures */}
              {imagesList.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '15px', paddingBottom: '5px' }}>
                  {imagesList.map((url, index) => (
                    <div 
                      key={index} 
                      onClick={() => setSelectedImageIndex(index)}
                      style={{ 
                        minWidth: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', 
                        border: selectedImageIndex === index ? '2px solid #2ecc71' : '1px solid #475569',
                        backgroundColor: '#0f172a', cursor: 'pointer', opacity: selectedImageIndex === index ? 1 : 0.6
                      }}
                    >
                      <img src={url} alt={`Miniature ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '15px' }}>
              Aucune photo disponible pour cette annonce
            </div>
          )}

          {/* CONTENU DE L'ANNONCE */}
          <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px' }}>
                  {annonceCat}
                </span>
                <h1 style={{ fontSize: '24px', color: '#2c3e50', margin: '0 0 10px 0' }}>
                  {annonceTitle}
                </h1>
                {(annonce.validated || annonce.status === 'validé') && (
                  <span style={{ color: '#27ae60', fontSize: '13px', fontWeight: 'bold' }}>✔ Annonce validée</span>
                )}
              </div>
              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#27ae60', whiteSpace: 'nowrap' }}>
                {annoncePrice}
              </span>
            </div>

            {/* ENCADRÉ PROFIL DE L'AUTEUR */}
            {authorProfile ? (
              <div
                onClick={() => router.push(`/profil/${sellerId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: '15px 0 20px 0'
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                  {authorProfile.avatar_url ? (
                    <img src={authorProfile.avatar_url} alt={authorProfile.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '20px' }}>👤</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Annonce publiée par</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                    {authorProfile.pseudo || 'Membre TrocTruc'}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                  Voir le profil →
                </span>
              </div>
            ) : sellerId ? (
              <div
                onClick={() => router.push(`/profil/${sellerId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: '15px 0 20px 0'
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Annonce publiée par</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                    Membre TrocTruc
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                  Voir le profil →
                </span>
              </div>
            ) : null}

            <hr style={{ border: 'none', borderTop: '1px solid #e1e4e8', margin: '20px 0' }} />

            <h3 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '10px' }}>Description</h3>
            <p style={{ color: '#555', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-line', marginBottom: '30px' }}>
              {annonceDesc}
            </p>

            {/* BOUTON CONTACTER LE VENDEUR / CHAT */}
            {currentUser && currentUser.id !== sellerId ? (
              <div>
                {!showChat ? (
                  <button
                    onClick={() => setShowChat(true)}
                    style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    💬 Contacter le vendeur
                  </button>
                ) : (
                  <div style={{ marginTop: '20px' }}>
                    <ChatModal
                      annonceId={annonce.id}
                      sellerId={sellerId}
                      currentUserId={currentUser.id}
                      onClose={() => setShowChat(false)}
                    />
                  </div>
                )}
              </div>
            ) : !currentUser ? (
              <button
                onClick={() => router.push('/auth')}
                style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
              >
                Connectez-vous pour contacter le vendeur
              </button>
            ) : (
              <div style={{ color: '#7f8c8d', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                Ceci est votre propre annonce.
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}