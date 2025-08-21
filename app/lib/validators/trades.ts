import { z } from 'zod';

export const createTradeSchema = z.object({
  toTeamId: z.number().positive('ID team destinazione deve essere positivo'),
  playerFromId: z.number().positive('ID giocatore mittente deve essere positivo'),
  playerToId: z.number().positive('ID giocatore destinazione deve essere positivo'),
  credits: z.number().min(0, 'I crediti non possono essere negativi').default(0)
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
