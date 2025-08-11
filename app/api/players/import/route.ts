import { NextResponse } from "next/server";
import Papa from "papaparse";
import { RolePlayer } from "@prisma/client";
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())

const roleMap: Record<string, RolePlayer> = {
  P: RolePlayer.PORTIERE,
  D: RolePlayer.DIFENSORE,
  C: RolePlayer.CENTROCAMPISTA,
  A: RolePlayer.ATTACCANTE,
};

type CsvPlayer = {
  Id: string;
  R: string;
  Nome: string;
  Squadra: string;
};

export async function POST(req: Request) {
  try {
    console.log("🔍 Inizio processo di import...");
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      console.log("❌ Nessun file fornito");
      return NextResponse.json({ error: "File not provided" }, { status: 400 });
    }
    
    console.log(`📁 File ricevuto: ${file.name}, dimensione: ${file.size} bytes`);
    
    const text = await file.text();
    console.log(`📄 Contenuto file (primi 200 caratteri): ${text.substring(0, 200)}...`);
    
    const parsed = Papa.parse<CsvPlayer>(text, {
      header: true,
      skipEmptyLines: true,
    });
    
    console.log(`📊 Righe parsate: ${parsed.data.length}`);
    console.log(`🔍 Prima riga di dati:`, parsed.data[0]);
    console.log(`🔍 Seconda riga di dati:`, parsed.data[1]);
    console.log(`🔍 Headers rilevati da Papa Parse:`, parsed.meta.fields);
    
    // Mostra le prime 3 righe complete per debug
    console.log(`📋 Prime 3 righe complete:`, parsed.data.slice(0, 3));
    
    if (parsed.errors.length > 0) {
      console.log("❌ Errori nel parsing:", parsed.errors);
      return NextResponse.json(
        { error: parsed.errors[0].message },
        { status: 400 }
      );
    }
    
    let processedCount = 0;
    let skippedCount = 0;
    
    // Test connessione database
    console.log("🔗 Test connessione database...");
    try {
      const testQuery = await prisma.player.count();
      console.log(`✅ Database connesso. Giocatori attuali nel DB: ${testQuery}`);
    } catch (dbError) {
      console.error("❌ Errore connessione database:", dbError);
      throw dbError;
    }
    
    for (const [index, row] of parsed.data.entries()) {
      console.log(`\n🔄 Processando riga ${index + 1}:`, row);
      
      // Debug dettagliato per ogni campo
      console.log(`  🔍 ID: "${row.Id}" (tipo: ${typeof row.Id}, vuoto: ${!row.Id})`);
      console.log(`  🔍 Ruolo: "${row.R}" (tipo: ${typeof row.R}, vuoto: ${!row.R})`);
      console.log(`  🔍 Nome: "${row.Nome}" (tipo: ${typeof row.Nome}, vuoto: ${!row.Nome})`);
      console.log(`  🔍 Squadra: "${row.Squadra}" (tipo: ${typeof row.Squadra}, vuoto: ${!row.Squadra})`);
      console.log(`  🔍 Chiavi disponibili nell'oggetto:`, Object.keys(row));
      
      // Verifica che tutti i campi necessari siano presenti
      if (!row.Id || !row.R || !row.Nome) {
        console.log(`⚠️ Riga ${index + 1} saltata: campi mancanti`);
        console.log(`  - ID presente: ${!!row.Id}`);
        console.log(`  - Ruolo presente: ${!!row.R}`);
        console.log(`  - Nome presente: ${!!row.Nome}`);
        skippedCount++;
        continue;
      }
      
      const id = parseInt(row.Id, 10);
      
      if (isNaN(id)) {
        console.log(`⚠️ Riga ${index + 1} saltata: ID non valido (${row.Id})`);
        skippedCount++;
        continue;
      }
      
      if (!roleMap[row.R]) {
        console.log(`⚠️ Riga ${index + 1} saltata: ruolo non valido (${row.R})`);
        console.log(`  - Ruoli disponibili:`, Object.keys(roleMap));
        skippedCount++;
        continue;
      }
      
      try {
        console.log(`💾 Tentativo upsert per ID ${id}...`);
        
        const result = await prisma.player.upsert({
          where: { id },
          update: {
            firstName: row.Nome.trim(),
            lastName: row.Squadra.trim(), // Usando la squadra come cognome
            role: roleMap[row.R],
          },
          create: {
            id,
            firstName: row.Nome.trim(),
            lastName: row.Squadra.trim(), // Usando la squadra come cognome
            role: roleMap[row.R],
          },
        });
        
        console.log(`✅ Giocatore processato con successo:`, {
          id: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role
        });
        
        processedCount++;
        
      } catch (upsertError) {
        console.error(`❌ Errore durante l'upsert del giocatore ID ${id}:`, upsertError);
        throw upsertError;
      }
    }
    
    // Verifica finale del database
    console.log("\n🔍 Verifica finale del database...");
    const finalCount = await prisma.player.count();
    console.log(`📊 Totale giocatori nel DB dopo import: ${finalCount}`);
    
    // Mostra gli ultimi giocatori inseriti/aggiornati
    const recentPlayers = await prisma.player.findMany({
      take: 5,
      orderBy: { id: 'desc' }
    });
    console.log("👥 Ultimi 5 giocatori nel DB:", recentPlayers);
    
    console.log(`✅ Import completato: ${processedCount} giocatori processati, ${skippedCount} righe saltate`);
    
    return NextResponse.json({ 
      message: `Import completato: ${processedCount} giocatori processati, ${skippedCount} righe saltate. Totale giocatori nel DB: ${finalCount}` 
    });
    
  } catch (error: any) {
    console.error("💥 Errore durante l'import:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}