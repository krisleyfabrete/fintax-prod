export interface Bank {
  code: string;
  name: string;
  color: string;
  logo: string;
}

export const BRAZILIAN_BANKS: Bank[] = [
  { code: 'banestes', name: 'Banestes', color: '#1A4D7C', logo: '/banks/banestes.jpg' },
  { code: 'banrisul', name: 'Banrisul', color: '#00529B', logo: '/banks/banrisul.webp' },
  { code: 'bmg', name: 'BMG', color: '#FF6B00', logo: '/banks/bmg.png' },
  { code: 'bradesco', name: 'Bradesco', color: '#CC092F', logo: '/banks/bradesco.jpeg' },
  { code: 'bb', name: 'Brasil', color: '#FFCC00', logo: '/banks/bb.jpeg' },
  { code: 'btg', name: 'BTG Pactual', color: '#001E60', logo: '/banks/btg.png' },
  { code: 'c6bank', name: 'C6 Bank', color: '#1A1A1A', logo: '/banks/c6bank.jpeg' },
  { code: 'caixa', name: 'Caixa', color: '#005CA9', logo: '/banks/caixa.jpeg' },
  { code: 'clear', name: 'Clear', color: '#00C8B3', logo: '/banks/clear.png' },
  { code: 'digio', name: 'Digio', color: '#0066FF', logo: '/banks/digio.png' },
  { code: 'inter', name: 'Inter', color: '#FF7A00', logo: '/banks/inter.webp' },
  { code: 'itau', name: 'Itaú', color: '#EC7000', logo: '/banks/itau.png' },
  { code: 'iti', name: 'Iti', color: '#FF7700', logo: '/banks/iti.jpeg' },
  { code: 'mercadopago', name: 'Mercado Pago', color: '#00B1EA', logo: '/banks/mercadopago.png' },
  { code: 'modal', name: 'Modal', color: '#1A1A2E', logo: '/banks/modal.png' },
  { code: 'neon', name: 'Neon', color: '#00E5B5', logo: '/banks/neon.jpeg' },
  { code: 'next', name: 'Next', color: '#00FF5F', logo: '/banks/next.jpeg' },
  { code: 'nubank', name: 'Nubank', color: '#820AD1', logo: '/banks/nubank.png' },
  { code: 'original', name: 'Original', color: '#00A651', logo: '/banks/original.jpeg' },
  { code: 'pagbank', name: 'PagBank', color: '#00A650', logo: '/banks/pagbank.png' },
  { code: 'pan', name: 'Pan', color: '#00A4E4', logo: '/banks/pan.png' },
  { code: 'picpay', name: 'PicPay', color: '#21C25E', logo: '/banks/picpay.png' },
  { code: 'rico', name: 'Rico', color: '#FF6600', logo: '/banks/rico.png' },
  { code: 'safra', name: 'Safra', color: '#003366', logo: '/banks/safra.jpeg' },
  { code: 'santander', name: 'Santander', color: '#EC0000', logo: '/banks/santander.jpeg' },
  { code: 'sicoob', name: 'Sicoob', color: '#003641', logo: '/banks/sicoob.png' },
  { code: 'sicredi', name: 'Sicredi', color: '#3FA535', logo: '/banks/sicredi.jpeg' },
  { code: 'sofisa', name: 'Sofisa Direto', color: '#1E3A5F', logo: '/banks/sofisa.png' },
  { code: 'stone', name: 'Stone', color: '#00A868', logo: '/banks/stone.png' },
  { code: 'will', name: 'Will Bank', color: '#FFD100', logo: '/banks/will.png' },
  { code: 'xp', name: 'XP Investimentos', color: '#FFD700', logo: '/banks/xp.png' },
];

export function getBankByCode(code: string): Bank | undefined {
  return BRAZILIAN_BANKS.find(bank => bank.code === code);
}
