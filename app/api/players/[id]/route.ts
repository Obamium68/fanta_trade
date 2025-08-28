// app/api/players/[id]/route.ts
import { PlayerUpdateRequest, PlayerUpdateResponse, PlayerRole } from '@/app/lib/types/players';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Utility function per mappare il ruolo dal database al tipo interfaccia
const mapRoleToPlayerRole = (role: string): PlayerRole => {
  switch (role) {
    case 'PORTIERE': return PlayerRole.P;
    case 'DIFENSORE': return PlayerRole.D;
    case 'CENTROCAMPISTA': return PlayerRole.C;
    case 'ATTACCANTE': return PlayerRole.A;
    default: return PlayerRole.P; // Default to PORTIERE if unknown
  }
};

// Utility function per mappare il ruolo dall'interfaccia al database
const mapPlayerRoleToDbRole = (role: string) => {
  switch (role) {
    case 'P': return 'PORTIERE';
    case 'D': return 'DIFENSORE';
    case 'C': return 'CENTROCAMPISTA';
    case 'A': return 'ATTACCANTE';
    default: return 'PORTIERE';
  }
};

// Utility function per ottenere i dati del player con join
const getPlayerWithTeamsInfo = async (playerId: number) => {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              girone: true
            }
          }
        }
      }
    }
  });

  if (!player) return null;

  // Mappiamo i dati al formato dell'interfaccia Player
  return {
    id: player.id,
    lastname: player.lastname,
    realteam: player.realteam,
    value: player.value,
    role: mapRoleToPlayerRole(player.role),
    teamsIn: player.teams.map(teamPlayer => ({
      id: teamPlayer.team.id,
      name: teamPlayer.team.name,
      girone: teamPlayer.team.girone
    })),
    teamsCount: player.teamsCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

/**
 * GET /api/players/[id]
 * Recupera un player specifico con le sue informazioni e le squadre in cui è presente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'ID player non valido' },
        { status: 400 }
      );
    }

    const player = await getPlayerWithTeamsInfo(playerId);

    if (!player) {
      return NextResponse.json(
        { error: 'Player non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(player);

  } catch (error) {
    console.error('Errore durante il recupero del player:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}


// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const playerId = parseInt(id);
    
//     if (isNaN(playerId)) {
//       return NextResponse.json(
//         { error: 'ID player non valido' },
//         { status: 400 }
//       );
//     }

//     // Trova il player con tutte le relazioni necessarie
//     const existingPlayer = await prisma.player.findUnique({
//       where: { id: playerId },
//       include: {
//         teams: true,
//         tradePlayers: {
//           include: {
//             trade: true
//           }
//         }
//       }
//     });

//     if (!existingPlayer) {
//       return NextResponse.json(
//         { error: 'Player non trovato' },
//         { status: 404 }
//       );
//     }

//     // Verifica se ci sono trade pendenti che coinvolgono questo giocatore
//     const pendingTrades = existingPlayer.tradePlayers
//       .filter(tp => tp.trade.status === 'PENDING' || tp.trade.status === 'ACCEPTED')
//       .map(tp => tp.trade);

//     if (pendingTrades.length > 0) {
//       const tradeIds = [...new Set(pendingTrades.map(t => t.id))];
//       return NextResponse.json(
//         { 
//           error: `Impossibile eliminare il player: è coinvolto in ${tradeIds.length} trade pendenti/accettati (IDs: ${tradeIds.join(', ')})` 
//         },
//         { status: 400 }
//       );
//     }

//     // Verifica se il player è in qualche rosa attiva
//     if (existingPlayer.teams.length > 0) {
//       const teamNames = existingPlayer.teams.map(t => t.name).join(', ');
//       return NextResponse.json(
//         { 
//           error: `Impossibile eliminare il player: è ancora presente nelle rose di: ${teamNames}` 
//         },
//         { status: 400 }
//       );
//     }

//     await prisma.$transaction(async (tx) => {
//       // Elimina prima i record TradePlayer (se esistono trade completati)
//       await tx.tradePlayer.deleteMany({
//         where: { playerId }
//       });

//       // Elimina le relazioni TeamPlayer (dovrebbero essere già 0 dal controllo sopra)
//       await tx.teamPlayer.deleteMany({
//         where: { playerId }
//       });

//       // Elimina il player
//       await tx.player.delete({
//         where: { id: playerId }
//       });
//     });

//     console.log(`Player ${existingPlayer.lastname} (ID: ${playerId}) eliminato con successo`);

//     return NextResponse.json({
//       message: 'Player eliminato con successo',
//       playerId,
//       playerName: existingPlayer.lastname
//     });

//   } catch (error) {
//     console.error('Errore durante l\'eliminazione del player:', error);
    
//     // Gestisci errori specifici di Prisma
//     if (error.code === 'P2003') {
//       return NextResponse.json(
//         { error: 'Impossibile eliminare: il player ha ancora dipendenze nel database' },
//         { status: 400 }
//       );
//     }
    
//     if (error.code === 'P2025') {
//       return NextResponse.json(
//         { error: 'Player non trovato o già eliminato' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       { error: 'Errore interno del server' },
//       { status: 500 }
//     );
//   }
// }

/**
 * PATCH /api/players/[id]
 * Aggiorna parzialmente un player (solo il valore secondo PlayerUpdateRequest)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'ID player non valido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { value } = body as PlayerUpdateRequest;

    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json(
        { error: 'Il valore deve essere un numero positivo' },
        { status: 400 }
      );
    }

    // Verifica se il player esiste
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna solo il valore
    await prisma.player.update({
      where: { id: playerId },
      data: { value }
    });

    // Ottieni i dati aggiornati con le relazioni
    const updatedPlayer = await getPlayerWithTeamsInfo(playerId);

    const response: PlayerUpdateResponse = {
      message: 'Player aggiornato con successo',
      player: updatedPlayer!
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Errore durante l\'aggiornamento parziale del player:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/players/[id]
 * Sostituisce completamente un player (tutti i campi modificabili)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'ID player non valido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { lastname, realteam, value, role } = body;

    // Validazione dei dati richiesti
    if (!lastname || !realteam || typeof value !== 'number' || !role) {
      return NextResponse.json(
        { error: 'Tutti i campi sono richiesti: lastname, realteam, value, role' },
        { status: 400 }
      );
    }

    if (value < 0) {
      return NextResponse.json(
        { error: 'Il valore deve essere un numero positivo' },
        { status: 400 }
      );
    }

    if (!['P', 'D', 'C', 'A'].includes(role)) {
      return NextResponse.json(
        { error: 'Ruolo non valido. Valori accettati: P, D, C, A' },
        { status: 400 }
      );
    }

    // Verifica se il player esiste
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna tutti i campi del player
    await prisma.player.update({
      where: { id: playerId },
      data: {
        lastname,
        realteam,
        value,
        role: mapPlayerRoleToDbRole(role)
      }
    });

    // Ottieni i dati aggiornati con le relazioni
    const updatedPlayer = await getPlayerWithTeamsInfo(playerId);

    const response: PlayerUpdateResponse = {
      message: 'Player sostituito con successo',
      player: updatedPlayer!
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Errore durante la sostituzione del player:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}