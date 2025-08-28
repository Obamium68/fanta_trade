import { PrismaClient, TradeStatus, TradeDirection } from '@prisma/client';

const prisma = new PrismaClient();

export interface TradeValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateTradeRequest(
  fromTeamId: number,
  toTeamId: number,
  playersFromIds: number[],
  playersToIds: number[],
  credits: number
): Promise<TradeValidationResult> {
  try {
    // 1. Verifica che i team esistano
    const [fromTeam, toTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: fromTeamId } }),
      prisma.team.findUnique({ where: { id: toTeamId } }),
    ]);

    if (!fromTeam) return { isValid: false, error: 'Team mittente non trovato' };
    if (!toTeam) return { isValid: false, error: 'Team destinazione non trovato' };

    // 2. Non puoi scambiare con te stesso
    if (fromTeamId === toTeamId) {
      return { isValid: false, error: 'Non puoi scambiare con te stesso' };
    }

    // 3. Verifica crediti
    if (credits > fromTeam.credits) {
      return { isValid: false, error: 'Crediti insufficienti' };
    }

    // 4. Verifica che il team mittente abbia tutti i giocatori che vuole dare
    const fromTeamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: fromTeamId, playerId: { in: playersFromIds } },
    });
    if (fromTeamPlayers.length !== playersFromIds.length) {
      return { isValid: false, error: 'Alcuni giocatori da cedere non appartengono al tuo team' };
    }

    // 5. Verifica che il team destinatario abbia tutti i giocatori che vuole dare
    const toTeamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: toTeamId, playerId: { in: playersToIds } },
    });
    if (toTeamPlayers.length !== playersToIds.length) {
      return { isValid: false, error: 'Alcuni giocatori da ricevere non appartengono al team destinazione' };
    }

    // 6. Controllo dei ruoli: ogni giocatore da scambiare deve essere dello stesso ruolo del corrispettivo
    const allPlayers = await prisma.player.findMany({
      where: { id: { in: [...playersFromIds, ...playersToIds] } },
    });

    const playersFrom = allPlayers.filter(p => playersFromIds.includes(p.id));
    const playersTo = allPlayers.filter(p => playersToIds.includes(p.id));

    if (playersFrom.length !== playersFromIds.length || playersTo.length !== playersToIds.length) {
      return { isValid: false, error: 'Alcuni giocatori non esistono' };
    }

    // Se si vuole imporre che i ruoli siano sempre uguali 1:1, fai un controllo per indice
    if (playersFromIds.length === playersToIds.length) {
      for (let i = 0; i < playersFrom.length; i++) {
        if (playersFrom[i].role !== playersTo[i].role) {
          return { isValid: false, error: 'I giocatori scambiati devono avere ruoli corrispondenti' };
        }
      }
    }

    // 7. Controllo tra gironi diversi → no scambio dello stesso giocatore
    if (fromTeam.girone !== toTeam.girone) {
      const samePlayers = playersFromIds.some(id => playersToIds.includes(id));
      if (samePlayers) {
        return { isValid: false, error: 'Non puoi scambiare lo stesso giocatore tra gironi diversi' };
      }
    }

    // 8. Verifica che non ci sia già un trade pendente con questi giocatori
    const existingTrade = await prisma.trade.findFirst({
      where: {
        status: TradeStatus.PENDING,
        OR: [
          {
            fromTeamId,
            toTeamId,
            tradePlayers: {
              some: { playerId: { in: [...playersFromIds, ...playersToIds] } },
            },
          },
          {
            fromTeamId: toTeamId,
            toTeamId: fromTeamId,
            tradePlayers: {
              some: { playerId: { in: [...playersFromIds, ...playersToIds] } },
            },
          },
        ],
      },
    });

    if (existingTrade) {
      return { isValid: false, error: 'Esiste già un trade pendente con almeno uno di questi giocatori' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Trade validation error:', error);
    return { isValid: false, error: 'Errore nella validazione del trade' };
  }
}

// Verifica se le fasi di scambio sono aperte
export async function checkTradePhaseOpen(): Promise<TradeValidationResult> {
  try {
    const tradePhase = await prisma.tradePhase.findFirst({
      orderBy: { id: 'desc' },
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
        error: `Le fasi di scambio inizieranno il ${tradePhase.startTime.toLocaleDateString('it-IT')}`,
      };
    }

    if (tradePhase.endTime && now > tradePhase.endTime) {
      return {
        isValid: false,
        error: `Le fasi di scambio sono terminate il ${tradePhase.endTime.toLocaleDateString('it-IT')}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Trade phase check error:', error);
    return { isValid: false, error: 'Errore nella verifica delle fasi di scambio' };
  }
}
