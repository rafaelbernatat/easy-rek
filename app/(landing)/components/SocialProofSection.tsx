import { Star } from 'lucide-react';

export function SocialProofSection() {
  const testimonials = [
    {
      name: 'Marina Costa',
      role: 'YouTuber com 50k inscritos',
      content: 'O Easy Rek mudou completamente minha produção de vídeos. Antes eu gastava 2 horas editando, agora faço em 20 minutos!',
      rating: 5,
    },
    {
      name: 'Pedro Santos',
      role: 'Criador de conteúdo',
      content: 'Os lower thirds são incríveis! Consigo manter minha identidade visual em todos os vídeos sem precisar do After Effects.',
      rating: 5,
    },
    {
      name: 'Julia Mendes',
      role: 'Professora online',
      content: 'A transcrição automática com IA é perfeita. Facilita muito para criar legendas acessíveis em português.',
      rating: 5,
    },
  ];

  const stats = [
    { value: '10k+', label: 'Usuários ativos' },
    { value: '100k+', label: 'Vídeos criados' },
    { value: '4.9', label: 'Avaliação média' },
  ];

  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="container mx-auto max-w-6xl">
        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            O que nossos usuários dizem
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-slate-200"
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                <p className="text-slate-700 mb-4 leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="text-center">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold text-indigo-600 mb-1">
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
