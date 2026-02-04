import type { Metadata } from 'next';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Easy Rek',
  description: 'Gravação de tela profissional com editor rápido, lower thirds customizáveis e tudo o que você precisa para criar vídeos incríveis.',
  url: 'https://easyrek.com',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web Browser',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'BRL',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19',
      priceCurrency: 'BRL',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise',
      price: '49',
      priceCurrency: 'BRL',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '1000',
  },
};

export const metadata: Metadata = {
  title: 'Easy Rek - Gravação de Tela Profissional | Grave, Edite, Publique',
  description: 'Grave tela + câmera, edite em minutos, adicione lower thirds personalizados e publique onde quiser. A solução completa para criadores de conteúdo.',
  keywords: [
    'gravação de tela',
    'screen recording',
    'editor de vídeo',
    'lower thirds',
    'vídeo marketing',
    'conteúdo para YouTube',
    'gravação profissional',
    'video editor online',
  ],
  authors: [{ name: 'Easy Rek' }],
  creator: 'Easy Rek',
  publisher: 'Easy Rek',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://easyrek.com',
    title: 'Easy Rek - Gravação de Tela Profissional',
    description: 'Grave tela + câmera, edite em minutos, adicione lower thirds personalizados e publique onde quiser.',
    siteName: 'Easy Rek',
    images: [
      {
        url: 'https://easyrek.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Easy Rek - Gravação de Tela Profissional',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Easy Rek - Gravação de Tela Profissional',
    description: 'Grave tela + câmera, edite em minutos, adicione lower thirds personalizados e publique onde quiser.',
    images: ['https://easyrek.com/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  alternates: {
    canonical: 'https://easyrek.com',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </>
  );
}
