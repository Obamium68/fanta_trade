import z from "zod";
import { memberSchema } from "./member";

export const teamRegistrationSchema = z.object({
  name: z.string().min(1, 'Nome squadra richiesto'),
  password: z.string().min(6, 'Password deve essere almeno 6 caratteri'),
  girone: z.enum(['A', 'B', 'C']),
  members: z.array(memberSchema).min(1, 'Almeno 1 membro richiesto'),
});
