import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

export default function Privacy() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: Dezembro de 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introdução</h2>
            <p>
              A sua privacidade é importante para nós. Esta Política de Privacidade explica 
              como o Fintax Finanças coleta, usa, divulga e protege suas informações pessoais 
              quando você utiliza nosso serviço.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Informações que Coletamos</h2>
            <p>Coletamos as seguintes categorias de informações:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informações de Cadastro:</strong> Nome, e-mail, telefone</li>
              <li><strong>Dados Financeiros:</strong> Transações, contas, orçamentos e metas que você registra voluntariamente</li>
              <li><strong>Dados de Uso:</strong> Como você interage com o aplicativo</li>
              <li><strong>Informações do Dispositivo:</strong> Tipo de dispositivo, sistema operacional, navegador</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Como Usamos suas Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer e manter o serviço</li>
              <li>Personalizar sua experiência</li>
              <li>Gerar análises e insights financeiros</li>
              <li>Processar pagamentos de assinaturas</li>
              <li>Enviar comunicações importantes sobre o serviço</li>
              <li>Melhorar nosso serviço com base no uso</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger 
              suas informações, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Autenticação segura</li>
              <li>Acesso restrito aos dados</li>
              <li>Monitoramento de segurança contínuo</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Compartilhamento de Dados</h2>
            <p>
              Não vendemos suas informações pessoais. Podemos compartilhar dados apenas nas 
              seguintes circunstâncias:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Com provedores de serviço que nos ajudam a operar o aplicativo</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger nossos direitos legais</li>
              <li>Com seu consentimento explícito</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Seus Direitos</h2>
            <p>De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimentos dados anteriormente</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário 
              para fornecer o serviço. Após a exclusão da conta, seus dados serão removidos 
              em até 30 dias, exceto quando houver obrigação legal de retenção.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
              analisar o uso do serviço e personalizar conteúdo. Você pode gerenciar suas 
              preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos 
              sobre alterações significativas através do aplicativo ou por e-mail.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Contato</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, 
              entre em contato através do nosso suporte ou pelo Instagram{' '}
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
