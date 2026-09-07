'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NouveauCovoiturage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [typeTrajet, setTypeTrajet] = useState<'conducteur' | 'passager'>('conducteur')
  const [depart, setDepart] = useState('')
  const [arrivee, setArrivee] = useState('')
  const [dateTrajet, setDateTrajet] = useState('')
  const [heureTrajet, setHeureTrajet] = useState('')
  const [places, setPlaces] = useState('1')
  const [prix, setPrix] = useState('0')
  const [contactTel, setContactTel] = useState('')
  const [description, setDescription] = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert("Erreur : Utilisateur non connecté.")
      return
    }

    if (!depart.trim() || !arrivee.trim()) {
      alert("Veuillez renseigner un lieu de départ et d'arrivée.")
      return
    }

    if (!dateTrajet) {
      alert("Veuillez indiquer une date pour le trajet.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from('covoiturages').insert([
      {
        user_id: user.id,
        user_email: user.email,
        type: typeTrajet,
        depart: depart.trim(),
        arrivee: arrivee.trim(),
        date_trajet: dateTrajet,
        heure_trajet: heureTrajet || null,
        places: parseInt(places, 10) || 1,
        prix: parseFloat(prix) || 0,
        contact_tel: contactTel.trim() || null,
        description: description.trim() || null,
        status: 'validé'
      }
    ])

    setLoading(false)

    if (error) {
      console.error("Erreur création covoiturage :", error)
      alert("Erreur lors de la publication : " + error.message)
    } else {
      alert("Trajet de covoiturage publié avec succès !")
      router.push('/covoiturage')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', paddingBottom: '60px' }}>
      
      {/* HEADER IDENTIQUE AU DÉPÔT D'ANNONCE */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e1e4e8', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="Logo TrocTruc SPM" 
            style={{ width: '45px', height: '45px', objectFit: 'contain', backgroundColor: 'transparent', borderRadius: '8px' }} 
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: 'bold' }}>TrocTruc SPM</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>Proposer un covoiturage</p>
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
          <h2 style={{ marginTop: 0, fontSize: '20px', color: '#2c3e50', marginBottom: '20px' }}>
            🚗 Proposer ou demander un trajet
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Type d'annonce covoiturage */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Je suis :</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="typeTrajet"
                    value="conducteur"
                    checked={typeTrajet === 'conducteur'}
                    onChange={() => setTypeTrajet('conducteur')}
                  />
                  Conducteur (je propose des places)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="typeTrajet"
                    value="passager"
                    checked={typeTrajet === 'passager'}
                    onChange={() => setTypeTrajet('passager')}
                  />
                  Passager (je cherche un trajet)
                </label>
              </div>
            </div>

            {/* Départ & Arrivée en champs libres */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Lieu de départ</label>
                <input
                  type="text"
                  placeholder="Ex: Embarcadère, Saint-Pierre, Place du Général de Gaulle..."
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Lieu d'arrivée</label>
                <input
                  type="text"
                  placeholder="Ex: Miquelon bourg, Langlade, Aéroport..."
                  value={arrivee}
                  onChange={(e) => setArrivee(e.target.value)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Date & Heure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Date du trajet</label>
                <input
                  type="date"
                  value={dateTrajet}
                  onChange={(e) => setDateTrajet(e.target.value)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Heure de départ (indicative)</label>
                <input
                  type="time"
                  value={heureTrajet}
                  onChange={(e) => setHeureTrajet(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Places & Participation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Nombre de places</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={places}
                  onChange={(e) => setPlaces(e.target.value)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Participation (€ par place, 0 = gratuit)</label>
                <input
                  type="number"
                  min="0"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Téléphone de contact (optionnel)</label>
              <input
                type="tel"
                placeholder="Ex: 55 12 34"
                value={contactTel}
                onChange={(e) => setContactTel(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>

            {/* Précisions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Précisions / Lieu de rendez-vous</label>
              <textarea
                placeholder="Précisez le point de rencontre, bagages acceptés, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Publication en cours...' : 'Publier le covoiturage'}
            </button>

          </form>
        </div>
      </main>

    </div>
  )
}