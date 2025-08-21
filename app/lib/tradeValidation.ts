// app/lib/utils/tradeValidation.ts - Utility per validazione trade
import { PrismaClient, Team, Player } from '@prisma/client';

const prisma = new PrismaClient();

export interface TradeValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateTradeRequest(
  fromTeamId: number,
  toTeamId: number,
  playerFromId: number,
  playerToId: number,
  credits: number
): Promise<TradeValidationResult> {
  try {
    // Verifica che i team esistano
    const [fromTeam, toTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: fromTeamId } }),
      prisma.team.findUnique({ where: { id: toTeamId } })
    ]);

    if (!fromTeam) {
      return { isValid: false, error: 'Team mittente non trovato' };
    }

    if (!toTeam) {
      return { isValid: false, error: 'Team destinazione non trovato' };
    }

    // Verifica che non sia lo stesso team
    if (fromTeamId === toTeamId) {
      return { isValid: false, error: 'Non puoi scambiare con te stesso' };
    }

    // Verifica crediti sufficienti
    if (credits > fromTeam.credits) {
      return { isValid: false, error: 'Crediti insufficienti' };
    }

    // Verifica che il team mittente abbia il giocatore
    const teamPlayerFrom = await prisma.teamPlayer.findFirst({
      where: {
        teamId: fromTeamId,
        playerId: playerFromId
      }
    });

    if (!teamPlayerFrom) {
      return { isValid: false, error: 'Giocatore non trovato nella tua rosa' };
    }

    // Verifica che il team destinazione abbia il giocatore
    const teamPlayerTo = await prisma.teamPlayer.findFirst({
      where: {
        teamId: toTeamId,
        playerId: playerToId
      }
    });

    if (!teamPlayerTo) {
      return { isValid: false, error: 'Giocatore non trovato nella rosa del team destinazione' };
    }

    // Verifica che i giocatori esistano e abbiano lo stesso ruolo
    const [playerFrom, playerTo] = await Promise.all([
      prisma.player.findUnique({ where: { id: playerFromId } }),
      prisma.player.findUnique({ where: { id: playerToId } })
    ]);

    if (!playerFrom) {
      return { isValid: false, error: 'Giocatore mittente non trovato' };
    }

    if (!playerTo) {
      return { isValid: false, error: 'Giocatore destinazione non trovato' };
    }

    if (playerFrom.role !== playerTo.role) {
      return { isValid: false, error: 'I giocatori devono avere lo stesso ruolo' };
    }

    // Per scambi globali (gironi diversi), verifica che non sia lo stesso giocatore
    if (fromTeam.girone !== toTeam.girone && playerFromId === playerToId) {
      return { isValid: false, error: 'Non puoi scambiare lo stesso giocatore in scambi tra gironi diversi' };
    }

    // Verifica che non ci sia già un trade pending tra gli stessi giocatori
    const existingTrade = await prisma.trade.findFirst({
      where: {
        OR: [
          {
            fromTeamId,
            toTeamId,
            playerFromId,
            playerToId,
            status: 'PENDING'
          },
          {
            fromTeamId: toTeamId,
            toTeamId: fromTeamId,
            playerFromId: playerToId,
            playerToId: playerFromId,
            status: 'PENDING'
          }
        ]
      }
    });

    if (existingTrade) {
      return { isValid: false, error: 'Esiste già un trade pending per questi giocatori' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Trade validation error:', error);
    return { isValid: false, error: 'Errore nella validazione del trade' };
  }
}

export async function checkTradePhaseOpen(): Promise<TradeValidationResult> {
  try {
    const tradePhase = await prisma.tradePhase.findFirst({
      orderBy: { id: 'desc' }
    });

    if (!tradePhase) {
      return { isValid: false, error: 'Nessuna fase di scambio configurata' };
    }

    if (tradePhase.status === 'CLOSED') {
      return { isValid: false, error: 'Le fasi di scambio sono attualmente chiuse' };
    }

    const now = new Date();
    
    if (tradePhase.startTime && now < tradePhase.startTime) {
      return { 
        isValid: false, 
        error: `Le fasi di scambio inizieranno il ${tradePhase.startTime.toLocaleDateString('it-IT')}` 
      };
    }

    if (tradePhase.endTime && now > tradePhase.endTime) {
      return { 
        isValid: false, 
        error: `Le fasi di scambio sono terminate il ${tradePhase.endTime.toLocaleDateString('it-IT')}` 
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Trade phase check error:', error);
    return { isValid: false, error: 'Errore nella verifica delle fasi di scambio' };
  }
}