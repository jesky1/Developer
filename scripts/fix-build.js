/**
 * GOALZONE Build Fix Script
 * Run this on your local machine to fix Turbopack build errors.
 * 
 * Usage: node scripts/fix-build.js
 * 
 * What it does:
 * 1. Finds all .ts/.tsx files importing getPlayersStatistics or transformPlayerStatsToDb
 * 2. Updates those imports to use '@/lib/player-stats-api' instead of '@/lib/football-api'
 * 3. Removes the .next cache directory to force a clean rebuild
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const NEXT_CACHE = path.join(ROOT_DIR, '.next');

// Files to skip
const SKIP_DIRS = ['node_modules', '.next', 'dist', 'out'];

/**
 * Recursively find all .ts/.tsx files
 */
function findTsFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (SKIP_DIRS.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findTsFiles(fullPath));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Check if a file imports getPlayersStatistics or transformPlayerStatsToDb from football-api
 */
function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // Pattern: import { ..., getPlayersStatistics, ... } from '@/lib/football-api'
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/football-api['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const imports = match[1];
        if (imports.includes('getPlayersStatistics') || imports.includes('transformPlayerStatsToDb')) {
            issues.push({
                fullMatch: match[0],
                imports: imports,
                index: match.index,
            });
        }
    }

    return issues;
}

/**
 * Fix a file by splitting the import into two: football-api and player-stats-api
 */
function fixFile(filePath, issues) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const issue of issues) {
        const importList = issue.imports
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const playerImports = [];
        const footballImports = [];

        for (const imp of importList) {
            if (imp === 'getPlayersStatistics' || imp === 'transformPlayerStatsToDb' || imp === 'FootballPlayerStats') {
                playerImports.push(imp);
            } else {
                footballImports.push(imp);
            }
        }

        // Build replacement imports
        let replacement = '';
        if (footballImports.length > 0) {
            replacement += `import { ${footballImports.join(', ')} } from '@/lib/football-api'`;
        }
        if (playerImports.length > 0) {
            if (replacement) replacement += '\n';
            const typePrefix = playerImports.includes('FootballPlayerStats') ? 'type ' : '';
            replacement += `import { ${playerImports.join(', ')} } from '@/lib/player-stats-api'`;
        }

        content = content.replace(issue.fullMatch, replacement);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }

    return modified;
}

/**
 * Delete .next cache directory
 */
function deleteNextCache() {
    if (fs.existsSync(NEXT_CACHE)) {
        console.log('🗑️  Deleting .next cache directory...');
        fs.rmSync(NEXT_CACHE, { recursive: true, force: true });
        console.log('✅ .next cache deleted');
    } else {
        console.log('ℹ️  No .next cache directory found');
    }
}

// --- Main ---

console.log('🔍 GOALZONE Build Fix Script');
console.log('=============================\n');

// Step 1: Find problematic files
console.log('Step 1: Searching for files importing getPlayersStatistics/transformPlayerStatsToDb from football-api...');
const tsFiles = findTsFiles(SRC_DIR);
const problematicFiles = [];

for (const file of tsFiles) {
    const issues = checkFile(file);
    if (issues.length > 0) {
        problematicFiles.push({ file, issues });
    }
}

if (problematicFiles.length === 0) {
    console.log('✅ No problematic imports found.\n');
} else {
    console.log(`⚠️  Found ${problematicFiles.length} file(s) with problematic imports:\n`);
    for (const { file, issues } of problematicFiles) {
        const relativePath = path.relative(ROOT_DIR, file);
        console.log(`  📄 ${relativePath}`);
        for (const issue of issues) {
            console.log(`     → ${issue.fullMatch.trim()}`);
        }
    }
    console.log('');

    // Step 2: Fix the imports
    console.log('Step 2: Fixing imports...');
    for (const { file, issues } of problematicFiles) {
        const relativePath = path.relative(ROOT_DIR, file);
        const wasFixed = fixFile(file, issues);
        if (wasFixed) {
            console.log(`  ✅ Fixed: ${relativePath}`);
        }
    }
    console.log('');
}

// Step 3: Verify player-stats-api.ts exists
const playerStatsApiPath = path.join(SRC_DIR, 'lib', 'player-stats-api.ts');
if (fs.existsSync(playerStatsApiPath)) {
    console.log('✅ src/lib/player-stats-api.ts exists');
} else {
    console.log('❌ src/lib/player-stats-api.ts NOT FOUND! You need to create this file.');
    console.log('   It should export: getPlayersStatistics, transformPlayerStatsToDb, FootballPlayerStats');
}

// Step 4: Delete .next cache
console.log('');
deleteNextCache();

console.log('\n✨ Done! Try running the build again:');
console.log('   node scripts/prisma-switch.js && npx prisma generate && next build\n');
