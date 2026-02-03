const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Extensions communes de ransomware
 */
const RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.locked', '.crypto', '.crypt', '.cerber',
    '.locky', '.zepto', '.osiris', '.wannacry', '.wcry',
    '.wncry', '.cryptolocker', '.vault', '.exx', '.ezz',
    '.ecc', '.ezz', '.xyz', '.zzz', '.aaa', '.abc',
    '.ccc', '.vvv', '.xxx', '.ttt', '.micro', '.RSA',
    '.crjoker', '.EnCiPhErEd', '.LeChiffre', '.keybtc@inbox_com',
    '.0x0', '.bleep', '.1999', '.darkness', '.revenge',
    '.corona', '.crypted', '.encrypted', '.enc'
];

/**
 * Noms de fichiers typiques de notes de rançon
 */
const RANSOM_NOTE_PATTERNS = [
    'README.txt', 'READ_ME.txt', 'READ ME.txt',
    'HOW_TO_DECRYPT', 'DECRYPT_INSTRUCTIONS',
    'HELP_DECRYPT', 'FILES_ENCRYPTED',
    'YOUR_FILES_ARE_ENCRYPTED', 'RESTORE_FILES',
    'HOW TO DECRYPT FILES.txt', 'HELP_YOUR_FILES.txt',
    '!!!READ_ME!!!.txt', 'DECRYPT_INSTRUCTION.txt',
    'HOW_TO_RESTORE_FILES.txt', 'RECOVERY_INSTRUCTIONS.txt',
    'RESTORE.txt', 'Unlock-Instructions.txt'
];

/**
 * Détecte les fichiers avec extensions ransomware
 */
async function detectRansomwareExtensions(mountPoint) {
    try {
        const extensionsPattern = RANSOMWARE_EXTENSIONS
            .map(ext => `-iname "*${ext}"`)
            .join(' -o ');

        const { stdout } = await execPromise(
            `find "${mountPoint}" -type f \\( ${extensionsPattern} \\) 2>/dev/null | head -100`,
            { timeout: 20000 }
        );

        const files = stdout.trim().split('\n').filter(f => f);
        return files.map(f => ({
            file: f.replace(mountPoint, ''),
            threat: 'Ransomware encrypted file detected',
            detection: 'Extension Analysis'
        }));
    } catch (error) {
        console.error('[RANSOMWARE] Extension detection error:', error);
        return [];
    }
}

/**
 * Détecte les notes de rançon
 */
async function detectRansomNotes(mountPoint) {
    try {
        const notesPattern = RANSOM_NOTE_PATTERNS
            .map(name => `-iname "${name}"`)
            .join(' -o ');

        const { stdout } = await execPromise(
            `find "${mountPoint}" -type f \\( ${notesPattern} \\) 2>/dev/null`,
            { timeout: 20000 }
        );

        const files = stdout.trim().split('\n').filter(f => f);
        return files.map(f => ({
            file: f.replace(mountPoint, ''),
            threat: 'Ransom note detected',
            detection: 'Pattern Matching'
        }));
    } catch (error) {
        console.error('[RANSOMWARE] Ransom note detection error:', error);
        return [];
    }
}

/**
 * Détecte les modifications massives récentes (comportement typique ransomware)
 */
async function detectMassModification(mountPoint) {
    try {
        // Fichiers modifiés dans les dernières 24h
        const { stdout: recentFiles } = await execPromise(
            `find "${mountPoint}" -type f -mtime -1 2>/dev/null | wc -l`,
            { timeout: 15000 }
        );

        // Tous les fichiers
        const { stdout: totalFiles } = await execPromise(
            `find "${mountPoint}" -type f 2>/dev/null | wc -l`,
            { timeout: 15000 }
        );

        const recent = parseInt(recentFiles.trim());
        const total = parseInt(totalFiles.trim());

        // Si plus de 80% des fichiers ont été modifiés récemment
        const modificationRatio = recent / total;

        return {
            recent_modifications: recent,
            total_files: total,
            modification_ratio: modificationRatio.toFixed(2),
            suspicious: modificationRatio > 0.8,
            threat_level: modificationRatio > 0.8 ? 'high' : (modificationRatio > 0.5 ? 'medium' : 'low')
        };
    } catch (error) {
        console.error('[RANSOMWARE] Mass modification detection error:', error);
        return {
            recent_modifications: 0,
            total_files: 0,
            modification_ratio: 0,
            suspicious: false,
            threat_level: 'unknown'
        };
    }
}

/**
 * Analyse complète ransomware
 */
async function scanForRansomware(mountPoint) {
    console.log(`[RANSOMWARE] Starting scan on ${mountPoint}`);

    try {
        const [extensionThreats, ransomNotes, massModification] = await Promise.all([
            detectRansomwareExtensions(mountPoint),
            detectRansomNotes(mountPoint),
            detectMassModification(mountPoint)
        ]);

        const allThreats = [...extensionThreats, ...ransomNotes];

        const result = {
            ransomware_detected: allThreats.length > 0 || massModification.suspicious,
            threats: allThreats,
            extension_threats: extensionThreats.length,
            ransom_notes_found: ransomNotes.length,
            mass_modification: massModification,
            risk_score: calculateRiskScore(extensionThreats.length, ransomNotes.length, massModification)
        };

        console.log(`[RANSOMWARE] Scan complete: ${result.ransomware_detected ? 'THREATS FOUND' : 'Clean'}`);
        return result;
    } catch (error) {
        console.error('[RANSOMWARE] Scan error:', error);
        return {
            ransomware_detected: false,
            threats: [],
            extension_threats: 0,
            ransom_notes_found: 0,
            mass_modification: { suspicious: false },
            risk_score: 0,
            error: error.message
        };
    }
}

/**
 * Calcule un score de risque (0-100)
 */
function calculateRiskScore(extensionCount, noteCount, massModification) {
    let score = 0;

    // Extensions suspectes (max 40 points)
    score += Math.min(extensionCount * 2, 40);

    // Notes de rançon (max 30 points)
    score += Math.min(noteCount * 15, 30);

    // Modifications massives (max 30 points)
    if (massModification.suspicious) {
        score += 30;
    } else if (massModification.modification_ratio > 0.5) {
        score += 15;
    }

    return Math.min(score, 100);
}

module.exports = {
    scanForRansomware,
    detectRansomwareExtensions,
    detectRansomNotes,
    detectMassModification,
    RANSOMWARE_EXTENSIONS,
    RANSOM_NOTE_PATTERNS
};
