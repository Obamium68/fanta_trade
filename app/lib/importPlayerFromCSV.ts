import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

import Papa from "papaparse";
import fs from "fs";
import { RolePlayer } from "@prisma/client";

const roleMap: Record<string, RolePlayer> = {
  P: RolePlayer.PORTIERE,
  D: RolePlayer.DIFENSORE,
  C: RolePlayer.CENTROCAMPISTA,
  A: RolePlayer.ATTACCANTE,
};

type CsvPlayer = {
  id: string;
  ruolo: string;
  cognome: string;
  squadra: string;
};

export async function importPlayersFromCsv(filePath: string) {
  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<CsvPlayer>(file, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
  }

  for (const row of parsed.data) {

    const prisma = new PrismaClient().$extends(withAccelerate())
    const id = parseInt(row.id, 10);
    if (!id || !roleMap[row.ruolo]) {
      console.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
      continue;
    }

    await prisma.player.upsert({
      where: { id },
      update: {
        lastname: row.cognome.trim(),
        realteam: row.squadra.trim(),
        role: roleMap[row.ruolo],
      },
      create: {
        id,
        lastname: row.cognome.trim(),
        realteam: row.squadra.trim(),
        role: roleMap[row.ruolo],
      },
    });
  }

  return { message: "Import completed" };
}
