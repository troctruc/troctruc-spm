'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NouvelleAnnonce() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  
  // MISE À JOUR DE LA CATÉGORIE PAR DÉFAUT (PREMIÈRE DU NOUVEL ORDRE)
  const [categorie, setCategorie] = useState('Maison')
  
  const [typeAnnonce, setTypeAnnonce] = useState('vente')
  const [localisation, setLocalisation] = useState('Saint-Pierre')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // MISE À JOUR DE L'ORDRE DES CATÉGORIES POUR CORRESPONDRE À L'ACCUEIL
  const categories = ['Maison', 'Loisirs', 'Multimédia', 'Jeu', 'Service', 'Véhicules', 'Immobilier', 'Autre']
  const locations = ['Saint-Pierre', 'Miquelon', 'Langlade']

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
      } else {
        setUser(user)
      }
    }
    getUser()
  }, [router])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    if (photos.length + files.length > 5) {
      alert("Vous pouvez ajouter au maximum 5 photos.")
      return
    }

    setUploading(true)
    const newPhotos: string[] = [...photos]

    for (const file of files) {
      try {
        const compressedBase64 = await resizeImage(file, 800, 0.7)
        newPhotos.push(compressedBase64)
      } catch (err) {
        console.error("Erreur compression image :", err)
      }
    }

    setPhotos(newPhotos)
    setUploading(false)
  }

  function resizeImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error("Impossible d'obtenir le contexte canvas"))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = (error) => reject(error)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert("Erreur : Utilisateur non connecté.")
      return
    }

    if (!titre.trim() || !description.trim()) {
      alert("Veuillez remplir le titre et la description.")
      return
    }

    setLoading(true)

    let prixFinal = 0
    if (typeAnnonce === 'vente') {
      if (!prix || Number(prix) < 0) {
        alert("Veuillez indiquer un prix valide pour une vente.")
        setLoading(false)
        return
      }
      prixFinal = Number(prix)
    }

    let typeLabel = typeAnnonce === 'recherche' ? 'RECHERCHES' : typeAnnonce.toUpperCase()
    const formattedDescription = `Type : ${typeLabel} | Localisation : ${localisation}\n\n${description}`

    const { data, error } = await supabase.from('annonces').insert([
      {
        titre,
        description: formattedDescription,
        prix: prixFinal,
        categorie,
        user_id: user.id,
        photos: photos,
        status: 'en attente'
      }
    ]).select()

    setLoading(false)

    if (error) {
      console.error("Erreur Supabase :", error)
      alert("Erreur lors de la création de l'annonce : " + error.message)
    } else {
      alert("Votre annonce a été soumise avec succès !")
      router.push('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', paddingBottom: '60px' }}>
      
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e1e4e8', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="Logo TrocTruc SPM" 
            style={{ width: '45px', height: '45px', objectFit: 'contain', backgroundColor: 'transparent', borderRadius: '8px' }} 
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: 'bold' }}>TrocTruc SPM</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>Déposer une annonce</p>
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

      <main style={{ maxWidth: '700px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: '#2c3e50', marginBottom: '20px' }}>Nouvelle Annonce</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Type d'annonce</label>
              <select
                value={typeAnnonce}
                onChange={(e) => setTypeAnnonce(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="vente">Vente</option>
                <option value="troc">Troc</option>
                <option value="don">Don</option>
                <option value="recherche">Recherche</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Titre de l'annonce</label>
              <input
                type="text"
                placeholder="Ex: Vélo VTT enfant, Canapé 3 places..."
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Catégorie</label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Localisation (Île)</label>
                <select
                  value={localisation}
                  onChange={(e) => setLocalisation(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {typeAnnonce === 'vente' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Prix (€)</label>
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  required={typeAnnonce === 'vente'}
                  min="0"
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Description</label>
              <textarea
                placeholder="Décrivez votre article en détail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Photos (Maximum 5)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ fontSize: '14px' }}
              />
              {uploading && <p style={{ fontSize: '12px', color: '#e67e22', margin: 0 }}>Compression des photos...</p>}

              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                      <img src={photo} alt={`Aperçu ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(231, 76, 60, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Publication en cours...' : "Publier l'annonce"}
            </button>

          </form>
        </div>
      </main>

    </div>
  )
}