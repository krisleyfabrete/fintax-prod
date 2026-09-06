type ViolationLevel = 'none' | 'warning' | 'blocked';

export interface ModerationResult {
  level: ViolationLevel;
  reason?: string;
  blockedUntil?: number;
  remainingWarnings?: number;
}

const VIOLATION_KEY = 'fintax_ai_violations';
const BLOCK_KEY = 'fintax_ai_block';
const MAX_WARNINGS = 3;
const WARNING_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BLOCK_DURATIONS = [
  1 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];

const OFFENSIVE_PATTERNS = [
  /\b(matar|suicídio|suicidio|bater|agredir|violência|roubar|fraude|hackear|hack|drogas|arma|terror|terrorista|bomba|matar)\b/i,
  /\b(prostituta|puta|merda|caralho|foda|cacete|viado|bicha|traveco|retardado|imbecil|idiota|burro|estúpido|estupido)\b/i,
  /\b(pornô|pornografia|nudez|sexo|transar|corno|puta|prostituta|vagabundo|lixo|verme)\b/i,
  /\b(roubo|assalto|fraude|golpe|esquema|lavagem|desviar|subornar|corromper)\b/i,
];

const HARMFUL_INTENTIONS = [
  /como (?:posso|faço|consigo) (?:roubar|hackear|fraudar|enganar|burlar|iludir)/i,
  /(?:quero|preciso|gostaria de) (?:roubar|hackear|fraudar|enganar|burlar)/i,
  /(?:matar|agredir|bater|suicidar|matar alguem)/i,
  /(?:comprar|vender|traficar|conseguir) (?:drogas|arma|bomba)/i,
];

function getViolations(): { count: number; lastAt: number | null } {
  try {
    const raw = localStorage.getItem(VIOLATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, lastAt: null };
}

function saveViolations(data: { count: number; lastAt: number | null }) {
  try {
    localStorage.setItem(VIOLATION_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function getBlock(): { until: number; reason: string } | null {
  try {
    const raw = localStorage.getItem(BLOCK_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Date.now() < data.until) return data;
      localStorage.removeItem(BLOCK_KEY);
    }
  } catch { /* ignore */ }
  return null;
}

function setBlock(until: number, reason: string) {
  try {
    localStorage.setItem(BLOCK_KEY, JSON.stringify({ until, reason }));
  } catch { /* ignore */ }
}

export function checkModeration(message: string): ModerationResult {
  const block = getBlock();
  if (block) {
    const remaining = Math.ceil((block.until - Date.now()) / (1000 * 60));
    return {
      level: 'blocked',
      reason: `Acesso à IA bloqueado temporariamente. Motivo: ${block.reason}. Tempo restante: ${remaining} minutos.`,
      blockedUntil: block.until,
    };
  }

  for (const pattern of OFFENSIVE_PATTERNS) {
    if (pattern.test(message)) {
      const violations = getViolations();
      const newCount = violations.count + 1;
      saveViolations({ count: newCount, lastAt: Date.now() });

      if (newCount >= MAX_WARNINGS) {
        const blockIndex = Math.min(newCount - MAX_WARNINGS, BLOCK_DURATIONS.length - 1);
        const until = Date.now() + BLOCK_DURATIONS[blockIndex];
        setBlock(until, 'Conteúdo ofensivo recorrente');
        return {
          level: 'blocked',
          reason: `Você atingiu o limite de advertências (${MAX_WARNINGS}). Acesso à IA bloqueado por ${Math.ceil(BLOCK_DURATIONS[blockIndex] / (1000 * 60))} minutos. Lembre-se: a IA é uma ferramenta para sua educação financeira e bem-estar.`,
          blockedUntil: until,
        };
      }

      return {
        level: 'warning',
        reason: `Advertência ${newCount}/${MAX_WARNINGS}: Linguagem inapropriada detectada. Lembre-se: a IA é uma ferramenta para sua educação financeira e desenvolvimento pessoal. Após ${MAX_WARNINGS} advertências, o acesso será bloqueado temporariamente.`,
        remainingWarnings: MAX_WARNINGS - newCount,
      };
    }
  }

  for (const pattern of HARMFUL_INTENTIONS) {
    if (pattern.test(message)) {
      const violations = getViolations();
      const newCount = violations.count + 1;
      saveViolations({ count: newCount, lastAt: Date.now() });

      if (newCount >= MAX_WARNINGS) {
        const blockIndex = Math.min(newCount - MAX_WARNINGS, BLOCK_DURATIONS.length - 1);
        const until = Date.now() + BLOCK_DURATIONS[blockIndex];
        setBlock(until, 'Intenção danosa recorrente');
        return {
          level: 'blocked',
          reason: `Você atingiu o limite de advertências (${MAX_WARNINGS}). Acesso à IA bloqueado por ${Math.ceil(BLOCK_DURATIONS[blockIndex] / (1000 * 60))} minutos.`,
          blockedUntil: until,
        };
      }

      return {
        level: 'warning',
        reason: `Advertência ${newCount}/${MAX_WARNINGS}: Não posso ajudar com ações que prejudicam você ou outras pessoas. Minha função é apoiar sua saúde financeira e bem-estar.`,
        remainingWarnings: MAX_WARNINGS - newCount,
      };
    }
  }

  return { level: 'none' };
}

export function clearViolations() {
  try {
    localStorage.removeItem(VIOLATION_KEY);
    localStorage.removeItem(BLOCK_KEY);
  } catch { /* ignore */ }
}

export function getRemainingBlockTime(): number {
  const block = getBlock();
  if (!block) return 0;
  return Math.max(0, block.until - Date.now());
}
