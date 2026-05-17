import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in correct order (respect foreign keys)
  await prisma.transfer.deleteMany();
  await prisma.playerStats.deleteMany();
  await prisma.player.deleteMany();
  await prisma.matchLineup.deleteMany();
  await prisma.matchStats.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.newsItem.deleteMany();
  await prisma.scorer.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.match.deleteMany();

  // === PLAYERS ===
  const playerData = [
    // Real Madrid
    { name: 'Thibaut Courtois', firstName: 'Thibaut', lastName: 'Courtois', age: 32, birthDate: '1992-05-11', nationality: 'Belgium', height: '199 cm', weight: '96 kg', position: 'GK', shirtNumber: 1, currentClub: 'Real Madrid', rating: 7.8 },
    { name: 'Dani Carvajal', firstName: 'Dani', lastName: 'Carvajal', age: 32, birthDate: '1992-01-11', nationality: 'Spain', height: '173 cm', weight: '72 kg', position: 'DF', shirtNumber: 2, currentClub: 'Real Madrid', rating: 7.4 },
    { name: 'Éder Militão', firstName: 'Éder', lastName: 'Militão', age: 26, birthDate: '1998-01-18', nationality: 'Brazil', height: '186 cm', weight: '80 kg', position: 'DF', shirtNumber: 3, currentClub: 'Real Madrid', rating: 7.3 },
    { name: 'David Alaba', firstName: 'David', lastName: 'Alaba', age: 31, birthDate: '1992-06-24', nationality: 'Austria', height: '180 cm', weight: '75 kg', position: 'DF', shirtNumber: 4, currentClub: 'Real Madrid', rating: 7.5 },
    { name: 'Ferland Mendy', firstName: 'Ferland', lastName: 'Mendy', age: 29, birthDate: '1995-06-08', nationality: 'France', height: '180 cm', weight: '73 kg', position: 'DF', shirtNumber: 23, currentClub: 'Real Madrid', rating: 7.2 },
    { name: 'Luka Modrić', firstName: 'Luka', lastName: 'Modrić', age: 38, birthDate: '1985-09-09', nationality: 'Croatia', height: '172 cm', weight: '66 kg', position: 'MF', shirtNumber: 10, currentClub: 'Real Madrid', rating: 7.6 },
    { name: 'Jude Bellingham', firstName: 'Jude', lastName: 'Bellingham', age: 21, birthDate: '2003-06-29', nationality: 'England', height: '186 cm', weight: '75 kg', position: 'MF', shirtNumber: 5, currentClub: 'Real Madrid', rating: 8.2 },
    { name: 'Federico Valverde', firstName: 'Federico', lastName: 'Valverde', age: 25, birthDate: '1998-11-22', nationality: 'Uruguay', height: '182 cm', weight: '78 kg', position: 'MF', shirtNumber: 15, currentClub: 'Real Madrid', rating: 7.9 },
    { name: 'Vinícius Jr.', firstName: 'Vinícius', lastName: 'Jr.', age: 23, birthDate: '2000-07-12', nationality: 'Brazil', height: '176 cm', weight: '73 kg', position: 'FW', shirtNumber: 7, currentClub: 'Real Madrid', rating: 8.5 },
    { name: 'Kylian Mbappé', firstName: 'Kylian', lastName: 'Mbappé', age: 25, birthDate: '1998-12-20', nationality: 'France', height: '178 cm', weight: '75 kg', position: 'FW', shirtNumber: 9, currentClub: 'Real Madrid', rating: 8.6 },
    { name: 'Rodrygo', firstName: 'Rodrygo', lastName: 'Goes', age: 23, birthDate: '2001-01-09', nationality: 'Brazil', height: '174 cm', weight: '64 kg', position: 'FW', shirtNumber: 11, currentClub: 'Real Madrid', rating: 7.7 },
    // Barcelona
    { name: 'Marc-André ter Stegen', firstName: 'Marc-André', lastName: 'ter Stegen', age: 32, birthDate: '1992-04-30', nationality: 'Germany', height: '187 cm', weight: '85 kg', position: 'GK', shirtNumber: 1, currentClub: 'Barcelona', rating: 7.5 },
    { name: 'Ronald Araújo', firstName: 'Ronald', lastName: 'Araújo', age: 25, birthDate: '1999-03-07', nationality: 'Uruguay', height: '188 cm', weight: '81 kg', position: 'DF', shirtNumber: 4, currentClub: 'Barcelona', rating: 7.6 },
    { name: 'Andreas Christensen', firstName: 'Andreas', lastName: 'Christensen', age: 28, birthDate: '1996-06-10', nationality: 'Denmark', height: '188 cm', weight: '80 kg', position: 'DF', shirtNumber: 15, currentClub: 'Barcelona', rating: 7.2 },
    { name: 'Alejandro Balde', firstName: 'Alejandro', lastName: 'Balde', age: 20, birthDate: '2003-10-18', nationality: 'Spain', height: '175 cm', weight: '68 kg', position: 'DF', shirtNumber: 3, currentClub: 'Barcelona', rating: 7.1 },
    { name: 'Pedri', firstName: 'Pedri', lastName: 'González', age: 21, birthDate: '2002-11-25', nationality: 'Spain', height: '174 cm', weight: '60 kg', position: 'MF', shirtNumber: 8, currentClub: 'Barcelona', rating: 8.1 },
    { name: 'Frenkie de Jong', firstName: 'Frenkie', lastName: 'de Jong', age: 27, birthDate: '1997-05-12', nationality: 'Netherlands', height: '180 cm', weight: '74 kg', position: 'MF', shirtNumber: 21, currentClub: 'Barcelona', rating: 7.5 },
    { name: 'Gavi', firstName: 'Gavi', lastName: 'Páez', age: 19, birthDate: '2004-08-05', nationality: 'Spain', height: '173 cm', weight: '68 kg', position: 'MF', shirtNumber: 6, currentClub: 'Barcelona', rating: 7.4 },
    { name: 'Lamine Yamal', firstName: 'Lamine', lastName: 'Yamal', age: 17, birthDate: '2007-07-13', nationality: 'Spain', height: '180 cm', weight: '70 kg', position: 'FW', shirtNumber: 19, currentClub: 'Barcelona', rating: 7.9 },
    { name: 'Robert Lewandowski', firstName: 'Robert', lastName: 'Lewandowski', age: 35, birthDate: '1988-08-21', nationality: 'Poland', height: '185 cm', weight: '81 kg', position: 'FW', shirtNumber: 9, currentClub: 'Barcelona', rating: 8.0 },
    { name: 'Raphinha', firstName: 'Raphinha', lastName: 'Dias', age: 27, birthDate: '1996-12-14', nationality: 'Brazil', height: '176 cm', weight: '68 kg', position: 'FW', shirtNumber: 11, currentClub: 'Barcelona', rating: 7.6 },
    // Manchester City
    { name: 'Ederson', firstName: 'Ederson', lastName: 'Moraes', age: 30, birthDate: '1993-08-17', nationality: 'Brazil', height: '188 cm', weight: '86 kg', position: 'GK', shirtNumber: 31, currentClub: 'Manchester City', rating: 7.6 },
    { name: 'Kyle Walker', firstName: 'Kyle', lastName: 'Walker', age: 33, birthDate: '1990-05-28', nationality: 'England', height: '183 cm', weight: '70 kg', position: 'DF', shirtNumber: 2, currentClub: 'Manchester City', rating: 7.3 },
    { name: 'Rúben Dias', firstName: 'Rúben', lastName: 'Dias', age: 26, birthDate: '1997-05-14', nationality: 'Portugal', height: '187 cm', weight: '82 kg', position: 'DF', shirtNumber: 3, currentClub: 'Manchester City', rating: 7.7 },
    { name: 'John Stones', firstName: 'John', lastName: 'Stones', age: 29, birthDate: '1994-05-28', nationality: 'England', height: '188 cm', weight: '80 kg', position: 'DF', shirtNumber: 5, currentClub: 'Manchester City', rating: 7.4 },
    { name: 'Rodri', firstName: 'Rodri', lastName: 'Hernández', age: 27, birthDate: '1996-06-22', nationality: 'Spain', height: '191 cm', weight: '82 kg', position: 'MF', shirtNumber: 16, currentClub: 'Manchester City', rating: 8.3 },
    { name: 'Kevin De Bruyne', firstName: 'Kevin', lastName: 'De Bruyne', age: 32, birthDate: '1991-06-28', nationality: 'Belgium', height: '181 cm', weight: '68 kg', position: 'MF', shirtNumber: 17, currentClub: 'Manchester City', rating: 8.4 },
    { name: 'Bernardo Silva', firstName: 'Bernardo', lastName: 'Silva', age: 29, birthDate: '1994-08-10', nationality: 'Portugal', height: '173 cm', weight: '64 kg', position: 'MF', shirtNumber: 20, currentClub: 'Manchester City', rating: 7.8 },
    { name: 'Erling Haaland', firstName: 'Erling', lastName: 'Haaland', age: 24, birthDate: '2000-07-21', nationality: 'Norway', height: '194 cm', weight: '88 kg', position: 'FW', shirtNumber: 9, currentClub: 'Manchester City', rating: 8.7 },
    { name: 'Phil Foden', firstName: 'Phil', lastName: 'Foden', age: 23, birthDate: '2000-05-28', nationality: 'England', height: '171 cm', weight: '69 kg', position: 'FW', shirtNumber: 47, currentClub: 'Manchester City', rating: 7.9 },
    { name: 'Julián Álvarez', firstName: 'Julián', lastName: 'Álvarez', age: 23, birthDate: '2000-01-31', nationality: 'Argentina', height: '170 cm', weight: '71 kg', position: 'FW', shirtNumber: 19, currentClub: 'Manchester City', rating: 7.6 },
    // Liverpool
    { name: 'Alisson', firstName: 'Alisson', lastName: 'Becker', age: 31, birthDate: '1992-10-02', nationality: 'Brazil', height: '193 cm', weight: '91 kg', position: 'GK', shirtNumber: 1, currentClub: 'Liverpool', rating: 7.9 },
    { name: 'Virgil van Dijk', firstName: 'Virgil', lastName: 'van Dijk', age: 32, birthDate: '1991-07-08', nationality: 'Netherlands', height: '193 cm', weight: '92 kg', position: 'DF', shirtNumber: 4, currentClub: 'Liverpool', rating: 8.0 },
    { name: 'Trent Alexander-Arnold', firstName: 'Trent', lastName: 'Alexander-Arnold', age: 25, birthDate: '1998-10-07', nationality: 'England', height: '175 cm', weight: '69 kg', position: 'DF', shirtNumber: 66, currentClub: 'Liverpool', rating: 7.8 },
    { name: 'Mohamed Salah', firstName: 'Mohamed', lastName: 'Salah', age: 31, birthDate: '1992-06-15', nationality: 'Egypt', height: '175 cm', weight: '71 kg', position: 'FW', shirtNumber: 11, currentClub: 'Liverpool', rating: 8.3 },
    { name: 'Darwin Núñez', firstName: 'Darwin', lastName: 'Núñez', age: 24, birthDate: '1999-06-24', nationality: 'Uruguay', height: '187 cm', weight: '81 kg', position: 'FW', shirtNumber: 27, currentClub: 'Liverpool', rating: 7.5 },
    { name: 'Luis Díaz', firstName: 'Luis', lastName: 'Díaz', age: 27, birthDate: '1997-01-13', nationality: 'Colombia', height: '178 cm', weight: '65 kg', position: 'FW', shirtNumber: 7, currentClub: 'Liverpool', rating: 7.6 },
    // Arsenal
    { name: 'David Raya', firstName: 'David', lastName: 'Raya', age: 28, birthDate: '1995-09-15', nationality: 'Spain', height: '183 cm', weight: '75 kg', position: 'GK', shirtNumber: 22, currentClub: 'Arsenal', rating: 7.5 },
    { name: 'William Saliba', firstName: 'William', lastName: 'Saliba', age: 23, birthDate: '2001-03-24', nationality: 'France', height: '192 cm', weight: '85 kg', position: 'DF', shirtNumber: 2, currentClub: 'Arsenal', rating: 7.8 },
    { name: 'Bukayo Saka', firstName: 'Bukayo', lastName: 'Saka', age: 22, birthDate: '2001-09-05', nationality: 'England', height: '178 cm', weight: '65 kg', position: 'FW', shirtNumber: 7, currentClub: 'Arsenal', rating: 8.1 },
    { name: 'Martin Ødegaard', firstName: 'Martin', lastName: 'Ødegaard', age: 25, birthDate: '1998-12-17', nationality: 'Norway', height: '178 cm', weight: '70 kg', position: 'MF', shirtNumber: 8, currentClub: 'Arsenal', rating: 8.2 },
    // Bayern Munich
    { name: 'Manuel Neuer', firstName: 'Manuel', lastName: 'Neuer', age: 38, birthDate: '1986-03-27', nationality: 'Germany', height: '193 cm', weight: '93 kg', position: 'GK', shirtNumber: 1, currentClub: 'Bayern Munich', rating: 7.5 },
    { name: 'Jamal Musiala', firstName: 'Jamal', lastName: 'Musiala', age: 21, birthDate: '2003-02-26', nationality: 'Germany', height: '184 cm', weight: '74 kg', position: 'MF', shirtNumber: 42, currentClub: 'Bayern Munich', rating: 8.0 },
    { name: 'Leroy Sané', firstName: 'Leroy', lastName: 'Sané', age: 28, birthDate: '1996-01-11', nationality: 'Germany', height: '183 cm', weight: '75 kg', position: 'FW', shirtNumber: 10, currentClub: 'Bayern Munich', rating: 7.7 },
    { name: 'Harry Kane', firstName: 'Harry', lastName: 'Kane', age: 30, birthDate: '1993-07-28', nationality: 'England', height: '188 cm', weight: '86 kg', position: 'FW', shirtNumber: 9, currentClub: 'Bayern Munich', rating: 8.5 },
    // Dortmund
    { name: 'Gregor Kobel', firstName: 'Gregor', lastName: 'Kobel', age: 26, birthDate: '1997-12-06', nationality: 'Switzerland', height: '194 cm', weight: '90 kg', position: 'GK', shirtNumber: 1, currentClub: 'Dortmund', rating: 7.4 },
    { name: 'Julian Brandt', firstName: 'Julian', lastName: 'Brandt', age: 28, birthDate: '1996-05-02', nationality: 'Germany', height: '185 cm', weight: '74 kg', position: 'MF', shirtNumber: 19, currentClub: 'Dortmund', rating: 7.5 },
    { name: 'Karim Adeyemi', firstName: 'Karim', lastName: 'Adeyemi', age: 22, birthDate: '2002-01-18', nationality: 'Germany', height: '180 cm', weight: '74 kg', position: 'FW', shirtNumber: 27, currentClub: 'Dortmund', rating: 7.3 },
    // PSG
    { name: 'Gianluigi Donnarumma', firstName: 'Gianluigi', lastName: 'Donnarumma', age: 25, birthDate: '1999-02-25', nationality: 'Italy', height: '196 cm', weight: '90 kg', position: 'GK', shirtNumber: 99, currentClub: 'PSG', rating: 7.4 },
    { name: 'Ousmane Dembélé', firstName: 'Ousmane', lastName: 'Dembélé', age: 27, birthDate: '1997-05-15', nationality: 'France', height: '178 cm', weight: '67 kg', position: 'FW', shirtNumber: 10, currentClub: 'PSG', rating: 7.8 },
    // Chelsea
    { name: 'Cole Palmer', firstName: 'Cole', lastName: 'Palmer', age: 22, birthDate: '2002-05-06', nationality: 'England', height: '185 cm', weight: '74 kg', position: 'MF', shirtNumber: 20, currentClub: 'Chelsea', rating: 8.2 },
    { name: 'Nicolas Jackson', firstName: 'Nicolas', lastName: 'Jackson', age: 23, birthDate: '2001-06-20', nationality: 'Senegal', height: '186 cm', weight: '78 kg', position: 'FW', shirtNumber: 15, currentClub: 'Chelsea', rating: 7.3 },
    // Napoli
    { name: 'Alex Meret', firstName: 'Alex', lastName: 'Meret', age: 27, birthDate: '1997-03-22', nationality: 'Italy', height: '191 cm', weight: '85 kg', position: 'GK', shirtNumber: 1, currentClub: 'Napoli', rating: 7.2 },
    { name: 'Khvicha Kvaratskhelia', firstName: 'Khvicha', lastName: 'Kvaratskhelia', age: 23, birthDate: '2001-02-12', nationality: 'Georgia', height: '183 cm', weight: '76 kg', position: 'FW', shirtNumber: 77, currentClub: 'Napoli', rating: 7.8 },
    // Inter Milan
    { name: 'Lautaro Martínez', firstName: 'Lautaro', lastName: 'Martínez', age: 26, birthDate: '1997-08-22', nationality: 'Argentina', height: '174 cm', weight: '72 kg', position: 'FW', shirtNumber: 10, currentClub: 'Inter Milan', rating: 8.1 },
    // AC Milan
    { name: 'Rafael Leão', firstName: 'Rafael', lastName: 'Leão', age: 24, birthDate: '1999-06-10', nationality: 'Portugal', height: '188 cm', weight: '81 kg', position: 'FW', shirtNumber: 17, currentClub: 'AC Milan', rating: 7.7 },
    // Tottenham
    { name: 'Son Heung-min', firstName: 'Heung-min', lastName: 'Son', age: 31, birthDate: '1992-07-08', nationality: 'South Korea', height: '183 cm', weight: '77 kg', position: 'FW', shirtNumber: 7, currentClub: 'Tottenham', rating: 7.8 },
  ];

  const createdPlayers: Record<string, string> = {};
  for (const p of playerData) {
    const player = await prisma.player.create({
      data: {
        ...p,
        clubLogo: '',
        photoUrl: '',
      },
    });
    createdPlayers[p.name] = player.id;
  }

  // === PLAYER STATS ===
  const statsData: Record<string, Partial<typeof playerData[number]> & {
    totalMatches: number; goals: number; assists: number; shots: number;
    shotsOnTarget: number; passingAccuracy: number; tackles: number;
    interceptions: number; fouls: number; yellowCards: number; redCards: number;
    rating: number;
  }> = {
    'Vinícius Jr.': { totalMatches: 32, goals: 16, assists: 10, shots: 89, shotsOnTarget: 45, passingAccuracy: 82.5, tackles: 18, interceptions: 12, fouls: 35, yellowCards: 4, redCards: 0, rating: 8.5 },
    'Kylian Mbappé': { totalMatches: 30, goals: 18, assists: 8, shots: 95, shotsOnTarget: 52, passingAccuracy: 80.3, tackles: 10, interceptions: 8, fouls: 22, yellowCards: 2, redCards: 0, rating: 8.6 },
    'Jude Bellingham': { totalMatches: 31, goals: 12, assists: 9, shots: 68, shotsOnTarget: 35, passingAccuracy: 88.7, tackles: 42, interceptions: 28, fouls: 30, yellowCards: 5, redCards: 0, rating: 8.2 },
    'Robert Lewandowski': { totalMatches: 30, goals: 18, assists: 3, shots: 78, shotsOnTarget: 42, passingAccuracy: 79.5, tackles: 8, interceptions: 5, fouls: 18, yellowCards: 3, redCards: 0, rating: 8.0 },
    'Pedri': { totalMatches: 28, goals: 4, assists: 8, shots: 35, shotsOnTarget: 18, passingAccuracy: 91.2, tackles: 38, interceptions: 25, fouls: 22, yellowCards: 4, redCards: 0, rating: 8.1 },
    'Erling Haaland': { totalMatches: 30, goals: 24, assists: 5, shots: 102, shotsOnTarget: 58, passingAccuracy: 75.4, tackles: 6, interceptions: 4, fouls: 28, yellowCards: 2, redCards: 0, rating: 8.7 },
    'Kevin De Bruyne': { totalMatches: 22, goals: 6, assists: 14, shots: 55, shotsOnTarget: 28, passingAccuracy: 89.5, tackles: 22, interceptions: 18, fouls: 15, yellowCards: 3, redCards: 0, rating: 8.4 },
    'Mohamed Salah': { totalMatches: 30, goals: 19, assists: 11, shots: 82, shotsOnTarget: 44, passingAccuracy: 83.1, tackles: 15, interceptions: 10, fouls: 20, yellowCards: 2, redCards: 0, rating: 8.3 },
    'Bukayo Saka': { totalMatches: 29, goals: 15, assists: 10, shots: 65, shotsOnTarget: 33, passingAccuracy: 85.8, tackles: 28, interceptions: 15, fouls: 18, yellowCards: 3, redCards: 0, rating: 8.1 },
    'Harry Kane': { totalMatches: 28, goals: 28, assists: 8, shots: 88, shotsOnTarget: 48, passingAccuracy: 81.2, tackles: 12, interceptions: 8, fouls: 25, yellowCards: 2, redCards: 0, rating: 8.5 },
    'Cole Palmer': { totalMatches: 30, goals: 17, assists: 9, shots: 72, shotsOnTarget: 36, passingAccuracy: 84.5, tackles: 20, interceptions: 14, fouls: 22, yellowCards: 4, redCards: 0, rating: 8.2 },
    'Jamal Musiala': { totalMatches: 29, goals: 8, assists: 7, shots: 58, shotsOnTarget: 30, passingAccuracy: 87.3, tackles: 30, interceptions: 20, fouls: 25, yellowCards: 3, redCards: 0, rating: 8.0 },
    'Lautaro Martínez': { totalMatches: 31, goals: 21, assists: 4, shots: 75, shotsOnTarget: 40, passingAccuracy: 78.8, tackles: 10, interceptions: 6, fouls: 22, yellowCards: 4, redCards: 0, rating: 8.1 },
    'Lamine Yamal': { totalMatches: 27, goals: 6, assists: 10, shots: 48, shotsOnTarget: 24, passingAccuracy: 86.2, tackles: 16, interceptions: 12, fouls: 15, yellowCards: 2, redCards: 0, rating: 7.9 },
    'Ousmane Dembélé': { totalMatches: 28, goals: 8, assists: 7, shots: 62, shotsOnTarget: 30, passingAccuracy: 83.5, tackles: 18, interceptions: 10, fouls: 20, yellowCards: 3, redCards: 0, rating: 7.8 },
  };

  for (const [playerName, stats] of Object.entries(statsData)) {
    const playerId = createdPlayers[playerName];
    if (!playerId) continue;
    const matchRatings = Array.from({ length: 6 }, (_, i) => ({
      match: `Matchday ${i + 25}`,
      rating: Math.round(((stats.rating || 7) + (Math.random() - 0.5) * 1.5) * 10) / 10,
      opponent: ['Rivals', 'United', 'City', 'Wanderers', 'Athletic', 'FC'][i],
    }));
    await prisma.playerStats.create({
      data: {
        playerId,
        totalMatches: stats.totalMatches,
        goals: stats.goals,
        assists: stats.assists,
        shots: stats.shots,
        shotsOnTarget: stats.shotsOnTarget,
        passingAccuracy: stats.passingAccuracy,
        tackles: stats.tackles,
        interceptions: stats.interceptions,
        fouls: stats.fouls,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards,
        rating: stats.rating,
        matchRatings: JSON.stringify(matchRatings),
      },
    });
  }

  // Add basic stats for players without specific stats
  for (const [playerName, playerId] of Object.entries(createdPlayers)) {
    if (statsData[playerName]) continue;
    const p = playerData.find(pd => pd.name === playerName);
    if (!p) continue;
    const matchRatings = Array.from({ length: 6 }, (_, i) => ({
      match: `Matchday ${i + 25}`,
      rating: Math.round((p.rating + (Math.random() - 0.5) * 1.2) * 10) / 10,
      opponent: ['Rivals', 'United', 'City', 'Wanderers', 'Athletic', 'FC'][i],
    }));
    await prisma.playerStats.create({
      data: {
        playerId,
        totalMatches: 20 + Math.floor(Math.random() * 15),
        goals: p.position === 'GK' ? 0 : Math.floor(Math.random() * 8),
        assists: p.position === 'GK' ? 0 : Math.floor(Math.random() * 5),
        shots: p.position === 'GK' ? 0 : 10 + Math.floor(Math.random() * 40),
        shotsOnTarget: p.position === 'GK' ? 0 : 5 + Math.floor(Math.random() * 20),
        passingAccuracy: p.position === 'GK' ? 78 : 75 + Math.floor(Math.random() * 15),
        tackles: p.position === 'FW' ? 5 + Math.floor(Math.random() * 15) : 20 + Math.floor(Math.random() * 30),
        interceptions: p.position === 'FW' ? 3 + Math.floor(Math.random() * 10) : 10 + Math.floor(Math.random() * 25),
        fouls: 10 + Math.floor(Math.random() * 20),
        yellowCards: Math.floor(Math.random() * 6),
        redCards: Math.random() > 0.9 ? 1 : 0,
        rating: p.rating,
        matchRatings: JSON.stringify(matchRatings),
      },
    });
  }

  // === TRANSFERS ===
  const transferData: Array<{ playerName: string; transfers: Array<{ fromClub: string; toClub: string; date: string; fee: string; type: string }> }> = [
    { playerName: 'Kylian Mbappé', transfers: [
      { fromClub: 'AS Monaco', toClub: 'Real Madrid', date: '2024-07-15', fee: 'Free', type: 'Free' },
      { fromClub: 'AS Monaco', toClub: 'PSG', date: '2017-08-31', fee: '€180M', type: 'Transfer' },
    ]},
    { playerName: 'Jude Bellingham', transfers: [
      { fromClub: 'Borussia Dortmund', toClub: 'Real Madrid', date: '2023-06-14', fee: '€115M', type: 'Transfer' },
      { fromClub: 'Birmingham City', toClub: 'Borussia Dortmund', date: '2020-07-20', fee: '€25M', type: 'Transfer' },
    ]},
    { playerName: 'Erling Haaland', transfers: [
      { fromClub: 'Borussia Dortmund', toClub: 'Manchester City', date: '2022-06-13', fee: '€60M', type: 'Transfer' },
      { fromClub: 'Red Bull Salzburg', toClub: 'Borussia Dortmund', date: '2019-12-29', fee: '€20M', type: 'Transfer' },
    ]},
    { playerName: 'Harry Kane', transfers: [
      { fromClub: 'Tottenham', toClub: 'Bayern Munich', date: '2023-08-12', fee: '€100M', type: 'Transfer' },
      { fromClub: 'Tottenham Youth', toClub: 'Tottenham', date: '2009-07-01', fee: 'Youth', type: 'Youth' },
    ]},
    { playerName: 'Vinícius Jr.', transfers: [
      { fromClub: 'Flamengo', toClub: 'Real Madrid', date: '2018-07-12', fee: '€45M', type: 'Transfer' },
    ]},
    { playerName: 'Cole Palmer', transfers: [
      { fromClub: 'Manchester City', toClub: 'Chelsea', date: '2023-09-01', fee: '€47M', type: 'Transfer' },
      { fromClub: 'Manchester City Youth', toClub: 'Manchester City', date: '2020-07-01', fee: 'Youth', type: 'Youth' },
    ]},
    { playerName: 'Lamine Yamal', transfers: [
      { fromClub: 'La Masia', toClub: 'Barcelona', date: '2023-07-01', fee: 'Youth', type: 'Youth' },
    ]},
    { playerName: 'Darwin Núñez', transfers: [
      { fromClub: 'Benfica', toClub: 'Liverpool', date: '2022-06-13', fee: '€75M', type: 'Transfer' },
      { fromClub: 'Almería', toClub: 'Benfica', date: '2020-09-04', fee: '€24M', type: 'Transfer' },
    ]},
  ];

  for (const { playerName, transfers } of transferData) {
    const playerId = createdPlayers[playerName];
    if (!playerId) continue;
    for (const t of transfers) {
      await prisma.transfer.create({
        data: { playerId, ...t },
      });
    }
  }

  // === MATCHES ===
  const matches = [
    {
      homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeScore: 3, awayScore: 1,
      status: 'LIVE', minute: 76, league: 'La Liga', stadium: 'Santiago Bernabéu', kickoff: '21:00',
      isHot: true,
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/13/LaLiga.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Vinícius Jr.', minute: 12 },
        { type: 'goal', team: 'home', player: 'Bellingham', minute: 28 },
        { type: 'goal', team: 'away', player: 'Lewandowski', minute: 35 },
        { type: 'yellow', team: 'away', player: 'Gavi', minute: 42 },
        { type: 'goal', team: 'home', player: 'Mbappé', minute: 68 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'D', 'W', 'L']),
      awayForm: JSON.stringify(['W', 'L', 'W', 'W', 'D']),
    },
    {
      homeTeam: 'Manchester City', awayTeam: 'Napoli', homeScore: 0, awayScore: 0,
      status: 'LIVE', minute: 34, league: 'Champions League', stadium: 'Etihad Stadium', kickoff: '20:00',
      isHot: true,
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/SSC_Napoli.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2024.svg',
      events: JSON.stringify([
        { type: 'yellow', team: 'home', player: 'Rodri', minute: 18 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
      awayForm: JSON.stringify(['W', 'D', 'W', 'L', 'W']),
    },
    {
      homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', homeScore: 2, awayScore: 2,
      status: 'LIVE', minute: 62, league: 'Bundesliga', stadium: 'Allianz Arena', kickoff: '18:30',
      isHot: true,
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Musiala', minute: 15 },
        { type: 'goal', team: 'away', player: 'Brandt', minute: 23 },
        { type: 'goal', team: 'home', player: 'Sané', minute: 41 },
        { type: 'goal', team: 'away', player: 'Adeyemi', minute: 55 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'L', 'W', 'W']),
      awayForm: JSON.stringify(['D', 'W', 'W', 'L', 'W']),
    },
    {
      homeTeam: 'PSG', awayTeam: 'Marseille', homeScore: 1, awayScore: 0,
      status: 'LIVE', minute: 51, league: 'Ligue 1', stadium: 'Parc des Princes', kickoff: '20:45',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Olympique_de_Marseille_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Ligue_1_Uber_Eats_logo.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Dembélé', minute: 38 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'W', 'W', 'D']),
      awayForm: JSON.stringify(['L', 'W', 'D', 'W', 'W']),
    },
    {
      homeTeam: 'Liverpool', awayTeam: 'Arsenal', homeScore: 2, awayScore: 1,
      status: 'FT', minute: 90, league: 'Premier League', stadium: 'Anfield', kickoff: '17:30',
      isHot: false,
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Salah', minute: 22 },
        { type: 'goal', team: 'away', player: 'Saka', minute: 45 },
        { type: 'goal', team: 'home', player: 'Núñez', minute: 78 },
      ]),
      homeForm: JSON.stringify(['W', 'D', 'W', 'W', 'W']),
      awayForm: JSON.stringify(['W', 'W', 'L', 'W', 'D']),
    },
    {
      homeTeam: 'AC Milan', awayTeam: 'Inter Milan', homeScore: 0, awayScore: 1,
      status: 'FT', minute: 90, league: 'Serie A', stadium: 'San Siro', kickoff: '20:45',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Serie_A_logo_%282019%29.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'away', player: 'Lautaro', minute: 67 },
        { type: 'red', team: 'home', player: 'Leão', minute: 82 },
      ]),
      homeForm: JSON.stringify(['D', 'L', 'W', 'D', 'L']),
      awayForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
    },
    {
      homeTeam: 'Tottenham', awayTeam: 'Chelsea', homeScore: 1, awayScore: 3,
      status: 'FT', minute: 90, league: 'Premier League', stadium: 'Tottenham Hotspur Stadium', kickoff: '15:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Son', minute: 11 },
        { type: 'goal', team: 'away', player: 'Palmer', minute: 29 },
        { type: 'goal', team: 'away', player: 'Palmer', minute: 56 },
        { type: 'goal', team: 'away', player: 'Jackson', minute: 88 },
      ]),
      homeForm: JSON.stringify(['L', 'W', 'L', 'D', 'W']),
      awayForm: JSON.stringify(['W', 'W', 'W', 'L', 'W']),
    },
    {
      homeTeam: 'Juventus', awayTeam: 'Roma', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Serie A', stadium: 'Allianz Stadium', kickoff: '20:45',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Juventus_logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/AS_Roma_logo_%282017%29.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Serie_A_logo_%282019%29.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['D', 'W', 'W', 'L', 'W']),
      awayForm: JSON.stringify(['W', 'L', 'D', 'W', 'W']),
    },
    {
      homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'La Liga', stadium: 'Metropolitano', kickoff: '21:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_Badge.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/13/LaLiga.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'D', 'W', 'W', 'L']),
      awayForm: JSON.stringify(['L', 'L', 'W', 'D', 'W']),
    },
    {
      homeTeam: 'Ajax', awayTeam: 'PSV', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Eredivisie', stadium: 'Johan Cruyff Arena', kickoff: '18:45',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Ajax_Amsterdam_logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/PSV_Eindhoven_Logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Eredivisie_nieuw_logo.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'W', 'D', 'W', 'W']),
      awayForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
    },
    {
      homeTeam: 'Leicester', awayTeam: 'Aston Villa', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Premier League', stadium: 'King Power Stadium', kickoff: '15:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Aston_Villa_FC_crest_%282023%29.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['L', 'D', 'L', 'W', 'D']),
      awayForm: JSON.stringify(['W', 'W', 'W', 'W', 'L']),
    },
    {
      homeTeam: 'Benfica', awayTeam: 'Porto', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Primeira Liga', stadium: 'Estádio da Luz', kickoff: '20:30',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3d/FC_Porto.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Liga_Portugal_logo.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
      awayForm: JSON.stringify(['W', 'D', 'L', 'W', 'W']),
    },
    {
      homeTeam: 'Celtic', awayTeam: 'Rangers', homeScore: 2, awayScore: 1,
      status: 'LIVE', minute: 84, league: 'Scottish Prem', stadium: 'Celtic Park', kickoff: '15:00',
      isHot: true,
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Celtic_FC.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Rangers_FC.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/2/2f/Scottish_Premiership_logo.png',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Kyogo', minute: 10 },
        { type: 'goal', team: 'away', player: 'Dessers', minute: 33 },
        { type: 'goal', team: 'home', player: "O'Riley", minute: 71 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
      awayForm: JSON.stringify(['W', 'D', 'L', 'W', 'W']),
    },
    {
      homeTeam: 'Feyenoord', awayTeam: 'AZ Alkmaar', homeScore: 1, awayScore: 0,
      status: 'LIVE', minute: 58, league: 'Eredivisie', stadium: 'De Kuip', kickoff: '16:45',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Feyenoord_logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/en/4/45/AZ_Alkmaar_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Eredivisie_nieuw_logo.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Giménez', minute: 44 },
      ]),
      homeForm: JSON.stringify(['W', 'D', 'W', 'W', 'L']),
      awayForm: JSON.stringify(['D', 'W', 'L', 'W', 'D']),
    },
    {
      homeTeam: 'Lyon', awayTeam: 'Monaco', homeScore: 1, awayScore: 1,
      status: 'HT', minute: 45, league: 'Ligue 1', stadium: 'Groupama Stadium', kickoff: '19:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Olympique_Lyonnais_logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/AS_Monaco_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Ligue_1_Uber_Eats_logo.svg',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Lacazette', minute: 18 },
        { type: 'goal', team: 'away', player: 'Embolo', minute: 40 },
      ]),
      homeForm: JSON.stringify(['D', 'W', 'L', 'W', 'D']),
      awayForm: JSON.stringify(['W', 'W', 'D', 'W', 'L']),
    },
    // --- New matches: Liga 1 Indonesia ---
    {
      homeTeam: 'Persib Bandung', awayTeam: 'Persija Jakarta', homeScore: 2, awayScore: 1,
      status: 'LIVE', minute: 67, league: 'Liga 1 Indonesia', stadium: 'Gelora Bandung Lautan Api', kickoff: '19:00',
      isHot: true,
      homeLogo: '', awayLogo: '', leagueLogo: '',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'David Da Silva', minute: 12 },
        { type: 'goal', team: 'away', player: 'Marko Simic', minute: 34 },
        { type: 'goal', team: 'home', player: 'David Da Silva', minute: 58 },
      ]),
      homeForm: JSON.stringify(['W', 'W', 'D', 'W', 'W']),
      awayForm: JSON.stringify(['W', 'D', 'W', 'W', 'L']),
    },
    {
      homeTeam: 'Arema FC', awayTeam: 'Bali United', homeScore: 1, awayScore: 3,
      status: 'FT', minute: 90, league: 'Liga 1 Indonesia', stadium: 'Kanjuruhan Stadium', kickoff: '15:30',
      homeLogo: '', awayLogo: '', leagueLogo: '',
      events: JSON.stringify([
        { type: 'goal', team: 'home', player: 'Dedik Setiawan', minute: 22 },
        { type: 'goal', team: 'away', player: 'Ilija Spasojevic', minute: 31 },
        { type: 'goal', team: 'away', player: 'Ilija Spasojevic', minute: 55 },
        { type: 'goal', team: 'away', player: 'Rahmat', minute: 82 },
      ]),
      homeForm: JSON.stringify(['L', 'W', 'D', 'L', 'W']),
      awayForm: JSON.stringify(['W', 'W', 'L', 'W', 'W']),
    },
    {
      homeTeam: 'PSM Makassar', awayTeam: 'Persebaya Surabaya', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Liga 1 Indonesia', stadium: 'Andi Mattalatta', kickoff: '20:00',
      homeLogo: '', awayLogo: '', leagueLogo: '',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'D', 'W', 'L', 'W']),
      awayForm: JSON.stringify(['L', 'W', 'D', 'W', 'D']),
    },
    // --- New match: Eredivisie ---
    {
      homeTeam: 'PSV', awayTeam: 'Ajax', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Eredivisie', stadium: 'Philips Stadion', kickoff: '20:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/PSV_Eindhoven_Logo.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Ajax_Amsterdam_logo.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Eredivisie_nieuw_logo.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'W', 'W', 'D', 'W']),
      awayForm: JSON.stringify(['W', 'W', 'D', 'W', 'W']),
    },
    // --- New match: Champions League ---
    {
      homeTeam: 'Real Madrid', awayTeam: 'Inter Milan', homeScore: 0, awayScore: 0,
      status: 'UPCOMING', minute: 0, league: 'Champions League', stadium: 'Santiago Bernabéu', kickoff: '21:00',
      homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
      awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
      leagueLogo: 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2024.svg',
      events: JSON.stringify([]),
      homeForm: JSON.stringify(['W', 'D', 'W', 'W', 'L']),
      awayForm: JSON.stringify(['W', 'W', 'D', 'W', 'W']),
    },
  ];

  const createdMatches: Record<string, string> = {};
  for (const match of matches) {
    const created = await prisma.match.create({ data: match });
    createdMatches[`${match.homeTeam}-${match.awayTeam}`] = created.id;
  }

  // === MATCH LINEUPS ===
  const lineupData: Array<{ homeTeam: string; awayTeam: string; homeFormation: string; awayFormation: string; homeXI: string[]; awayXI: string[]; homeSubs: string[]; awaySubs: string[]; homeCoach: string; awayCoach: string }> = [
    {
      homeTeam: 'Real Madrid', awayTeam: 'Barcelona',
      homeFormation: '4-3-3', awayFormation: '4-3-3',
      homeXI: ['Courtois', 'Carvajal', 'Militão', 'Alaba', 'Mendy', 'Modrić', 'Bellingham', 'Valverde', 'Rodrygo', 'Mbappé', 'Vinícius Jr.'],
      awayXI: ['ter Stegen', 'Balde', 'Araújo', 'Christensen', 'Koundé', 'Pedri', 'de Jong', 'Gavi', 'Yamal', 'Lewandowski', 'Raphinha'],
      homeSubs: ['Lunin', 'Nacho', 'Brahim', 'Güler', 'Endrick', 'Tchouaméni', 'Vázquez'],
      awaySubs: ['Iñaki Peña', 'Kessié', 'Ferran Torres', 'Félix', 'Christensen', 'Gündoğan', 'Romero'],
      homeCoach: 'Carlo Ancelotti', awayCoach: 'Hansi Flick',
    },
    {
      homeTeam: 'Manchester City', awayTeam: 'Napoli',
      homeFormation: '4-3-3', awayFormation: '4-2-3-1',
      homeXI: ['Ederson', 'Walker', 'Dias', 'Stones', 'Gvardiol', 'Rodri', 'De Bruyne', 'B. Silva', 'Foden', 'Haaland', 'Álvarez'],
      awayXI: ['Meret', 'Di Lorenzo', 'Rrahmani', 'Kim', 'Mario Rui', 'Anguissa', 'Lobotka', 'Politano', 'Zielinski', 'Kvaratskhelia', 'Osimhen'],
      homeSubs: ['Ortega', 'Akanji', 'Doku', 'Grealish', 'Kovacic', 'Lewis', 'Haaland'],
      awaySubs: ['Gollini', 'Ndombele', 'Simeone', 'Giacomo Raspadori', 'Galette', 'Demme', 'Zanoli'],
      homeCoach: 'Pep Guardiola', awayCoach: 'Francesco Calzona',
    },
    {
      homeTeam: 'Bayern Munich', awayTeam: 'Dortmund',
      homeFormation: '4-2-3-1', awayFormation: '4-2-3-1',
      homeXI: ['Neuer', 'Kimmich', 'Upamecano', 'Kim', 'Davies', 'Goretzka', 'Musiala', 'Sané', 'Müller', 'Gnabry', 'Kane'],
      awayXI: ['Kobel', 'Ryerson', 'Hummels', 'Schlotterbeck', 'Maatsen', 'Can', 'Sabitzer', 'Brandt', 'Adeyemi', 'Mukoko', 'Füllkrug'],
      homeSubs: ['Ulreich', 'Pavlović', 'Tel', 'Laimer', 'Choupo-Moting'],
      awaySubs: ['Lotka', 'Wolf', 'Reyna', 'Nmecha', 'Bensebaini'],
      homeCoach: 'Thomas Tuchel', awayCoach: 'Edin Terzić',
    },
    {
      homeTeam: 'Liverpool', awayTeam: 'Arsenal',
      homeFormation: '4-3-3', awayFormation: '4-3-3',
      homeXI: ['Alisson', 'Alexander-Arnold', 'van Dijk', 'Konaté', 'Robertson', 'Mac Allister', 'Szoboszlai', 'Endo', 'Salah', 'Núñez', 'Díaz'],
      awayXI: ['Raya', 'White', 'Saliba', 'Gabriel', 'Zinchenko', 'Ødegaard', 'Rice', 'Havertz', 'Saka', 'Martinelli', 'Trossard'],
      homeSubs: ['Kelleher', 'Gomez', 'Jones', 'Elliott', 'Gakpo'],
      awaySubs: ['Turner', 'Kiwior', 'Jorginho', 'Vieira', 'Nketiah'],
      homeCoach: 'Arne Slot', awayCoach: 'Mikel Arteta',
    },
    {
      homeTeam: 'Tottenham', awayTeam: 'Chelsea',
      homeFormation: '4-2-3-1', awayFormation: '4-2-3-1',
      homeXI: ['Vicario', 'Porro', 'Romero', 'van de Ven', 'Udogie', 'Bissouma', 'Sarr', 'Kulusevski', 'Maddison', 'Son', 'Richarlison'],
      awayXI: ['Sánchez', 'Gusto', 'Thiago Silva', 'Chalobah', 'Chilwell', 'Caicedo', 'Enzo', 'Palmer', 'Mudryk', 'Jackson', 'Nkunku'],
      homeSubs: ['Forster', 'Dier', 'Bentancur', 'Lo Celso', 'Werner'],
      awaySubs: ['Petrovic', 'Cucurella', 'Gallagher', 'Sterling', 'Broja'],
      homeCoach: 'Ange Postecoglou', awayCoach: 'Enzo Maresca',
    },
    {
      homeTeam: 'AC Milan', awayTeam: 'Inter Milan',
      homeFormation: '4-2-3-1', awayFormation: '3-5-2',
      homeXI: ['Maignan', 'Calabria', 'Tomori', 'Thiaw', 'Theo', 'Reijnders', 'Loftus-Cheek', 'Pulisic', 'Leão', 'Chukwueze', 'Giroud'],
      awayXI: ['Sommer', 'Pavard', 'Acerbi', 'Bastoni', 'Dumfries', 'Barella', 'Çalhanoğlu', 'Mkhitaryan', 'Dimarco', 'Lautaro', 'Thuram'],
      homeSubs: ['Sportiello', 'Florenzi', 'Adli', 'Jović', 'Okafor'],
      awaySubs: ['Audero', "D'Ambrosio", 'Frattesi', 'Arnautović', 'Cuadrado'],
      homeCoach: 'Stefano Pioli', awayCoach: 'Simone Inzaghi',
    },
  ];

  for (const ld of lineupData) {
    const matchId = createdMatches[`${ld.homeTeam}-${ld.awayTeam}`];
    if (!matchId) continue;

    // Build startXI with position info based on formation
    const buildStartXI = (names: string[], formation: string) => {
      const lines = formation.split('-').map(Number);
      const positions: string[] = [];
      // GK
      positions.push('GK');
      // Defenders
      for (let i = 0; i < lines[0]; i++) positions.push('DF');
      // Midfielders
      for (const count of lines.slice(1, -1)) {
        for (let i = 0; i < count; i++) positions.push('MF');
      }
      // Forwards
      for (let i = 0; i < lines[lines.length - 1]; i++) positions.push('FW');

      return names.map((name, i) => {
        const p = playerData.find(pd => pd.name === name);
        return {
          name,
          number: p?.shirtNumber || i + 1,
          position: positions[i] || 'MF',
          rating: p?.rating || 7.0,
        };
      });
    };

    const buildSubs = (names: string[]) => {
      return names.map((name, i) => {
        const p = playerData.find(pd => pd.name === name);
        return {
          name,
          number: p?.shirtNumber || 30 + i,
          position: p?.position || 'MF',
        };
      });
    };

    // Home lineup
    await prisma.matchLineup.create({
      data: {
        matchId,
        team: 'home',
        teamName: ld.homeTeam,
        formation: ld.homeFormation,
        startXI: JSON.stringify(buildStartXI(ld.homeXI, ld.homeFormation)),
        substitutes: JSON.stringify(buildSubs(ld.homeSubs)),
        coach: ld.homeCoach,
      },
    });

    // Away lineup
    await prisma.matchLineup.create({
      data: {
        matchId,
        team: 'away',
        teamName: ld.awayTeam,
        formation: ld.awayFormation,
        startXI: JSON.stringify(buildStartXI(ld.awayXI, ld.awayFormation)),
        substitutes: JSON.stringify(buildSubs(ld.awaySubs)),
        coach: ld.awayCoach,
      },
    });
  }

  // === MATCH STATS ===
  const matchStatsData: Array<{ homeTeam: string; awayTeam: string; stats: Record<string, number> }> = [
    {
      homeTeam: 'Real Madrid', awayTeam: 'Barcelona',
      stats: { homePossession: 56, awayPossession: 44, homeShots: 16, awayShots: 9, homeShotsOnTarget: 8, awayShotsOnTarget: 3, homeCorners: 6, awayCorners: 3, homeFouls: 11, awayFouls: 14, homeOffsides: 2, awayOffsides: 3, homeYellowCards: 1, awayYellowCards: 3, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 88.5, awayPassAccuracy: 84.2 },
    },
    {
      homeTeam: 'Manchester City', awayTeam: 'Napoli',
      stats: { homePossession: 64, awayPossession: 36, homeShots: 8, awayShots: 3, homeShotsOnTarget: 2, awayShotsOnTarget: 1, homeCorners: 4, awayCorners: 1, homeFouls: 6, awayFouls: 9, homeOffsides: 1, awayOffsides: 2, homeYellowCards: 1, awayYellowCards: 2, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 91.3, awayPassAccuracy: 79.8 },
    },
    {
      homeTeam: 'Bayern Munich', awayTeam: 'Dortmund',
      stats: { homePossession: 60, awayPossession: 40, homeShots: 14, awayShots: 10, homeShotsOnTarget: 6, awayShotsOnTarget: 5, homeCorners: 7, awayCorners: 4, homeFouls: 9, awayFouls: 12, homeOffsides: 3, awayOffsides: 2, homeYellowCards: 2, awayYellowCards: 2, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 87.1, awayPassAccuracy: 82.5 },
    },
    {
      homeTeam: 'PSG', awayTeam: 'Marseille',
      stats: { homePossession: 62, awayPossession: 38, homeShots: 11, awayShots: 6, homeShotsOnTarget: 4, awayShotsOnTarget: 2, homeCorners: 5, awayCorners: 2, homeFouls: 8, awayFouls: 13, homeOffsides: 2, awayOffsides: 1, homeYellowCards: 1, awayYellowCards: 2, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 89.2, awayPassAccuracy: 80.4 },
    },
    {
      homeTeam: 'Liverpool', awayTeam: 'Arsenal',
      stats: { homePossession: 48, awayPossession: 52, homeShots: 12, awayShots: 14, homeShotsOnTarget: 5, awayShotsOnTarget: 6, homeCorners: 5, awayCorners: 6, homeFouls: 10, awayFouls: 8, homeOffsides: 3, awayOffsides: 2, homeYellowCards: 2, awayYellowCards: 1, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 85.3, awayPassAccuracy: 87.8 },
    },
    {
      homeTeam: 'Tottenham', awayTeam: 'Chelsea',
      stats: { homePossession: 45, awayPossession: 55, homeShots: 9, awayShots: 15, homeShotsOnTarget: 4, awayShotsOnTarget: 7, homeCorners: 3, awayCorners: 7, homeFouls: 12, awayFouls: 9, homeOffsides: 2, awayOffsides: 1, homeYellowCards: 3, awayYellowCards: 1, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 82.1, awayPassAccuracy: 88.9 },
    },
    {
      homeTeam: 'AC Milan', awayTeam: 'Inter Milan',
      stats: { homePossession: 42, awayPossession: 58, homeShots: 7, awayShots: 13, homeShotsOnTarget: 2, awayShotsOnTarget: 5, homeCorners: 3, awayCorners: 6, homeFouls: 14, awayFouls: 7, homeOffsides: 1, awayOffsides: 2, homeYellowCards: 4, awayYellowCards: 1, homeRedCards: 1, awayRedCards: 0, homePassAccuracy: 80.5, awayPassAccuracy: 89.7 },
    },
    {
      homeTeam: 'Celtic', awayTeam: 'Rangers',
      stats: { homePossession: 54, awayPossession: 46, homeShots: 13, awayShots: 8, homeShotsOnTarget: 6, awayShotsOnTarget: 3, homeCorners: 5, awayCorners: 3, homeFouls: 9, awayFouls: 11, homeOffsides: 2, awayOffsides: 1, homeYellowCards: 1, awayYellowCards: 2, homeRedCards: 0, awayRedCards: 0, homePassAccuracy: 84.3, awayPassAccuracy: 81.7 },
    },
  ];

  for (const ms of matchStatsData) {
    const matchId = createdMatches[`${ms.homeTeam}-${ms.awayTeam}`];
    if (!matchId) continue;
    await prisma.matchStats.create({
      data: { matchId, ...ms.stats },
    });
  }

  // === STANDINGS ===
  const standings = [
    { position: 1, team: 'Liverpool', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg', played: 28, won: 21, drawn: 5, lost: 2, gf: 62, ga: 22, gd: 40, points: 68, league: 'Premier League', form: JSON.stringify(['W','W','D','W','W']) },
    { position: 2, team: 'Arsenal', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', played: 28, won: 19, drawn: 6, lost: 3, gf: 58, ga: 21, gd: 37, points: 63, league: 'Premier League', form: JSON.stringify(['W','D','W','W','L']) },
    { position: 3, team: 'Manchester City', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', played: 28, won: 18, drawn: 5, lost: 5, gf: 60, ga: 28, gd: 32, points: 59, league: 'Premier League', form: JSON.stringify(['W','W','D','L','W']) },
    { position: 4, team: 'Aston Villa', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Aston_Villa_FC_crest_%282023%29.svg', played: 28, won: 16, drawn: 4, lost: 8, gf: 52, ga: 33, gd: 19, points: 52, league: 'Premier League', form: JSON.stringify(['W','W','L','W','W']) },
    { position: 5, team: 'Chelsea', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', played: 28, won: 15, drawn: 5, lost: 8, gf: 50, ga: 35, gd: 15, points: 50, league: 'Premier League', form: JSON.stringify(['W','L','W','W','W']) },
    { position: 6, team: 'Tottenham', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', played: 28, won: 14, drawn: 4, lost: 10, gf: 53, ga: 42, gd: 11, points: 46, league: 'Premier League', form: JSON.stringify(['L','W','D','L','W']) },
    { position: 1, team: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', played: 27, won: 21, drawn: 4, lost: 2, gf: 65, ga: 20, gd: 45, points: 67, league: 'La Liga', form: JSON.stringify(['W','W','D','W','W']) },
    { position: 2, team: 'Barcelona', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', played: 27, won: 19, drawn: 5, lost: 3, gf: 60, ga: 25, gd: 35, points: 62, league: 'La Liga', form: JSON.stringify(['W','L','W','W','D']) },
    { position: 3, team: 'Atletico Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_Badge.svg', played: 27, won: 18, drawn: 4, lost: 5, gf: 52, ga: 22, gd: 30, points: 58, league: 'La Liga', form: JSON.stringify(['W','D','W','L','W']) },
    { position: 4, team: 'Sevilla', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg', played: 27, won: 14, drawn: 6, lost: 7, gf: 40, ga: 30, gd: 10, points: 48, league: 'La Liga', form: JSON.stringify(['L','W','D','W','L']) },
    { position: 1, team: 'Inter Milan', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg', played: 27, won: 22, drawn: 3, lost: 2, gf: 63, ga: 18, gd: 45, points: 69, league: 'Serie A', form: JSON.stringify(['W','W','W','D','W']) },
    { position: 2, team: 'Juventus', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Juventus_logo.svg', played: 27, won: 17, drawn: 7, lost: 3, gf: 48, ga: 20, gd: 28, points: 58, league: 'Serie A', form: JSON.stringify(['D','W','W','L','W']) },
    { position: 3, team: 'AC Milan', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg', played: 27, won: 16, drawn: 5, lost: 6, gf: 50, ga: 30, gd: 20, points: 53, league: 'Serie A', form: JSON.stringify(['D','L','W','D','L']) },
    { position: 4, team: 'Roma', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/AS_Roma_logo_%282017%29.svg', played: 27, won: 15, drawn: 4, lost: 8, gf: 45, ga: 32, gd: 13, points: 49, league: 'Serie A', form: JSON.stringify(['W','L','D','W','W']) },
    // --- Bundesliga ---
    { position: 1, team: 'Bayern Munich', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', played: 26, won: 20, drawn: 3, lost: 3, gf: 62, ga: 20, gd: 42, points: 63, league: 'Bundesliga', form: JSON.stringify(['W','W','D','W','W']) },
    { position: 2, team: 'Leverkusen', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg', played: 26, won: 18, drawn: 4, lost: 4, gf: 58, ga: 25, gd: 33, points: 58, league: 'Bundesliga', form: JSON.stringify(['W','W','D','W','L']) },
    { position: 3, team: 'Dortmund', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg', played: 26, won: 17, drawn: 5, lost: 4, gf: 55, ga: 30, gd: 25, points: 56, league: 'Bundesliga', form: JSON.stringify(['D','W','W','L','W']) },
    { position: 4, team: 'Stuttgart', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/0/02/VfB_Stuttgart_1893_logo.svg', played: 26, won: 15, drawn: 5, lost: 6, gf: 50, ga: 32, gd: 18, points: 50, league: 'Bundesliga', form: JSON.stringify(['W','D','W','W','L']) },
    { position: 5, team: 'RB Leipzig', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/e2/RB_Leipzig_2014_logo.svg', played: 26, won: 14, drawn: 4, lost: 8, gf: 52, ga: 35, gd: 17, points: 46, league: 'Bundesliga', form: JSON.stringify(['W','L','W','D','W']) },
    { position: 6, team: 'Frankfurt', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Eintracht_Frankfurt_logo.svg', played: 26, won: 12, drawn: 6, lost: 8, gf: 48, ga: 38, gd: 10, points: 42, league: 'Bundesliga', form: JSON.stringify(['D','W','L','W','W']) },
    { position: 7, team: 'Freiburg', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/6/6d/SC_Freiburg_logo.svg', played: 26, won: 11, drawn: 5, lost: 10, gf: 40, ga: 40, gd: 0, points: 38, league: 'Bundesliga', form: JSON.stringify(['L','W','D','L','W']) },
    { position: 8, team: 'Wolfsburg', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/2/28/VfL_Wolfsburg_logo.svg', played: 26, won: 10, drawn: 5, lost: 11, gf: 38, ga: 42, gd: -4, points: 35, league: 'Bundesliga', form: JSON.stringify(['L','D','W','L','L']) },
    // --- Ligue 1 ---
    { position: 1, team: 'PSG', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', played: 26, won: 20, drawn: 4, lost: 2, gf: 60, ga: 18, gd: 42, points: 64, league: 'Ligue 1', form: JSON.stringify(['W','W','W','D','W']) },
    { position: 2, team: 'Marseille', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Olympique_de_Marseille_logo.svg', played: 26, won: 16, drawn: 5, lost: 5, gf: 48, ga: 28, gd: 20, points: 53, league: 'Ligue 1', form: JSON.stringify(['W','D','W','W','L']) },
    { position: 3, team: 'Monaco', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/AS_Monaco_logo.svg', played: 26, won: 15, drawn: 5, lost: 6, gf: 50, ga: 30, gd: 20, points: 50, league: 'Ligue 1', form: JSON.stringify(['W','W','D','W','L']) },
    { position: 4, team: 'Lille', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Lille_OSC_logo.svg', played: 26, won: 14, drawn: 4, lost: 8, gf: 42, ga: 30, gd: 12, points: 46, league: 'Ligue 1', form: JSON.stringify(['W','L','W','W','D']) },
    { position: 5, team: 'Lyon', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Olympique_Lyonnais_logo.svg', played: 26, won: 12, drawn: 5, lost: 9, gf: 45, ga: 38, gd: 7, points: 41, league: 'Ligue 1', form: JSON.stringify(['D','W','L','D','W']) },
    { position: 6, team: 'Nice', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/8/81/OGC_Nice_logo.svg', played: 26, won: 11, drawn: 5, lost: 10, gf: 38, ga: 35, gd: 3, points: 38, league: 'Ligue 1', form: JSON.stringify(['L','W','D','L','W']) },
    // --- BRI Liga 1 (Indonesia) ---
    { position: 1, team: 'Persib Bandung', teamLogo: '', played: 26, won: 16, drawn: 5, lost: 5, gf: 45, ga: 22, gd: 23, points: 53, league: 'Liga 1 Indonesia', form: JSON.stringify(['W','W','D','W','W']) },
    { position: 2, team: 'Persija Jakarta', teamLogo: '', played: 26, won: 15, drawn: 6, lost: 5, gf: 42, ga: 24, gd: 18, points: 51, league: 'Liga 1 Indonesia', form: JSON.stringify(['W','D','W','W','L']) },
    { position: 3, team: 'Arema FC', teamLogo: '', played: 26, won: 14, drawn: 4, lost: 8, gf: 40, ga: 30, gd: 10, points: 46, league: 'Liga 1 Indonesia', form: JSON.stringify(['W','L','W','D','W']) },
    { position: 4, team: 'Bali United', teamLogo: '', played: 26, won: 13, drawn: 5, lost: 8, gf: 38, ga: 28, gd: 10, points: 44, league: 'Liga 1 Indonesia', form: JSON.stringify(['W','W','L','W','D']) },
    { position: 5, team: 'PSM Makassar', teamLogo: '', played: 26, won: 12, drawn: 6, lost: 8, gf: 35, ga: 28, gd: 7, points: 42, league: 'Liga 1 Indonesia', form: JSON.stringify(['D','W','W','L','W']) },
    { position: 6, team: 'Persebaya Surabaya', teamLogo: '', played: 26, won: 11, drawn: 5, lost: 10, gf: 34, ga: 32, gd: 2, points: 38, league: 'Liga 1 Indonesia', form: JSON.stringify(['L','W','D','W','D']) },
    { position: 7, team: 'Borneo FC', teamLogo: '', played: 26, won: 10, drawn: 5, lost: 11, gf: 30, ga: 35, gd: -5, points: 35, league: 'Liga 1 Indonesia', form: JSON.stringify(['L','D','W','L','L']) },
    { position: 8, team: 'PSIS Semarang', teamLogo: '', played: 26, won: 8, drawn: 6, lost: 12, gf: 25, ga: 38, gd: -13, points: 30, league: 'Liga 1 Indonesia', form: JSON.stringify(['L','L','D','L','W']) },
    // --- Eredivisie ---
    { position: 1, team: 'PSV', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/PSV_Eindhoven_Logo.svg', played: 26, won: 22, drawn: 2, lost: 2, gf: 70, ga: 18, gd: 52, points: 68, league: 'Eredivisie', form: JSON.stringify(['W','W','W','D','W']) },
    { position: 2, team: 'Ajax', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Ajax_Amsterdam_logo.svg', played: 26, won: 18, drawn: 4, lost: 4, gf: 58, ga: 25, gd: 33, points: 58, league: 'Eredivisie', form: JSON.stringify(['W','W','D','W','W']) },
    { position: 3, team: 'Feyenoord', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Feyenoord_logo.svg', played: 26, won: 17, drawn: 3, lost: 6, gf: 55, ga: 30, gd: 25, points: 54, league: 'Eredivisie', form: JSON.stringify(['W','D','W','L','W']) },
    { position: 4, team: 'AZ Alkmaar', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/4/45/AZ_Alkmaar_logo.svg', played: 26, won: 14, drawn: 5, lost: 7, gf: 48, ga: 32, gd: 16, points: 47, league: 'Eredivisie', form: JSON.stringify(['D','W','L','W','W']) },
    { position: 5, team: 'Twente', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/0/0e/FC_Twente_logo.svg', played: 26, won: 13, drawn: 5, lost: 8, gf: 45, ga: 33, gd: 12, points: 44, league: 'Eredivisie', form: JSON.stringify(['W','L','W','D','W']) },
    { position: 6, team: 'Utrecht', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/8/86/FC_Utrecht_logo.svg', played: 26, won: 11, drawn: 6, lost: 9, gf: 40, ga: 35, gd: 5, points: 39, league: 'Eredivisie', form: JSON.stringify(['D','W','L','W','D']) },
    // --- Champions League ---
    { position: 1, team: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', played: 6, won: 4, drawn: 1, lost: 1, gf: 12, ga: 5, gd: 7, points: 13, league: 'Champions League', form: JSON.stringify(['W','D','W','W','L']) },
    { position: 2, team: 'Manchester City', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', played: 6, won: 3, drawn: 2, lost: 1, gf: 10, ga: 5, gd: 5, points: 11, league: 'Champions League', form: JSON.stringify(['W','W','D','W','D']) },
    { position: 3, team: 'Barcelona', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', played: 6, won: 3, drawn: 1, lost: 2, gf: 9, ga: 7, gd: 2, points: 10, league: 'Champions League', form: JSON.stringify(['W','L','W','D','L']) },
    { position: 4, team: 'Inter Milan', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg', played: 6, won: 3, drawn: 1, lost: 2, gf: 8, ga: 6, gd: 2, points: 10, league: 'Champions League', form: JSON.stringify(['W','D','L','W','W']) },
    { position: 5, team: 'Bayern Munich', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', played: 6, won: 2, drawn: 2, lost: 2, gf: 8, ga: 7, gd: 1, points: 8, league: 'Champions League', form: JSON.stringify(['D','W','L','D','W']) },
    { position: 6, team: 'Arsenal', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', played: 6, won: 2, drawn: 2, lost: 2, gf: 7, ga: 6, gd: 1, points: 8, league: 'Champions League', form: JSON.stringify(['W','D','W','L','D']) },
    { position: 7, team: 'PSG', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', played: 6, won: 2, drawn: 1, lost: 3, gf: 7, ga: 8, gd: -1, points: 7, league: 'Champions League', form: JSON.stringify(['L','W','D','L','W']) },
    { position: 8, team: 'Dortmund', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg', played: 6, won: 1, drawn: 2, lost: 3, gf: 5, ga: 9, gd: -4, points: 5, league: 'Champions League', form: JSON.stringify(['L','D','L','W','D']) },
  ];

  for (const standing of standings) {
    await prisma.standing.create({ data: standing });
  }

  // === SCORERS ===
  const scorers = [
    { name: 'Erling Haaland', team: 'Manchester City', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', goals: 24, assists: 5, matches: 27, league: 'Premier League' },
    { name: 'Kylian Mbappé', team: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', goals: 22, assists: 7, matches: 26, league: 'La Liga' },
    { name: 'Lautaro Martínez', team: 'Inter Milan', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg', goals: 21, assists: 4, matches: 27, league: 'Serie A' },
    { name: 'Mohamed Salah', team: 'Liverpool', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg', goals: 19, assists: 11, matches: 27, league: 'Premier League' },
    { name: 'Harry Kane', team: 'Bayern Munich', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', goals: 28, assists: 8, matches: 25, league: 'Bundesliga' },
    { name: 'Robert Lewandowski', team: 'Barcelona', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', goals: 18, assists: 3, matches: 26, league: 'La Liga' },
    { name: 'Cole Palmer', team: 'Chelsea', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', goals: 17, assists: 9, matches: 27, league: 'Premier League' },
    { name: 'Viktor Gyökeres', team: 'Sporting CP', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/e3/Sporting_Clube_de_Portugal_%28logo%29.svg', goals: 25, assists: 6, matches: 24, league: 'Primeira Liga' },
    { name: 'Bukayo Saka', team: 'Arsenal', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', goals: 15, assists: 10, matches: 27, league: 'Premier League' },
    { name: 'Jude Bellingham', team: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', goals: 14, assists: 8, matches: 26, league: 'La Liga' },
    // --- Bundesliga scorers ---
    { name: 'Harry Kane', team: 'Bayern Munich', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', goals: 28, assists: 8, matches: 25, league: 'Bundesliga' },
    { name: 'Jamal Musiala', team: 'Bayern Munich', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', goals: 8, assists: 7, matches: 24, league: 'Bundesliga' },
    // --- Ligue 1 scorers ---
    { name: 'Ousmane Dembélé', team: 'PSG', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', goals: 12, assists: 8, matches: 26, league: 'Ligue 1' },
    { name: 'Marc Cucres', team: 'Marseille', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Olympique_de_Marseille_logo.svg', goals: 10, assists: 5, matches: 25, league: 'Ligue 1' },
    // --- Eredivisie scorers ---
    { name: 'Tyrese Asante', team: 'PSV', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/PSV_Eindhoven_Logo.svg', goals: 15, assists: 6, matches: 24, league: 'Eredivisie' },
    { name: 'Brian Brobbey', team: 'Ajax', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Ajax_Amsterdam_logo.svg', goals: 14, assists: 5, matches: 25, league: 'Eredivisie' },
    { name: 'Santiago Giménez', team: 'Feyenoord', teamLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Feyenoord_logo.svg', goals: 13, assists: 4, matches: 23, league: 'Eredivisie' },
    // --- Liga 1 Indonesia scorers ---
    { name: 'David Da Silva', team: 'Persib Bandung', teamLogo: '', goals: 16, assists: 4, matches: 24, league: 'Liga 1 Indonesia' },
    { name: 'Marko Simic', team: 'Persija Jakarta', teamLogo: '', goals: 14, assists: 3, matches: 25, league: 'Liga 1 Indonesia' },
    { name: 'Ilija Spasojevic', team: 'Bali United', teamLogo: '', goals: 12, assists: 5, matches: 23, league: 'Liga 1 Indonesia' },
    // --- Champions League scorers ---
    { name: 'Vinícius Jr.', team: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', goals: 5, assists: 3, matches: 6, league: 'Champions League' },
    { name: 'Erling Haaland', team: 'Manchester City', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', goals: 4, assists: 2, matches: 6, league: 'Champions League' },
    { name: 'Lamine Yamal', team: 'Barcelona', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', goals: 3, assists: 3, matches: 6, league: 'Champions League' },
  ];

  for (const scorer of scorers) {
    await prisma.scorer.create({ data: scorer });
  }

  // === POLLS ===
  const allMatches = await prisma.match.findMany();
  for (const match of allMatches) {
    const homeVotes = Math.floor(Math.random() * 500) + 100;
    const drawVotes = Math.floor(Math.random() * 200) + 50;
    const awayVotes = Math.floor(Math.random() * 500) + 100;
    await prisma.poll.create({
      data: { matchId: match.id, homeVotes, drawVotes, awayVotes },
    });
  }

  // === NEWS ===
  const news = [
    { title: 'Mbappé shines in El Clásico with stunning goal', summary: 'The French star netted a brilliant goal to seal Real Madrid\'s victory over Barcelona at the Bernabéu.', category: 'Match Report', source: 'GoalZone' },
    { title: 'Transfer: Haaland hints at future move', summary: 'Manchester City striker Erling Haaland has dropped hints about a potential transfer in the upcoming window.', category: 'Transfer', source: 'Sky Sports' },
    { title: 'Champions League quarter-final draw revealed', summary: 'The draw for the Champions League quarter-finals has been made, with some mouth-watering ties in store.', category: 'Competition', source: 'UEFA' },
    { title: 'Palmer named Premier League Player of the Month', summary: 'Chelsea\'s Cole Palmer has been awarded the Premier League Player of the Month for his outstanding performances.', category: 'Award', source: 'Premier League' },
    { title: 'Kane breaks Bundesliga scoring record', summary: 'Harry Kane has set a new single-season scoring record in the Bundesliga with 28 goals and counting.', category: 'Record', source: 'Bundesliga' },
  ];

  for (const item of news) {
    await prisma.newsItem.create({ data: item });
  }

  console.log('✅ Seed completed successfully!');
  console.log(`  - ${playerData.length} players`);
  console.log(`  - ${Object.keys(statsData).length} player stats (detailed)`);
  console.log(`  - ${matches.length} matches`);
  console.log(`  - ${lineupData.length * 2} lineups`);
  console.log(`  - ${matchStatsData.length} match stats`);
  console.log(`  - ${standings.length} standings`);
  console.log(`  - ${scorers.length} scorers`);
  console.log(`  - ${allMatches.length} polls`);
  console.log(`  - ${news.length} news items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
