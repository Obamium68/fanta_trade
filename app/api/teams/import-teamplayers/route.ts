    // app/api/admin/import-teamplayers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';

const prisma = new PrismaClient();

interface TeamPlayerCSVRow {
  idSquadra: string;
  idGiocatore: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File CSV richiesto' },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const parseResult = Papa.parse<TeamPlayerCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      transform: (value: string) => value.trim() // Rimuove spazi extra
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Errore nel parsing del CSV', details: parseResult.errors },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validazione e elaborazione dei dati
    const validTeamPlayers = [];
    const processedPairs = new Set<string>(); // Per evitare duplicati nel CSV stesso

    for (const [index, row] of parseResult.data.entries()) {
      try {
        const lineNumber = index + 2; // +2 perché iniziamo da 1 e saltiamo l'header

        // Validazione campi obbligatori
        if (!row.idSquadra || !row.idGiocatore) {
          results.errors.push(`Riga ${lineNumber}: idSquadra e idGiocatore sono obbligatori`);
          continue;
        }

        // Conversione a numeri
        const teamId = parseInt(row.idSquadra);
        const playerId = parseInt(row.idGiocatore);

        if (isNaN(teamId) || isNaN(playerId)) {
          results.errors.push(`Riga ${lineNumber}: ID non validi - idSquadra: ${row.idSquadra}, idGiocatore: ${row.idGiocatore}`);
          continue;
        }

        // Verifica duplicati nel CSV stesso
        const pairKey = `${teamId}-${playerId}`;
        if (processedPairs.has(pairKey)) {
          results.warnings.push(`Riga ${lineNumber}: Coppia team-player duplicata nel CSV (${teamId}-${playerId})`);
          continue;
        }
        processedPairs.add(pairKey);

        // Verifica esistenza team
        const team = await prisma.team.findUnique({
          where: { id: teamId }
        });

        if (!team) {
          results.errors.push(`Riga ${lineNumber}: Team con ID ${teamId} non trovato`);
          continue;
        }

        // Verifica esistenza player
        const player = await prisma.player.findUnique({
          where: { id: playerId }
        });

        if (!player) {
          results.errors.push(`Riga ${lineNumber}: Giocatore con ID ${playerId} non trovato`);
          continue;
        }

        // Verifica se la relazione esiste già
        const existingTeamPlayer = await prisma.teamPlayer.findUnique({
          where: {
            teamId_playerId: {
              teamId: teamId,
              playerId: playerId
            }
          }
        });

        if (existingTeamPlayer) {
          results.warnings.push(`Riga ${lineNumber}: Relazione già esistente tra team ${teamId} e giocatore ${playerId}`);
          continue;
        }

        validTeamPlayers.push({
          teamId,
          playerId
        });

      } catch (error) {
        results.errors.push(`Riga ${index + 2}: Errore durante l'elaborazione - ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
        console.error(`Error processing row ${index + 2}:`, error);
      }
    }

    // Inserimento nel database
    if (validTeamPlayers.length > 0) {
      try {
        const insertResult = await prisma.teamPlayer.createMany({
          data: validTeamPlayers,
          skipDuplicates: true
        });

        results.success = insertResult.count;

        // Aggiorna il contatore teamsCount per ogni player coinvolto
        const uniquePlayerIds = [...new Set(validTeamPlayers.map(tp => tp.playerId))];
        
        for (const playerId of uniquePlayerIds) {
          try {
            const teamsCount = await prisma.teamPlayer.count({
              where: { playerId }
            });

            await prisma.player.update({
              where: { id: playerId },
              data: { teamsCount }
            });
          } catch (error) {
            console.error(`Error updating teamsCount for player ${playerId}:`, error);
            results.warnings.push(`Impossibile aggiornare teamsCount per il giocatore ${playerId}`);
          }
        }

      } catch (error) {
        console.error('Database insertion error:', error);
        return NextResponse.json(
          { error: 'Errore durante l\'inserimento nel database', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
          { status: 500 }
        );
      }
    }

    // Prepara il messaggio di risposta
    let message = `Import completato: ${results.success} relazioni team-giocatore create`;
    if (results.warnings.length > 0) {
      message += `, ${results.warnings.length} avvisi`;
    }
    if (results.errors.length > 0) {
      message += `, ${results.errors.length} errori`;
    }

    return NextResponse.json({
      message,
      success: results.success,
      totalProcessed: parseResult.data.length,
      errors: results.errors,
      warnings: results.warnings,
      summary: {
        inserted: results.success,
        skipped: results.warnings.length,
        failed: results.errors.length,
        total: parseResult.data.length
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}