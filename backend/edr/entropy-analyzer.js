const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;

const execPromise = util.promisify(exec);

/**
 * Analyse l'entropie d'un fichier pour détecter le chiffrement
 * Entropie élevée (> 7.5) = probablement chiffré
 */
async function calculateFileEntropy(filePath) {
    try {
        // Lire un échantillon du fichier (premiers 64KB pour performance)
        const buffer = await fs.readFile(filePath, { flag: 'r' });
        const sample = buffer.slice(0, Math.min(65536, buffer.length));

        // Calculer la fréquence de chaque octet
        const frequency = new Array(256).fill(0);
        for (let i = 0; i < sample.length; i++) {
            frequency[sample[i]]++;
        }

        // Calculer l'entropie de Shannon
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (frequency[i] > 0) {
                const p = frequency[i] / sample.length;
                entropy -= p * Math.log2(p);
            }
        }

        return {
            entropy: entropy.toFixed(2),
            encrypted: entropy > 7.5,
            fileSize: buffer.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Scanner un répertoire pour détecter les fichiers chiffrés
 */
async function scanDirectoryEntropy(mountPoint, options = {}) {
    const maxFiles = options.maxFiles || 100;
    const threshold = options.threshold || 7.5;

    try {
        // Lister les fichiers (limité pour performance)
        const { stdout } = await execPromise(
            `find "${mountPoint}" -type f -size +1k -size -10M 2>/dev/null | head -${maxFiles}`,
            { timeout: 30000 }
        );

        const files = stdout.trim().split('\n').filter(f => f);
        const results = {
            total_scanned: 0,
            encrypted_files: [],
            high_entropy_count: 0,
            avg_entropy: 0,
            status: 'normal'
        };

        let totalEntropy = 0;
        const sampleSize = Math.min(20, files.length); // Échantillon de 20 fichiers

        for (let i = 0; i < sampleSize; i++) {
            const file = files[i];
            const analysis = await calculateFileEntropy(file);

            if (analysis) {
                results.total_scanned++;
                totalEntropy += parseFloat(analysis.entropy);

                if (analysis.encrypted) {
                    results.high_entropy_count++;
                    results.encrypted_files.push({
                        file: file.replace(mountPoint, ''),
                        entropy: analysis.entropy,
                        size: analysis.fileSize
                    });
                }
            }
        }

        results.avg_entropy = (totalEntropy / results.total_scanned).toFixed(2);

        // Déterminer le statut
        const encryptedRatio = results.high_entropy_count / results.total_scanned;
        if (encryptedRatio > 0.7) {
            results.status = 'highly_encrypted'; // Probablement ransomware
        } else if (encryptedRatio > 0.3) {
            results.status = 'partially_encrypted'; // Suspect
        } else if (results.avg_entropy > 7.0) {
            results.status = 'suspicious';
        }

        return results;
    } catch (error) {
        console.error('[ENTROPY] Scan error:', error);
        return {
            total_scanned: 0,
            encrypted_files: [],
            high_entropy_count: 0,
            avg_entropy: 0,
            status: 'error',
            error: error.message
        };
    }
}

module.exports = {
    calculateFileEntropy,
    scanDirectoryEntropy
};
