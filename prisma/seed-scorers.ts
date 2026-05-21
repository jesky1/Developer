import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("⏳ Memulai pembacaan data API Football dari CSV...");

    const csvFilePath = path.resolve(__dirname, "data/top-scorers.csv");
    const records: any[] = [];

    const parser = fs
        .createReadStream(csvFilePath)
        .pipe(parse({ columns: true, delimiter: ";" }));

    for await (const record of parser) {
        const goals = parseInt(record["Goals total"]) || 0;

        // Ambil semua pemain yang punya gol tanpa batasan nama liga
        if (goals > 0) {
            records.push(record);
        }
    }

    console.log(`📋 Menemukan ${records.length} pemain dengan catatan gol di file CSV.`);

    if (records.length === 0) {
        console.log("⚠️ Tidak ada data gol yang ditemukan. Pastikan file CSV Anda memiliki kolom 'Goals total'.");
        return;
    }

    // Urutkan dari pencetak gol terbanyak, lalu ambil 10 besar
    const topPlayers = records
        .sort((a, b) => (parseInt(b["Goals total"]) || 0) - (parseInt(a["Goals total"]) || 0))
        .slice(0, 10);

    console.log("🚀 Menyuntikkan data asli ke tabel Scorer Neon...");

    for (const player of topPlayers) {
        const goals = parseInt(player["Goals total"]) || 0;
        const assists = parseInt(player["Goals assists"]) || 0;
        const matchesCount = parseInt(player["Games appearences"]) || 0;

        const playerId = String(player["Id"]);

        await prisma.scorer.upsert({
            where: { id: playerId },
            update: {
                goals: goals,
                assists: assists,
                matches: matchesCount,
                team: player["Team name"],
                teamLogo: player["Team logo"] || "",
                photoUrl: player["Photo"] || "",
            },
            create: {
                id: playerId,
                name: player["Name"],
                team: player["Team name"],
                teamLogo: player["Team logo"] || "",
                goals: goals,
                assists: assists,
                matches: matchesCount,
                league: player["League name"] || "Unknown League",
                photoUrl: player["Photo"] || "",
            },
        });
    }

    console.log("✅ Selesai! Data Top Scorer dari file CSV berhasil dimasukkan ke Neon.");
}

main()
    .catch((e) => {
        console.error("❌ Terjadi kesalahan saat seeding data:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });