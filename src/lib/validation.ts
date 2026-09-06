import { z } from 'zod';

// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Validação de telefone brasileiro
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita telefones com 10 ou 11 dígitos (fixo ou celular com DDD)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

// Validação de email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Schema de validação do perfil
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  cpf: z.string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, '').length === 0 || validateCPF(val), {
      message: 'CPF inválido',
    }),
  phone: z.string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, '').length === 0 || validatePhone(val), {
      message: 'Telefone inválido (deve ter 10 ou 11 dígitos)',
    }),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  date_format: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
