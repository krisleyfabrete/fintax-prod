/**
 * Gerador de código PIX EMV dinâmico
 * Implementa o padrão EMV QR Code conforme especificação do Banco Central do Brasil
 */

export interface PixConfig {
  pixKey: string;
  pixName: string;
  pixCity: string;
}

export interface PixPaymentData {
  amount: number;
  description?: string;
  txId?: string;
}

/**
 * Calcula o CRC16-CCITT conforme especificação EMV
 * Polinômio: 0x1021, Valor inicial: 0xFFFF
 */
function calculateCRC16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo EMV com ID e valor
 */
function formatEMVField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Formata o valor monetário para o padrão PIX (2 casas decimais)
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Remove caracteres especiais e acentos para o padrão PIX
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .substring(0, 25); // Limite de 25 caracteres para nome/cidade
}

/**
 * Gera o código PIX EMV completo
 */
export function generatePixCode(config: PixConfig, payment: PixPaymentData): string {
  // 00 - Payload Format Indicator
  let payload = formatEMVField('00', '01');

  // 01 - Point of Initiation Method (12 = dinâmico, com valor)
  payload += formatEMVField('01', '12');

  // 26 - Merchant Account Information (PIX)
  let merchantAccount = '';
  // 00 - GUI (identificador do arranjo)
  merchantAccount += formatEMVField('00', 'br.gov.bcb.pix');
  // 01 - Chave PIX
  merchantAccount += formatEMVField('01', config.pixKey);
  // 02 - Descrição (opcional)
  if (payment.description) {
    const desc = payment.description.substring(0, 50);
    merchantAccount += formatEMVField('02', desc);
  }
  payload += formatEMVField('26', merchantAccount);

  // 52 - Merchant Category Code
  payload += formatEMVField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatEMVField('53', '986');

  // 54 - Transaction Amount
  if (payment.amount > 0) {
    payload += formatEMVField('54', formatAmount(payment.amount));
  }

  // 58 - Country Code
  payload += formatEMVField('58', 'BR');

  // 59 - Merchant Name
  payload += formatEMVField('59', normalizeText(config.pixName));

  // 60 - Merchant City
  payload += formatEMVField('60', normalizeText(config.pixCity));

  // 62 - Additional Data Field Template
  if (payment.txId) {
    let additionalData = '';
    // 05 - Reference Label (txId)
    additionalData += formatEMVField('05', payment.txId.substring(0, 25));
    payload += formatEMVField('62', additionalData);
  }

  // 63 - CRC16 (placeholder para cálculo)
  payload += '6304';

  // Calcula e adiciona o CRC16
  const crc = calculateCRC16(payload);
  payload = payload.slice(0, -4) + crc;

  // Adiciona o ID e tamanho do CRC
  const finalPayload = payload.slice(0, -4) + formatEMVField('63', payload.slice(-4));

  return finalPayload;
}

/**
 * Valida se um código PIX tem CRC16 válido
 */
export function validatePixCode(code: string): boolean {
  if (code.length < 8) return false;

  // Remove o CRC atual
  const payloadWithoutCRC = code.slice(0, -4);
  // Adiciona placeholder para recalcular
  const payloadForCRC = payloadWithoutCRC + '6304';
  const calculatedCRC = calculateCRC16(payloadForCRC);
  const originalCRC = code.slice(-4);

  return calculatedCRC === originalCRC;
}
