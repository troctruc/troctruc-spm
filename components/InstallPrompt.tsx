'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setShowBanner(false)
      return
    }

    const dismissed =
      localStorage.getItem('troctruc-install-prompt-hidden') === 'true'

    if (dismissed) {
      setShowBanner(false)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)

    setIsIOS(isIosDevice)

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      localStorage.setItem('troctruc-install-prompt-hidden', 'true')
      setDeferredPrompt(null)
      setShowBanner(false)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    )

    if (isIosDevice) {
      setShowBanner(true)
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      )
    }
  }, [])

  const hidePromptPermanently = () => {
    localStorage.setItem(
      'troctruc-install-prompt-hidden',
      'true'
    )

    setShowBanner(false)
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()

      const { outcome } =
        await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        localStorage.setItem(
          'troctruc-install-prompt-hidden',
          'true'
        )

        setShowBanner(false)
      }

      setDeferredPrompt(null)
      return
    }

    if (isIOS) {
      alert(
        "Pour installer TrocTruc sur votre iPhone ou iPad :\n\n" +
          "1. Ouvrez le site dans Safari.\n" +
          "2. Appuyez sur le bouton Partager.\n" +
          "3. Choisissez « Sur l'écran d'accueil ».\n\n" +
          "Si TrocTruc est déjà installé, fermez ce message puis appuyez sur la croix du bandeau."
      )

      return
    }

    alert(
      "Pour installer TrocTruc :\n\n" +
        "Ouvrez le menu de votre navigateur puis choisissez " +
        "« Installer l'application » ou « Ajouter à l'écran d'accueil ».\n\n" +
        "Si l'application est déjà installée, fermez ce message puis appuyez sur la croix du bandeau."
    )
  }

  if (!showBanner) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#2563eb',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        padding: '4px 6px 4px 14px',
      }}
    >
      <button
        onClick={handleInstallClick}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          padding: '8px 6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'nowrap',
        }}
      >
        📲 Installer TrocTruc SPM
      </button>

      <button
        onClick={hidePromptPermanently}
        aria-label="Masquer le bouton d'installation"
        title="Ne plus afficher"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.18)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '20px',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}