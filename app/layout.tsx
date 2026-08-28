import './globals.css'

export const metadata = {
  title: 'Tructroc SPM',
  description: 'Petites annonces à Saint-Pierre et Miquelon',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  )
}