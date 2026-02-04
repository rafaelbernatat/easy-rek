import {
  Video,
  Edit3,
  Layers,
  Youtube,
  FileText,
  Share2,
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all">
      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Gravação de Tela + Câmera',
      description: 'Capture tela, câmera e áudio simultaneamente. Suporte a múltiplos monitores.',
    },
    {
      icon: <Edit3 className="w-6 h-6" />,
      title: 'Editor Rápido',
      description: 'Edite seus vídeos em minutos com timeline intuitiva e cortes precisos.',
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: 'Lower Thirds Customizáveis',
      description: 'Templates prontos ou crie seus próprios lower thirds totalmente personalizados.',
    },
    {
      icon: <Youtube className="w-6 h-6" />,
      title: 'YouTube Elements',
      description: 'Botões de inscrição, like, comentários e mais - tudo pronto para usar.',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Legendas Automáticas',
      description: 'Transcrição automática com IA. Edite legendas e exporte em SRT/VTT.',
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: 'Compartilhamento Público',
      description: 'Compartilhe vídeos via link protegido ou embed em qualquer site.',
    },
  ];

  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Tudo o que você precisa
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Ferramentas profissionais para criar conteúdo incrível em minutos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
