import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header — logo centralizada no mesmo padrão da tela de IA */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>

          <Link to="/">
            <img
              src={fintaxLogo}
              alt="Fintax Finanças"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Termos de Uso</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: Dezembro de 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o Fintax Finanças, você concorda em cumprir e estar vinculado 
              aos seguintes termos e condições de uso. Se você não concordar com qualquer parte 
              destes termos, não deverá utilizar nosso serviço.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Descrição do Serviço</h2>
            <p>
              O Fintax Finanças é uma plataforma de gestão financeira pessoal que permite aos 
              usuários registrar, organizar e analisar suas receitas, despesas, orçamentos e 
              metas financeiras. O serviço é fornecido "como está" e "conforme disponível".
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Cadastro e Conta</h2>
            <p>
              Para utilizar o Fintax Finanças, você deve criar uma conta fornecendo informações 
              precisas e completas. Você é responsável por manter a confidencialidade de sua 
              senha e por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Uso Adequado</h2>
            <p>Você concorda em:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Não utilizar o serviço para fins ilegais ou não autorizados</li>
              <li>Não tentar acessar áreas não autorizadas do sistema</li>
              <li>Não interferir ou interromper o funcionamento do serviço</li>
              <li>Não compartilhar sua conta com terceiros</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Planos e Pagamentos</h2>
            <p>
              O Fintax Finanças oferece planos gratuitos e pagos. Os valores e recursos de cada 
              plano estão descritos em nossa página de preços. Pagamentos são processados de 
              forma segura através de nossos parceiros de pagamento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Cancelamento</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, você 
              continuará tendo acesso aos recursos pagos até o final do período já pago, após 
              o qual sua conta será convertida para o plano gratuito.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código e funcionalidades do Fintax Finanças são de 
              propriedade exclusiva do desenvolvedor e estão protegidos por leis de direitos 
              autorais e propriedade intelectual.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Limitação de Responsabilidade</h2>
            <p>
              O Fintax Finanças não se responsabiliza por decisões financeiras tomadas com 
              base nas informações ou análises fornecidas pelo serviço. As informações são 
              apenas para fins informativos e não constituem aconselhamento financeiro 
              profissional.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. 
              Alterações significativas serão comunicadas aos usuários por e-mail ou 
              através de notificação no aplicativo.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato através do nosso suporte 
              ou pelo Instagram{' '}
              <a 
                href="https://www.instagram.com/kaleby.fn/"
                target="_blank"
                rel="noopener noreferrer external"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://www.instagram.com/kaleby.fn/', '_blank', 'noopener,noreferrer');
                }}
                className="text-primary hover:underline"
              >
                @kaleby.fn
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t mt-12">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fintax Finanças. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
