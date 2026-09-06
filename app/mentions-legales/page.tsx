export default function MentionsLegales() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8' }}>
        
        <h1 style={{ fontSize: '26px', color: '#2c3e50', marginBottom: '10px' }}>Mentions Légales & Conditions Générales d'Utilisation (CGU)</h1>
        <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '30px' }}>Dernière mise à jour : Septembre 2026</p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>1. Éditeur du site</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          Le site <strong>TrocTruc SPM</strong> (accessible à l'adresse <code>https://troctruc-spm.com</code>) est une initiative bénévole et indépendante de petites annonces et de covoiturage dédiée à l'archipel de Saint-Pierre-et-Miquelon.<br />
          Contact & signalements : <a href="mailto:contact.troctruc@gmail.com" style={{ color: '#2563eb' }}>contact.troctruc@gmail.com</a>
        </p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>2. Hébergement</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          <strong>Hébergement web & frontend :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.<br />
          <strong>Base de données & Authentification :</strong> Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 (données hébergées en environnement sécurisé conforme aux standards de l'industrie).
        </p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>3. Statut d'intermédiaire et modération (Loi LCEN)</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          TrocTruc SPM intervient en qualité exclusive d'hébergeur technique et d'intermédiaire bénévole de mise en relation. La plateforme n'intervient à aucun titre dans les échanges matériels, les transactions financières ou les rendez-vous physiques entre particuliers.<br />
          Les utilisateurs sont seuls responsables du contenu de leurs publications, de la licéité des biens proposés et du respect de la législation en vigueur. Tout contenu jugé illicite ou frauduleux peut être signalé à tout moment à l'adresse de contact pour suppression sans préavis.
        </p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>4. Cadre spécifique du covoiturage</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          Conformément à l'article L. 3132-1 du Code des transports, le service de covoiturage mis en relation via TrocTruc SPM s'entend d'une utilisation commune d'un véhicule dans le cadre d'un déplacement effectué par le conducteur pour son propre compte.<br />
          Toute participation financière demandée par le conducteur doit être strictement limitée au partage effectif des frais de déplacement (carburant, usure). Aucune activité commerciale ou à but lucratif déguisée n'est autorisée.
        </p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>5. Données personnelles (RGPD)</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          Les données collectées (adresse e-mail et informations déclaratives de contact) ont pour finalité exclusive le fonctionnement du service et la mise en contact sécurisée entre utilisateurs. Aucune donnée n'est cédée, vendue ou exploitée à des fins publicitaires.<br />
          Conformément aux dispositions relatives à la protection des données (RGPD), chaque utilisateur dispose d'un droit d'accès, de rectification et de suppression totale de ses données personnelles, exerçable sur simple demande formulée à <a href="mailto:contact.troctruc@gmail.com" style={{ color: '#2563eb' }}>contact.troctruc@gmail.com</a>.
        </p>

        <h3 style={{ color: '#2c3e50', marginTop: '25px', fontSize: '17px' }}>6. Propriété intellectuelle</h3>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
          L'ensemble des éléments visuels, de conception graphique et des logos (notamment l'identité visuelle TrocTruc SPM) sont protégés. Toute reproduction sans accord préalable est prohibée.
        </p>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <a href="/" style={{ backgroundColor: '#3498db', color: 'white', padding: '10px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
            ← Retour à l'accueil
          </a>
        </div>

      </div>
    </div>
  )
}