'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [annonces, setAnnonces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [selectedTypeOffre, setSelectedTypeOffre] = useState('Tous')
  const [selectedLocation, setSelectedLocation] = useState('Tous')
  const [hasNewMessages, setHasNewMessages] = useState(false)

  // MISE À JOUR DE L'ORDRE DES CATÉGORIES ICI
  const categories = ['Tous', 'Maison', 'Loisirs', 'Multimédia', 'Jeu', 'Service', 'Véhicules', 'Immobilier', 'Autre']
  
  const typesOffre = [
    { label: 'Tous', value: 'Tous' },
    { label: 'Ventes', value: 'vente' },
    { label: 'Dons', value: 'don' },
    { label: 'Troc', value: 'troc' },
    { label: 'Recherches', value: 'recherche' }
  ]
  
  const locations = [
    { label: 'Partout', value: 'Tous' },
    { label: 'Saint-Pierre', value: 'Saint-Pierre' },
    { label: 'Miquelon', value: 'Miquelon' },
    { label: 'Langlade', value: 'Langlade' }
  ]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        if (user.email === 'contact.troctruc@gmail.com') {
          setIsAdmin(true)
        }
        checkNewMessages(user.id)
      }
      fetchAnnonces()
    }
    init()
  }, [])

  async function checkNewMessages(userId: string) {
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, buyer_id, seller_id, last_read_buyer_at, last_read_seller_at')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

      if (!convs || convs.length === 0) return

      for (const conv of convs) {
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastMessageData && lastMessageData.sender_id !== userId) {
          const isBuyer = conv.buyer_id === userId
          const lastReadAt = isBuyer ? conv.last_read_buyer_at : conv.last_read_seller_at

          if (!lastReadAt || new Date(lastMessageData.created_at).getTime() > new Date(lastReadAt).getTime()) {
            setHasNewMessages(true)
            return
          }
        }
      }
      
      setHasNewMessages(false)
    } catch (err) {
      console.error("Erreur lors de la vérification des messages :", err)
    }
  }

  async function fetchAnnonces() {
    setLoading(true)
    let query = supabase.from('annonces').select('*').order('created_at', { ascending: false })

    const { data, error } = await query
    if (!error && data) {
      setAnnonces(data)
    }
    setLoading(false)
  }

  async function handleValidate(e: React.MouseEvent, annonceId: string) {
    e.stopPropagation()
    const { error } = await supabase
      .from('annonces')
      .update({ status: 'validé' })
      .eq('id', annonceId)

    if (error) {
      alert("Erreur lors de la validation : " + error.message)
    } else {
      alert("Annonce validée avec succès !")
      fetchAnnonces()
    }
  }

  async function handleDeleteAdmin(e: React.MouseEvent, annonceId: string) {
    e.stopPropagation()
    if (!confirm("Voulez-vous vraiment supprimer cette annonce en tant qu'administrateur ?")) return

    const { error } = await supabase
      .from('annonces')
      .delete()
      .eq('id', annonceId)

    if (error) {
      alert("Erreur lors de la suppression : " + error.message)
    } else {
      alert("Annonce supprimée.")
      fetchAnnonces()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setHasNewMessages(false)
    router.refresh()
  }

  const filteredAnnonces = annonces.filter((item) => {
    const matchQuery = item.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = selectedCategory === 'Tous' || item.categorie === selectedCategory
    
    // Extraction du type d'offre
    let itemTypeOffre = 'vente'
    if (item.description && item.description.includes('Type :')) {
      const typePart = item.description.split('Type :')[1]
      if (typePart) {
        const rawType = typePart.split('|')[0].trim().toLowerCase()
        if (rawType.includes('don')) itemTypeOffre = 'don'
        else if (rawType.includes('troc')) itemTypeOffre = 'troc'
        else if (rawType.includes('recherche')) itemTypeOffre = 'recherche'
        else if (rawType.includes('vente')) itemTypeOffre = 'vente'
      }
    }
    const matchTypeOffre = selectedTypeOffre === 'Tous' || itemTypeOffre === selectedTypeOffre

    // Extraction de la localisation
    let itemLoc = 'Saint-Pierre'
    if (item.description && item.description.includes('Localisation :')) {
      const locPart = item.description.split('Localisation :')[1]
      if (locPart) {
        itemLoc = locPart.split('\n')[0].split('|')[0].trim()
      }
    }
    const matchLoc = selectedLocation === 'Tous' || itemLoc === selectedLocation

    const isVisibleForUser = isAdmin || item.status !== 'en attente'

    return matchQuery && matchCat && matchTypeOffre && matchLoc && isVisibleForUser
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', paddingBottom: '60px' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e1e4e8', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="Logo TrocTruc SPM" 
            style={{ width: '45px', height: '45px', objectFit: 'contain', backgroundColor: 'transparent' }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: 'bold' }}>TrocTruc SPM</h1>
              {isAdmin && (
                <span style={{ backgroundColor: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  Admin
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>site d'échange, de vente et de partage de SPM</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user ? (
            <>
              <button
                onClick={() => router.push('/conversations')}
                style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', position: 'relative' }}
              >
                💬 Mes Messages
                {hasNewMessages && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#e74c3c',
                      borderRadius: '50%',
                      border: '2px solid white'
                    }}
                  />
                )}
              </button>

              <button
                onClick={() => router.push('/annonces/nouvelle')}
                style={{ backgroundColor: '#e67e22', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Déposer une annonce
              </button>
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#c0392b', cursor: 'pointer' }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/auth')}
              style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Se connecter / S'inscrire
            </button>
          )}
        </div>
      </header>

      {/* BARRE DE RECHERCHE, CATÉGORIES, TYPE D'OFFRE ET LOCALISATION */}
      <div style={{ maxWidth: '1000px', margin: '30px auto 20px auto', padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Ligne 1 : Recherche + Catégorie */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Que recherchez-vous ?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', minWidth: '250px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', whiteSpace: 'nowrap' }}>Catégorie :</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', backgroundColor: '#ffffff', color: '#2c3e50', cursor: 'pointer', fontWeight: '500' }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Tous' ? 'Toutes les catégories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ligne 2 : Filtres Type d'Offre */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginRight: '5px' }}>🏷️ Type :</span>
          {typesOffre.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedTypeOffre(type.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                backgroundColor: selectedTypeOffre === type.value ? '#27ae60' : '#f1f5f9',
                color: selectedTypeOffre === type.value ? '#ffffff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Ligne 3 : Filtres Localisation */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginRight: '5px' }}>📍 Lieu :</span>
          {locations.map((loc) => (
            <button
              key={loc.value}
              onClick={() => setSelectedLocation(loc.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                backgroundColor: selectedLocation === loc.value ? '#2c3e50' : '#f1f5f9',
                color: selectedLocation === loc.value ? '#ffffff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {loc.label}
            </button>
          ))}
        </div>

      </div>

      {/* LISTE DES ANNONCES */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '20px' }}>Annonces à Saint-Pierre-et-Miquelon</h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>Chargement des annonces...</p>
        ) : filteredAnnonces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', backgroundColor: 'white', borderRadius: '12px', color: '#7f8c8d' }}>
            Aucune annonce trouvée pour le moment.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {filteredAnnonces.map((item) => {
              let imageUrl = null
              if (item.photos && item.photos.length > 0) {
                imageUrl = item.photos[0]
              } else if (item.image_url) {
                imageUrl = item.image_url.includes(',') ? item.image_url.split(',')[0] : item.image_url
              } else if (item.image_urls) {
                imageUrl = item.image_urls.includes(',') ? item.image_urls.split(',')[0] : item.image_urls
              }

              let cardLocation = 'Saint-Pierre'
              if (item.description && item.description.includes('Localisation :')) {
                const locPart = item.description.split('Localisation :')[1]
                if (locPart) {
                  cardLocation = locPart.split('\n')[0].split('|')[0].trim()
                }
              }

              let cardType = 'vente'
              if (item.description && item.description.includes('Type :')) {
                const typePart = item.description.split('Type :')[1]
                if (typePart) {
                  cardType = typePart.split('|')[0].trim().toLowerCase()
                }
              }

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/annonces/${item.id}`)}
                  style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', position: 'relative' }}
                >
                  <div style={{ height: '160px', backgroundColor: '#e2e8f0', position: 'relative' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#95a5a6', fontSize: '13px' }}>Aucune photo</div>
                    )}
                    
                    <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      {item.categorie}
                    </span>

                    <span style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'rgba(30, 41, 59, 0.85)', color: 'white', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      📍 {cardLocation}
                    </span>

                    {isAdmin && item.status === 'en attente' && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#e67e22', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        En attente
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.titre}</h3>
                      
                      {/* TYPE D'OFFRE ET PRIX CONDITIONNEL */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: cardType === 'don' ? '#dcfce7' : cardType === 'troc' ? '#fef9c3' : cardType === 'recherche' ? '#f3e8ff' : '#e0f2fe',
                          color: cardType === 'don' ? '#166534' : cardType === 'troc' ? '#854d0e' : cardType === 'recherche' ? '#6b21a8' : '#0369a1',
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          textTransform: 'uppercase' 
                        }}>
                          {cardType}
                        </span>

                        {(cardType === 'vente') && (
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#27ae60', margin: 0 }}>
                            {item.prix} €
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#7f8c8d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        {item.status === 'en attente' && (
                          <button
                            onClick={(e) => handleValidate(e, item.id)}
                            style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Valider
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteAdmin(e, item.id)}
                          style={{ flex: 1, backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', marginTop: '60px', padding: '20px', borderTop: '1px solid #e1e4e8', color: '#7f8c8d', fontSize: '13px' }}>
        <p style={{ margin: '0 0 5px 0' }}>TrocTruc SPM — Plateforme de petites annonces locales</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#95a5a6' }}>Contact : contact.troctruc@gmail.com</p>
        <a href="/mentions-legales" style={{ color: '#3498db', textDecoration: 'none' }}>Mentions Légales & CGU</a>
      </footer>

    </div>
  )
}