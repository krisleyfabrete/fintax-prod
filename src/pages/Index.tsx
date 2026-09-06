import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  Users,
  Check,
  Star,
  ChartPie,
  Target,
  CreditCard,
  Bell,
  Tag,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollReveal, useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';
import { useAuth } from '@/contexts/AuthContext';
import { FeatureCard3D } from '@/components/FeatureCard3D';
import { getAppVersion } from '@/lib/appVersion';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

const features = [
  {
    icon: <Wallet className="h-6 w-6" />,
    title: 'Controle de Contas',
    description: 'Gerencie todas as suas contas bancárias, cartões e investimentos em um só lugar.'
  },
  {
    icon: <ChartPie className="h-6 w-6" />,
    title: 'Orçamentos Inteligentes',
    description: 'Crie orçamentos por categoria e acompanhe seus gastos em tempo real.'
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: 'Metas Financeiras',
    description: 'Defina objetivos e acompanhe seu progresso até alcançá-los.'
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Insights com IA',
    description: 'Receba análises personalizadas e dicas para economizar mais.'
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: 'Importação Automática',
    description: 'Importe extratos bancários e recibos automaticamente.'
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Compartilhamento Familiar',
    description: 'Gerencie as finanças de toda a família em conjunto.'
  }
];

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Empresária',
    content: 'Finalmente consegui organizar minhas finanças! O app é intuitivo e me ajudou a economizar 30% do meu salário.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    rating: 5
  },
  {
    name: 'João Santos',
    role: 'Desenvolvedor',
    content: 'A funcionalidade de metas foi o que me conquistou. Consegui juntar para minha viagem em 6 meses!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 5
  },
  {
    name: 'Ana Costa',
    role: 'Professora',
    content: 'O compartilhamento familiar é incrível. Agora toda a família sabe para onde vai o dinheiro.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 5
  },
  {
    name: 'Carlos Oliveira',
    role: 'Engenheiro',
    content: 'Os insights com IA são muito precisos. Descobri gastos que nem sabia que tinha e consegui cortar.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    rating: 5
  },
  {
    name: 'Juliana Lima',
    role: 'Médica',
    content: 'Uso o app há 1 ano e já economizei mais de R$ 15.000. Recomendo para todos os meus colegas!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    rating: 5
  },
  {
    name: 'Ricardo Mendes',
    role: 'Contador',
    content: 'Como profissional de finanças, posso dizer que o Fintax é uma das melhores ferramentas do mercado.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    rating: 5
  }
];

const faqs = [
  {
    question: 'O Fintax Finanças é realmente gratuito?',
    answer: 'Sim! O plano gratuito é totalmente funcional e você pode usá-lo para sempre. Oferecemos planos pagos com recursos adicionais para quem precisa de mais funcionalidades, como transações ilimitadas e insights com IA.'
  },
  {
    question: 'Meus dados bancários estão seguros?',
    answer: 'Absolutamente. Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança da indústria. Nunca temos acesso às suas credenciais bancárias - você apenas registra suas transações manualmente ou importa extratos.'
  },
  {
    question: 'Posso usar em mais de um dispositivo?',
    answer: 'Sim! O Fintax Finanças é totalmente sincronizado na nuvem. Você pode acessar suas finanças de qualquer dispositivo, seja celular, tablet ou computador, e todas as informações estarão atualizadas.'
  },
  {
    question: 'Como funciona o plano familiar?',
    answer: 'O plano familiar permite que você compartilhe contas, orçamentos e metas com membros da sua família. Cada pessoa tem sua própria conta, mas vocês podem visualizar e gerenciar as finanças compartilhadas juntos.'
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer: 'Sim, você pode cancelar sua assinatura a qualquer momento sem taxas ou multas. Ao cancelar, você continuará tendo acesso ao plano pago até o final do período já pago, depois volta automaticamente para o plano gratuito.'
  },
  {
    question: 'Como a IA me ajuda a economizar?',
    answer: 'Nossa inteligência artificial analisa seus padrões de gastos e identifica oportunidades de economia. Ela sugere ajustes no orçamento, alerta sobre gastos excessivos e prevê suas despesas futuras com base no histórico.'
  }
];

// Preços em centavos
const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 1990, yearly: 19900 },
  family: { monthly: 2990, yearly: 29900 },
};

const pricingPlans = [
  {
    id: 'free' as const,
    name: 'Gratuito',
    features: ['1 conta bancária', '50 transações/mês', '2 metas financeiras', '3 orçamentos'],
    popular: false
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    features: ['10 contas bancárias', 'Transações ilimitadas', 'Metas ilimitadas', 'Insights com IA', 'Importação de extratos'],
    popular: true
  },
  {
    id: 'family' as const,
    name: 'Familiar',
    features: ['Tudo do Pro', 'Contas ilimitadas', 'Compartilhamento familiar', 'Grupos familiares', 'Suporte prioritário'],
    popular: false
  }
];

// Animated stat component
function AnimatedStat({ value, label, suffix = '', prefix = '' }: { value: number; label: string; suffix?: string; prefix?: string }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });
  const { formattedValue } = useCountUp({
    end: value,
    duration: 2000,
    prefix,
    suffix,
    enabled: isVisible,
  });

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-gradient">{formattedValue}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// Testimonials Carousel Component
function TestimonialsCarousel({ testimonials }: { testimonials: typeof import('./Index').default extends never ? never : { name: string; role: string; content: string; avatar: string; rating: number }[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-4 min-w-0"
            >
              <Card className="group border shadow-card h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 relative overflow-hidden">
                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardContent className="p-6">
                  {/* Quote icon */}
                  <div className="absolute top-4 right-4 text-6xl text-primary/5 font-serif leading-none">"</div>
                  
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <p className="text-foreground mb-6 relative z-10 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 hidden md:flex rounded-full shadow-lg bg-background/90 backdrop-blur"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 hidden md:flex rounded-full shadow-lg bg-background/90 backdrop-blur"
        onClick={scrollNext}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              selectedIndex === index 
                ? "w-8 bg-primary" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const formatPrice = (priceInCents: number): string => {
    if (priceInCents === 0) return 'R$ 0';
    return `R$ ${(priceInCents / 100).toFixed(2).replace('.', ',')}`;
  };

  const getPlanPrice = (planId: 'free' | 'pro' | 'family'): number => {
    return PLAN_PRICES[planId][billingInterval];
  };

  const getYearlySavings = (planId: 'free' | 'pro' | 'family'): number => {
    const monthlyTotal = PLAN_PRICES[planId].monthly * 12;
    const yearlyPrice = PLAN_PRICES[planId].yearly;
    return monthlyTotal - yearlyPrice;
  };

  const handleSelectPlan = (planId: 'free' | 'pro' | 'family') => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={fintaxLogo} 
              alt="Fintax Finanças" 
              className="h-12 object-contain"
            />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>
          
          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button asChild className="gradient-primary border-0">
              <Link to="/auth">Login / Cadastro</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <nav className="flex flex-col gap-4 mt-8">
                <SheetClose asChild>
                  <a 
                    href="#features" 
                    className="text-lg font-medium hover:text-primary transition-colors py-2 animate-fade-in"
                    style={{ animationDelay: '0.05s' }}
                  >
                    Recursos
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a 
                    href="#pricing" 
                    className="text-lg font-medium hover:text-primary transition-colors py-2 animate-fade-in"
                    style={{ animationDelay: '0.1s' }}
                  >
                    Preços
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a 
                    href="#testimonials" 
                    className="text-lg font-medium hover:text-primary transition-colors py-2 animate-fade-in"
                    style={{ animationDelay: '0.15s' }}
                  >
                    Depoimentos
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a 
                    href="#faq" 
                    className="text-lg font-medium hover:text-primary transition-colors py-2 animate-fade-in"
                    style={{ animationDelay: '0.2s' }}
                  >
                    FAQ
                  </a>
                </SheetClose>
                <div 
                  className="border-t pt-4 mt-2 animate-fade-in"
                  style={{ animationDelay: '0.25s' }}
                >
                  <SheetClose asChild>
                    <Button asChild className="w-full gradient-primary border-0">
                      <Link to="/auth">Login / Cadastro</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 overflow-hidden relative">
        {/* Optimized Background decorations - reduced blur for performance */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 will-change-transform" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-primary/8 rounded-full blur-3xl -z-10 will-change-transform" />
        
        <div className="container mx-auto text-center relative">
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Novo: Insights com Inteligência Artificial
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Controle suas finanças
            <span className="text-gradient-fintax block">de forma inteligente</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Organize receitas, despesas e metas em um só lugar. 
            Receba análises personalizadas por IA para economizar mais.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-primary border-0 text-lg h-14 px-8" asChild>
              <Link to="/auth">
                Começar gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-2" asChild>
              <a href="#features">Ver recursos</a>
            </Button>
          </div>
          
          {/* Static Stats - removed animation for performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Usuários ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient">R$ 2M+</div>
              <div className="text-sm text-muted-foreground mt-1">Economizados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient">4.9</div>
              <div className="text-sm text-muted-foreground mt-1">Avaliação média</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">Disponibilidade</div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners & Integrations Section */}
      <section className="py-20 px-4 border-b bg-muted/20">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Integrações</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Compatível com os principais
              <span className="text-gradient"> bancos do Brasil</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Importe extratos e gerencie todas as suas contas em um só lugar
            </p>
          </ScrollReveal>
          
          {/* Banks Grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6 max-w-4xl mx-auto mb-12">
            {[
              { src: '/banks/nubank.png', name: 'Nubank' },
              { src: '/banks/itau.png', name: 'Itaú' },
              { src: '/banks/bradesco.jpeg', name: 'Bradesco' },
              { src: '/banks/santander.jpeg', name: 'Santander' },
              { src: '/banks/bb.jpeg', name: 'Banco do Brasil' },
              { src: '/banks/caixa.jpeg', name: 'Caixa' },
              { src: '/banks/inter.webp', name: 'Inter' },
              { src: '/banks/c6bank.jpeg', name: 'C6 Bank' },
            ].map((bank, index) => (
              <ScrollReveal key={index} animation="scale" delay={index * 50}>
                <div className="group flex flex-col items-center gap-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-background border shadow-sm flex items-center justify-center p-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:border-primary/50">
                    <img 
                      src={bank.src} 
                      alt={bank.name} 
                      className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300" 
                    />
                  </div>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{bank.name}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* More integrations */}
          <ScrollReveal animation="fade-up">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">E mais de 20 outras instituições financeiras</p>
              <div className="flex flex-wrap justify-center gap-3">
                {['PicPay', 'PagBank', 'Mercado Pago', 'BTG', 'XP', 'Rico', 'Clear', 'Neon'].map((name, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Recursos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa para
              <span className="text-gradient"> organizar seu dinheiro</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas e intuitivas para você ter controle total das suas finanças pessoais e familiares.
            </p>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <ScrollReveal 
                key={index} 
                animation="fade-up" 
                delay={index * 100}
              >
                <FeatureCard3D
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Como funciona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comece a economizar
              <span className="text-gradient"> em 3 passos</span>
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Crie sua conta', description: 'Cadastre-se gratuitamente em menos de 1 minuto.' },
              { step: '2', title: 'Adicione suas contas', description: 'Conecte suas contas bancárias e cartões.' },
              { step: '3', title: 'Acompanhe tudo', description: 'Visualize relatórios e insights automáticos.' }
            ].map((item, index) => (
              <ScrollReveal key={index} animation="scale" delay={index * 150}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full gradient-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-glow">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Preços</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha o plano
              <span className="text-gradient"> ideal para você</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e faça upgrade quando precisar de mais recursos.
            </p>
          </ScrollReveal>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Label 
              htmlFor="landing-billing-toggle" 
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer",
                billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setBillingInterval('monthly')}
            >
              Mensal
            </Label>
            <Switch
              id="landing-billing-toggle"
              checked={billingInterval === 'yearly'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            />
            <div className="flex items-center gap-2">
              <Label 
                htmlFor="landing-billing-toggle" 
                className={cn(
                  "text-sm font-medium transition-colors cursor-pointer",
                  billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
                )}
                onClick={() => setBillingInterval('yearly')}
              >
                Anual
              </Label>
              <Badge className="bg-secondary text-secondary-foreground">
                Economize até 17%
              </Badge>
            </div>
          </div>

          <div className={cn(
            "grid gap-6 max-w-5xl mx-auto transition-all duration-500 ease-out",
            "md:grid-cols-3"
          )}>
            {pricingPlans.map((plan, index) => {
              const planPrice = getPlanPrice(plan.id);
              const savings = getYearlySavings(plan.id);

              return (
                <ScrollReveal
                  key={plan.id} 
                  animation="fade-up" 
                  delay={index * 100}
                >
                  <Card 
                    className={cn(
                      "relative h-full animate-pricing-enter transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
                      plan.popular ? 'border-primary shadow-glow border-2 hover:shadow-[0_0_40px_hsl(237_85%_62%/0.3)]' : 'border shadow-card hover:border-primary/50 hover:shadow-[0_0_25px_hsl(237_85%_62%/0.15)]'
                    )}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary border-0">
                        Mais popular
                      </Badge>
                    )}
                    <CardContent className="p-6 pt-8">
                      <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                      <div className="mb-2">
                        <span className="text-4xl font-bold">{formatPrice(planPrice)}</span>
                        <span className="text-muted-foreground">
                          /{billingInterval === 'yearly' ? 'ano' : 'mês'}
                        </span>
                      </div>
                      {billingInterval === 'yearly' && savings > 0 && (
                        <Badge variant="secondary" className="mb-4 bg-secondary/10 text-secondary">
                          💰 Economize {formatPrice(savings)}
                        </Badge>
                      )}
                      {plan.id === 'free' && (
                        <p className="text-sm text-muted-foreground mb-4">para sempre</p>
                      )}
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-secondary" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={`w-full ${plan.popular ? 'gradient-primary border-0' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {plan.id === 'free' 
                          ? 'Começar grátis' 
                          : 'Escolher plano'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 overflow-hidden">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Star className="h-3.5 w-3.5 mr-1 fill-current" />
              Depoimentos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mais de <span className="text-gradient">50.000 usuários</span> satisfeitos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Veja o que nossos usuários estão dizendo sobre o Fintax Finanças
            </p>
          </ScrollReveal>
          
          {/* Testimonials Carousel */}
          <TestimonialsCarousel testimonials={testimonials} />

          {/* Stats bar */}
          <ScrollReveal animation="fade-up" className="mt-16">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient">4.9/5</div>
                <div className="text-sm text-muted-foreground mt-1">Avaliação média</div>
              </div>
              <div className="w-px h-12 bg-border hidden md:block" />
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient">50K+</div>
                <div className="text-sm text-muted-foreground mt-1">Usuários ativos</div>
              </div>
              <div className="w-px h-12 bg-border hidden md:block" />
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient">R$ 2M+</div>
                <div className="text-sm text-muted-foreground mt-1">Economizados</div>
              </div>
              <div className="w-px h-12 bg-border hidden md:block" />
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient">98%</div>
                <div className="text-sm text-muted-foreground mt-1">Recomendam</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perguntas
              <span className="text-gradient"> frequentes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tire suas dúvidas sobre o Fintax
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="rounded-xl border px-6 overflow-hidden glass-card"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-5 [&[data-state=open]>svg]:rotate-180">
                      <span className="font-semibold text-base pr-4">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 text-base">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
        <div className="container mx-auto">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Segurança
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Seus dados estão
              <span className="text-gradient"> 100% protegidos</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Utilizamos as melhores práticas de segurança da indústria financeira para garantir a proteção total das suas informações.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
            {/* Left Side - Security Features */}
            <ScrollReveal animation="fade-right">
              <div className="space-y-6">
                {[
                  { 
                    icon: <Shield className="h-6 w-6" />, 
                    title: 'Criptografia de Ponta a Ponta',
                    description: 'Todos os seus dados são criptografados com AES-256, o mesmo padrão usado por bancos.',
                    color: 'bg-primary/10 text-primary border-primary/20'
                   },
                   {
                     icon: <Smartphone className="h-6 w-6" />,
                     title: 'Autenticação em Duas Etapas',
                     description: 'Camada extra de proteção para garantir que só você acesse sua conta.',
                     color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                   },
                   {
                     icon: <Bell className="h-6 w-6" />,
                     title: 'Alertas de Atividade Suspeita',
                     description: 'Monitoramento 24/7 com notificações instantâneas de acessos não reconhecidos.',
                     color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                   },
                   {
                     icon: <Tag className="h-6 w-6" />,
                     title: 'Conformidade LGPD',
                     description: 'Seguimos todas as diretrizes da Lei Geral de Proteção de Dados.',
                     color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                   }
                 ].map((item, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]",
                      item.color
                    )}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Right Side - Visual */}
            <ScrollReveal animation="fade-left">
              <div className="relative">
                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                
                {/* Main card */}
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_30s_linear_infinite]" />
              
              {/* Middle ring */}
              <div className="absolute inset-8 rounded-full border border-primary/30" />
              
              {/* Inner content */}
              <div className="absolute inset-16 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 backdrop-blur-sm flex items-center justify-center">
                    <div className="relative">
                      <Shield className="w-24 h-24 text-primary" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating badges */}
                  <div className="absolute top-4 right-8 bg-background/90 backdrop-blur border rounded-lg px-3 py-2 shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-medium">SSL Ativo</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-8 left-4 bg-background/90 backdrop-blur border rounded-lg px-3 py-2 shadow-lg animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Dados Protegidos</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-1/2 -left-4 bg-background/90 backdrop-blur border rounded-lg px-3 py-2 shadow-lg animate-fade-in" style={{ animationDelay: '0.7s' }}>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-medium">2FA Habilitado</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Trust badges */}
          <ScrollReveal animation="fade-up" className="mt-16">
            <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-5 w-5 text-primary" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-5 w-5 text-primary" />
                <span>LGPD Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-5 w-5 text-primary" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-5 w-5 text-primary" />
                <span>ISO 27001</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <ScrollReveal animation="scale">
            <div className="max-w-4xl mx-auto text-center gradient-primary rounded-3xl p-12 shadow-glow">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para organizar suas finanças?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Junte-se a mais de 50.000 usuários que já estão economizando com uma vida financeira organizada.
              </p>
              <Button size="lg" variant="secondary" className="text-lg h-14 px-8" asChild>
                <Link to="/auth">
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <img 
                src={fintaxLogo} 
                alt="Fintax Finanças" 
                className="h-10 object-contain"
              />
            </div>
            
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos de Uso</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            </nav>
            
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Fintax Finanças. Todos os direitos reservados.</p>
              <p>
                Desenvolvido por{' '}
                <a 
                  href="https://www.instagram.com/kaleby.fn/"
                  target="_blank"
                  rel="noopener noreferrer external"
                   onClick={(e) => {
                    e.preventDefault();
                    window.open('https://www.instagram.com/kaleby.fn/', '_blank', 'noopener,noreferrer');
                  }}
                  >
                  <span className="font-medium text-primary hover:text-primary/80 transition-colors">
                    Kaleby Fabrete Nascimento
                  </span>
                </a>
              </p>
              <p className="text-xs">Versão {getAppVersion()}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
