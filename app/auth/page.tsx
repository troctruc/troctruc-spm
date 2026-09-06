'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setErrorMessage("Erreur lors de l'inscription : " + error.message)
      } else {
        setSuccessMessage("Merci pour votre inscription. Vous allez recevoir un lien pour confirmer votre email. Cliquez dessus pour pouvoir profiter de TrocTruc. S'il n'apparaît pas, veuillez vérifier vos spams. Merci pour votre inscription et bonnes transactions")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMessage("Erreur de connexion : " + error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '40px 30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8', textAlign: 'center' }}>
        
        {/* LOGO EN GROS */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/puffin-logo.jpeg" 
            alt="TrocTruc SPM" 
            style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} 
          />
          <h1 style={{ fontSize: '22px', color: '#1e293b', margin: 0 }}>TrocTruc SPM</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>site d'échange, de vente et de partage de SPM</p>
        </div>

        {errorMessage && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', textAlign: 'left', lineHeight: '1.4' }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>
              Adresse e-mail
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              placeholder="votre@email.com"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#334155', fontSize: '13px' }}>
              Mot de passe
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#3498db', color: 'white', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginBottom: '15px' }}
          >
            {loading ? 'Chargement...' : (isSignUp ? "Confirmer mon inscription" : "Se connecter")}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '10px' }}>
          <button 
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); setSuccessMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
          >
            {isSignUp ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button 
            type="button"
            onClick={() => router.push('/')}
            style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}
          >
            ← Retour à l'accueil
          </button>
        </div>

      </div>
    </div>
  )
}