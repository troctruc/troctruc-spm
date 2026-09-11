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

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)

    setIsIOS(isIosDevice)

    const alreadyInstalled =
      localStorage.getItem('troctruc-app-installed') === 'true'

    if (alreadyInstalled) {
      setShowBanner(false)
      return
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()

      setDeferredPrompt(e)

      // Chrome/Android : on affiche seulement si l'installation est vraiment proposée
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      localStorage.setItem('troctruc-app-installed', 'true')
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

    // iPhone / iPad :
    // Safari ne fournit pas beforeinstallprompt,
    // donc on affiche le bouton tant que l'utilisateur
    // n'a pas indiqué avoir installé l'app.
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()

      const { outcome } =
        await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        localStorage.setItem(
          'troctruc-app-installed',
          'true'
        )

        setShowBanner(false)
      }

      setDeferredPrompt(null)

      return
    }

    if (isIOS) {
      const confirmed = window.confirm(
        "Pour installer TrocTruc sur votre iPhone ou iPad :\n\n" +
          "1. Ouvrez le site dans Safari.\n" +
          "2. Appuyez sur le bouton Partager.\n" +
          "3. Choisissez « Sur l'écran d'accueil ».\n\n" +
          "Si TrocTruc est déjà installé, appuyez sur OK."
      )

      if (confirmed) {
        localStorage.setItem(
          'troctruc-app-installed',
          'true'
        )

        setShowBanner(false)
      }

      return
    }

    alert(
      "Pour installer TrocTruc :\n\n" +
        "Ouvrez le menu de votre navigateur puis choisissez " +
        "« Installer l'application » ou « Ajouter à l'écran d'accueil »."
    )
  }

  if (!showBanner) return null

  return (
    <button
      onClick={handleInstallClick}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '30px',
        boxShadow:
          '0 4px 12px rgba(0,0,0,0.25)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
      }}
    >
      <span>📲 Installer TrocTruc SPM</span>
    </button>
  )
}