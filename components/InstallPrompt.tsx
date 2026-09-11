'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Vérifie si TrocTruc est actuellement ouvert
    // comme application installée.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setShowBanner(false)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()

    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent)

    setIsIOS(isIosDevice)

    // Si l'utilisateur a fermé volontairement le bouton,
    // on le laisse tranquille pendant 30 jours.
    const dismissedAt =
      localStorage.getItem('troctruc-install-prompt-dismissed-at')

    if (dismissedAt) {
      const dismissedDate = Number(dismissedAt)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000

      if (Date.now() - dismissedDate < thirtyDays) {
        return
      }

      localStorage.removeItem(
        'troctruc-install-prompt-dismissed-at'
      )
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault()

      setDeferredPrompt(event)

      // IMPORTANT :
      // Sur Chrome/Android, on affiche le bouton
      // uniquement si Chrome dit que l'app est installable.
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowBanner(false)

      // On ne mémorise PAS définitivement l'installation.
      // Ainsi, si l'utilisateur désinstalle TrocTruc plus tard,
      // Chrome pourra reproposer l'installation.
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    )

    // Safari iOS ne possède pas beforeinstallprompt.
    // Il faut donc proposer manuellement l'installation.
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

  const handleDismiss = () => {
    localStorage.setItem(
      'troctruc-install-prompt-dismissed-at',
      Date.now().toString()
    )

    setShowBanner(false)
  }

  const handleInstallClick = async () => {
    // Chrome / Android
    if (deferredPrompt) {
      deferredPrompt.prompt()

      const { outcome } =
        await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowBanner(false)
      }

      setDeferredPrompt(null)
      return
    }

    // Safari / iPhone / iPad
    if (isIOS) {
      alert(
        "Pour installer TrocTruc SPM :\n\n" +
          "1. Ouvrez le site dans Safari.\n" +
          "2. Appuyez sur le bouton Partager.\n" +
          "3. Choisissez « Sur l'écran d'accueil »."
      )
    }
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
        gap: '6px',
        backgroundColor: '#2563eb',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        padding: '4px 6px 4px 14px',
        maxWidth: 'calc(100vw - 30px)',
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
        onClick={handleDismiss}
        aria-label="Fermer"
        title="Ne plus afficher pendant 30 jours"
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
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}