import { APP_VERSION, APP_BUILD_NUMBER } from '@/generated/version';

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

// Gera a versão completa no formato x.xxx.ddMMyyyy
// O build number vem do arquivo gerado (incrementado a cada build)
// A data é sempre a atual, puxada automaticamente em runtime
export function getAppVersion(): string {
  const now = new Date();
  const dd = pad(now.getDate(), 2);
  const MM = pad(now.getMonth() + 1, 2);
  const yyyy = now.getFullYear();
  const dateStr = `${dd}${MM}${yyyy}`;
  return `${APP_BUILD_NUMBER}.${dateStr}`;
}

export { APP_VERSION };
