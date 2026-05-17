import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Player photo URLs from public API-Sports media CDN
const playerPhotos: Record<string, string> = {
  'Thibaut Courtois': 'https://media.api-sports.io/football/players/289.png',
  'Dani Carvajal': 'https://media.api-sports.io/football/players/2899.png',
  'Éder Militão': 'https://media.api-sports.io/football/players/5881.png',
  'David Alaba': 'https://media.api-sports.io/football/players/2459.png',
  'Ferland Mendy': 'https://media.api-sports.io/football/players/2904.png',
  'Luka Modrić': 'https://media.api-sports.io/football/players/2898.png',
  'Jude Bellingham': 'https://media.api-sports.io/football/players/138835.png',
  'Federico Valverde': 'https://media.api-sports.io/football/players/46285.png',
  'Vinícius Jr.': 'https://media.api-sports.io/football/players/58806.png',
  'Kylian Mbappé': 'https://media.api-sports.io/football/players/278.png',
  'Rodrygo': 'https://media.api-sports.io/football/players/58809.png',
  'Marc-André ter Stegen': 'https://media.api-sports.io/football/players/2901.png',
  'Ronald Araújo': 'https://media.api-sports.io/football/players/94567.png',
  'Andreas Christensen': 'https://media.api-sports.io/football/players/2910.png',
  'Alejandro Balde': 'https://media.api-sports.io/football/players/331249.png',
  'Pedri': 'https://media.api-sports.io/football/players/331250.png',
  'Frenkie de Jong': 'https://media.api-sports.io/football/players/2920.png',
  'Gavi': 'https://media.api-sports.io/football/players/331253.png',
  'Lamine Yamal': 'https://media.api-sports.io/football/players/447508.png',
  'Robert Lewandowski': 'https://media.api-sports.io/football/players/2923.png',
  'Raphinha': 'https://media.api-sports.io/football/players/2919.png',
  'Ederson': 'https://media.api-sports.io/football/players/2938.png',
  'Kyle Walker': 'https://media.api-sports.io/football/players/2939.png',
  'Rúben Dias': 'https://media.api-sports.io/football/players/2940.png',
  'John Stones': 'https://media.api-sports.io/football/players/2941.png',
  'Rodri': 'https://media.api-sports.io/football/players/2942.png',
  'Kevin De Bruyne': 'https://media.api-sports.io/football/players/2946.png',
  'Bernardo Silva': 'https://media.api-sports.io/football/players/2947.png',
  'Erling Haaland': 'https://media.api-sports.io/football/players/2949.png',
  'Phil Foden': 'https://media.api-sports.io/football/players/2950.png',
  'Julián Álvarez': 'https://media.api-sports.io/football/players/228173.png',
  'Alisson': 'https://media.api-sports.io/football/players/2963.png',
  'Virgil van Dijk': 'https://media.api-sports.io/football/players/2965.png',
  'Trent Alexander-Arnold': 'https://media.api-sports.io/football/players/2967.png',
  'Mohamed Salah': 'https://media.api-sports.io/football/players/3065.png',
  'Darwin Núñez': 'https://media.api-sports.io/football/players/118436.png',
  'Luis Díaz': 'https://media.api-sports.io/football/players/94637.png',
  'David Raya': 'https://media.api-sports.io/football/players/76869.png',
  'William Saliba': 'https://media.api-sports.io/football/players/331264.png',
  'Bukayo Saka': 'https://media.api-sports.io/football/players/331267.png',
  'Martin Ødegaard': 'https://media.api-sports.io/football/players/2973.png',
  'Manuel Neuer': 'https://media.api-sports.io/football/players/2981.png',
  'Jamal Musiala': 'https://media.api-sports.io/football/players/331278.png',
  'Leroy Sané': 'https://media.api-sports.io/football/players/2986.png',
  'Harry Kane': 'https://media.api-sports.io/football/players/2990.png',
  'Gregor Kobel': 'https://media.api-sports.io/football/players/331281.png',
  'Julian Brandt': 'https://media.api-sports.io/football/players/2992.png',
  'Karim Adeyemi': 'https://media.api-sports.io/football/players/331283.png',
  'Gianluigi Donnarumma': 'https://media.api-sports.io/football/players/3011.png',
  'Ousmane Dembélé': 'https://media.api-sports.io/football/players/3014.png',
  'Cole Palmer': 'https://media.api-sports.io/football/players/331289.png',
  'Nicolas Jackson': 'https://media.api-sports.io/football/players/447538.png',
  'Alex Meret': 'https://media.api-sports.io/football/players/3020.png',
  'Khvicha Kvaratskhelia': 'https://media.api-sports.io/football/players/331295.png',
  'Lautaro Martínez': 'https://media.api-sports.io/football/players/3036.png',
  'Rafael Leão': 'https://media.api-sports.io/football/players/3042.png',
  'Son Heung-min': 'https://media.api-sports.io/football/players/3044.png',
}

export async function POST() {
  try {
    let updated = 0
    for (const [name, photoUrl] of Object.entries(playerPhotos)) {
      const result = await db.player.updateMany({
        where: { name },
        data: { photoUrl },
      })
      updated += result.count
    }
    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Error updating player photos:', error)
    return NextResponse.json(
      { error: 'Failed to update photos' },
      { status: 500 }
    )
  }
}
