'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CovoiturageListingPage() {
  const router = useRouter();
  const [trajets, setTrajets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filtreType, setFiltreType] = useState<'Tous' | 'offre' | 'demande'>('Tous');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user && user.email === 'contact.troctruc@gmail.com') {
      setIsAdmin(true);
    }

    await fetchTrajets();
    setLoading(false);
  }

  async function fetchTrajets() {
    const { data, error } = await supabase
      .from('covoiturages')
      .select('*')
      .order('date_depart', { ascending: true });

    if (!error && data) {
      setTrajets(data);
    }
  }

  // Action Admin : Valider le covoiturage
  const handleValidate = async (trajetId: string) => {
    const { error } = await supabase
      .from('covoiturages')
      .update({ status: 'validé' })
      .eq('id', trajetId);

    if (error) {
      alert("Erreur lors de la validation : " + error.message);
    } else {
      alert("Trajet validé avec succès !");
      fetchTrajets();
    }
  };

  // Action Admin : Supprimer le covoiturage
  const handleDeleteAdmin = async (trajetId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce de covoiturage ?")) return;

    const { error } = await supabase
      .from('covoiturages')
      .delete()
      .eq('id', trajetId);

    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      alert("Trajet supprimé.");
      fetchTrajets();
    }
  };

  const handleContacter = async (trajet: any) => {
    if (!currentUser) {
      router.push('/auth');
      return;
    }

    if (currentUser.id === trajet.user_id) {
      alert("C'est votre propre annonce !");
      return;
    }

    router.push(`/conversations?contactId=${trajet.user_id}`);
  };

  // Filtrage selon le type et la visibilité admin
  const filteredTrajets = trajets.filter((t) => {
    const matchType = filtreType === 'Tous' || t.type === filtreType;
    const isVisible = isAdmin || t.status === 'validé';
    return matchType && isVisible;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', paddingBottom: '60px' }}>
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e1e4e8', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="Logo TrocTruc SPM" 
            style={{ width: '40px', height: '40px', objectFit: 'contain' }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '17px', color: '#2c3e50', fontWeight: 'bold' }}>TrocTruc SPM</h1>
              {isAdmin && (
                <span style={{ backgroundColor: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  Admin
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>Covoiturage sur l'archipel</p>
          </div>
        </div>

        <Link
          href="/covoiturage/nouveau"
          style={{ backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
        >
          ➕ Proposer un trajet
        </Link>
      </header>

      <main style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>Trajets disponibles</h2>
            <p style={{ margin: '4px 0 0 0', color: '#7f8c8d', fontSize: '13px' }}>Partagez vos trajets à Saint-Pierre, Miquelon et Langlade</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['Tous', 'offre', 'demande'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFiltreType(mode)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: filtreType === mode ? '#2c3e50' : '#ffffff',
                  color: filtreType === mode ? '#ffffff' : '#64748b',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {mode === 'Tous' ? 'Tous' : mode === 'offre' ? 'Conducteurs' : 'Passagers'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>Chargement des trajets...</p>
        ) : filteredTrajets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: 'white', borderRadius: '12px', color: '#7f8c8d', border: '1px solid #e1e4e8' }}>
            <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>Aucun trajet disponible pour le moment.</p>
            <Link
              href="/covoiturage/nouveau"
              style={{ display: 'inline-block', backgroundColor: '#e67e22', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
            >
              Soyez le premier à proposer un trajet !
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredTrajets.map((trajet) => {
              const dateObj = new Date(trajet.date_depart);
              const dateStr = dateObj.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
              const heureStr = dateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isOffre = trajet.type === 'offre';
              const isEnAttente = trajet.status === 'en attente';

              return (
                <div
                  key={trajet.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    border: isEnAttente ? '1px dashed #e67e22' : '1px solid #e1e4e8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: isOffre ? '#dbeafe' : '#fef3c7',
                          color: isOffre ? '#1e40af' : '#92400e',
                        }}
                      >
                        {isOffre ? '🚗 Conducteur' : '🙋 Cherche un trajet'}
                      </span>

                      {isAdmin && isEnAttente && (
                        <span style={{ backgroundColor: '#e67e22', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          En attente de validation
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      🗓️ Départ : <strong style={{ color: '#334155' }}>{dateStr} à {heureStr}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {trajet.lieu_depart} ➔ {trajet.lieu_arrivee}
                  </div>

                  {/* BOUTONS D'ACTION (Message + Outils Admin) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
                    
                    {/* Zone Admin */}
                    {isAdmin ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isEnAttente && (
                          <button
                            onClick={() => handleValidate(trajet.id)}
                            style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✓ Valider
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAdmin(trajet.id)}
                          style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ✕ Supprimer
                        </button>
                      </div>
                    ) : <div />}

                    {/* Bouton Message */}
                    <button
                      onClick={() => handleContacter(trajet)}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      💬 Contacter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}