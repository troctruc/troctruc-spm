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
  const [filtreType, setFiltreType] = useState<'Tous' | 'conducteur' | 'passager'>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

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
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrajets(data);
    }
  }

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

  const filteredTrajets = trajets.filter((t) => {
    const typeNormalise = (t.type === 'offre' || t.type === 'conducteur') ? 'conducteur' : 'passager';
    const matchType = filtreType === 'Tous' || typeNormalise === filtreType;
    const isVisible = isAdmin || t.status === 'validé';

    const depart = (t.depart || t.lieu_depart || '').toLowerCase();
    const arrivee = (t.arrivee || t.lieu_arrivee || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchQuery = !q || depart.includes(q) || arrivee.includes(q) || desc.includes(q);

    return matchType && isVisible && matchQuery;
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
            {(['Tous', 'conducteur', 'passager'] as const).map((mode) => (
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
                {mode === 'Tous' ? 'Tous' : mode === 'conducteur' ? '🚗 Conducteurs' : '🙋 Passagers'}
              </button>
            ))}
          </div>
        </div>

        {/* Champ de recherche libre par mot-clé / lieu */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Rechercher par lieu de départ, destination (ex: Langlade, Aéroport, Miquelon...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>Chargement des trajets...</p>
        ) : filteredTrajets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: 'white', borderRadius: '12px', color: '#7f8c8d', border: '1px solid #e1e4e8' }}>
            <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>Aucun trajet ne correspond à votre recherche.</p>
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
              const rawDate = trajet.date_trajet || trajet.date_depart;
              let dateStr = 'Date non précisée';
              if (rawDate) {
                const dateObj = new Date(rawDate);
                if (!isNaN(dateObj.getTime())) {
                  dateStr = dateObj.toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                } else {
                  dateStr = rawDate;
                }
              }

              const heureAffichee = trajet.heure_trajet || (trajet.date_depart && !isNaN(new Date(trajet.date_depart).getTime()) ? new Date(trajet.date_depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null);

              const isConducteur = trajet.type === 'offre' || trajet.type === 'conducteur';
              const isEnAttente = trajet.status === 'en attente';
              const departAffiche = trajet.depart || trajet.lieu_depart || 'Lieu non spécifié';
              const arriveeAffichee = trajet.arrivee || trajet.lieu_arrivee || 'Destination non spécifiée';

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
                          backgroundColor: isConducteur ? '#dbeafe' : '#fef3c7',
                          color: isConducteur ? '#1e40af' : '#92400e',
                        }}
                      >
                        {isConducteur ? '🚗 Conducteur' : '🙋 Passager'}
                      </span>

                      {isAdmin && isEnAttente && (
                        <span style={{ backgroundColor: '#e67e22', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          En attente de validation
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      🗓️ Date : <strong style={{ color: '#334155' }}>{dateStr} {heureAffichee ? `à ${heureAffichee}` : ''}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>📍 {departAffiche}</span>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <span>🏁 {arriveeAffichee}</span>
                  </div>

                  {/* Infos complémentaires : Places, Prix, Téléphone */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                    {trajet.places && (
                      <span>💺 <strong>{trajet.places}</strong> {trajet.places > 1 ? 'places' : 'place'}</span>
                    )}
                    <span>💶 <strong>{trajet.prix && trajet.prix > 0 ? `${trajet.prix} €` : 'Gratuit'}</strong></span>
                    {trajet.contact_tel && (
                      <span>📞 {trajet.contact_tel}</span>
                    )}
                  </div>

                  {trajet.description && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                      « {trajet.description} »
                    </p>
                  )}

                  {/* Boutons d'action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
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