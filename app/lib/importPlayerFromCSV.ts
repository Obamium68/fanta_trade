//app/lib/importPlayerFromCSV.ts
import { NextRequest, NextResponse } from 'next/server';
import { Girone } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';

const prisma = new PrismaClient();

interface CSVRow {
  nome?: string;
  password: string;
  girone: Girone;
  nome_membro1: string;
  email_membro1?: string;
  telefono_membro1: string;
  nome_membro2?: string;
  email_membro2?: string;
  telefono_membro2?: string;
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
   
    const parseResult = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Errore nel parsing del CSV', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Contatore per squadre senza nome
    let teamCounter = 1;

    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (const [index, row] of parseResult.data.entries()) {
      try {
        // Validate required fields
        if (!row.password || !row.girone) {
          results.errors.push(`Riga ${index + 2}: Password e girone sono obbligatori`);
          continue;
        }

        if (!["A", "B", "C"].includes(row.girone)) {
          results.errors.push(`Riga ${index + 2}: Girone non valido`);
          continue;
        }

        // Se il nome della squadra non è presente, genera "Squadra X"
        let teamName = row.nome;
        if (!teamName || teamName.trim() === '') {
          teamName = `Squadra ${teamCounter}`;
          teamCounter++;
        }

        // Check if team already exists
        const existingTeam = await prisma.team.findUnique({
          where: { name: teamName }
        });

        if (existingTeam) {
          results.errors.push(`Riga ${index + 2}: Squadra "${teamName}" già esistente`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(row.password, 12);

        const gironeMap = {
          "A": Girone.A,
          "B": Girone.B,
          "C": Girone.C,
        };

        // Prepara i membri da creare
        const membersToCreate = [];

        // Primo membro (obbligatorio)
        membersToCreate.push({
          name: row.nome_membro1,
          email: row.email_membro1 || 'placeholder@mail.com',
          phone: row.telefono_membro1,
        });

        // Secondo membro (opzionale)
        if (row.nome_membro2 && row.nome_membro2.trim() !== '') {
          membersToCreate.push({
            name: row.nome_membro2,
            email: row.email_membro2 || 'placeholder@mail.com',
            phone: row.telefono_membro2 || '',
          });
        }

        // Create team
        await prisma.team.create({
          data: {
            name: teamName,
            passwordHash,
            girone: gironeMap[row.girone],
            members: {
              create: membersToCreate
            }
          }
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Riga ${index + 2}: Errore durante la creazione`);
        console.error(`Error processing row ${index + 2}:`, error);
      }
    }

    return NextResponse.json({
      message: `Import completato: ${results.success} squadre create`,
      success: results.success,
      errors: results.errors
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}