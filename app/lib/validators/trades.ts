// app/lib/validators/trades.ts
import { z } from 'zod';

export const createTradeSchema = z.object({
  toTeamId: z.number().positive('ID team destinazione deve essere positivo'),
  playersFrom: z.array(z.number().positive('ID giocatore mittente deve essere positivo'))
    .min(1, 'Devi selezionare almeno un giocatore da cedere')
    .max(5, 'Puoi scambiare al massimo 5 giocatori'),
  playersTo: z.array(z.number().positive('ID giocatore destinazione deve essere positivo'))
    .min(1, 'Devi selezionare almeno un giocatore da ricevere')
    .max(5, 'Puoi scambiare al massimo 5 giocatori'),
  credits: z.number().min(0, 'I crediti non possono essere negativi').default(0)
}).refine((data) => {
  // Verifica che il numero di giocatori sia equilibrato per ruolo
  return data.playersFrom.length === data.playersTo.length;
}, {
  message: 'Il numero di giocatori ceduti deve essere uguale a quello ricevuto',
  path: ['playersTo']
});

export const updateTradeSchema = z.object({
  action: z.enum(['accept', 'reject'], {
    message: 'Azione deve essere accept o reject'
  })
});

export const tradeFilterSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'APPROVED']).optional(),
  type: z.enum(['incoming', 'outgoing', 'all']).optional().default('all'),
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().max(100).optional().default(20)
});

// Schema per validare i giocatori per ruolo
export const roleBalanceSchema = z.object({
  playersFrom: z.array(z.object({
    id: z.number(),
    role: z.string()
  })),
  playersTo: z.array(z.object({
    id: z.number(),
    role: z.string()
  }))
}).refine((data) => {
  // Raggruppa giocatori per ruolo
  const fromRoles = data.playersFrom.reduce((acc, player) => {
    acc[player.role] = (acc[player.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const toRoles = data.playersTo.reduce((acc, player) => {
    acc[player.role] = (acc[player.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Verifica che per ogni ruolo il numero sia bilanciato
  const allRoles = new Set([...Object.keys(fromRoles), ...Object.keys(toRoles)]);
  
  for (const role of allRoles) {
    if ((fromRoles[role] || 0) !== (toRoles[role] || 0)) {
      return false;
    }
  }
  
  return true;
}, {
  message: 'Il numero di giocatori per ruolo deve essere bilanciato (stesso numero di portieri, difensori, etc.)'
});