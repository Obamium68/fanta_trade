import z from "zod";

export const memberSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  phone: z.string().min(1, 'Telefono richiesto'),
});