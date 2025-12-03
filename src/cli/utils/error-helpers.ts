import { readdirSync, existsSync } from 'fs';
import { basename, dirname, join } from 'path';

/**
 * Find similar files in directory when file not found
 */
export function findSimilarFiles(filepath: string): string[] {
  try {
    const dir = dirname(filepath);
    const filename = basename(filepath);
    
    if (!existsSync(dir)) {
      return [];
    }
    
    const files = readdirSync(dir);
    
    // Calculate Levenshtein distance for fuzzy matching
    const distances = files.map(file => ({
      file,
      distance: levenshteinDistance(filename.toLowerCase(), file.toLowerCase())
    }));
    
    // Sort by distance and return top 3 matches
    return distances
      .filter(d => d.distance <= 5) // Only suggest if reasonably similar
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(d => join(dir, d.file));
  } catch {
    return [];
  }
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Format error message with helpful suggestions
 */
export function formatFileNotFoundError(filepath: string): string {
  let message = `❌ Error: File not found: ${filepath}\n`;
  
  const similar = findSimilarFiles(filepath);
  
  if (similar.length > 0) {
    message += '\n   Did you mean:\n';
    similar.forEach(file => {
      message += `   • ${file}\n`;
    });
  } else {
    message += '\n   Make sure the file path is correct.\n';
  }
  
  message += '\n   Try: tonl analyze --help';
  
  return message;
}

/**
 * Format invalid JSON error with helpful context
 */
export function formatJSONError(filepath: string, error: Error): string {
  let message = `❌ Error: Invalid JSON in ${filepath}\n\n`;
  
  // Try to extract line number from error message
  const lineMatch = error.message.match(/position (\d+)/);
  if (lineMatch) {
    const position = parseInt(lineMatch[1]);
    message += `   Error near position ${position}\n`;
  }
  
  message += `   ${error.message}\n\n`;
  message += `   Common issues:\n`;
  message += `   • Missing quotes around strings\n`;
  message += `   • Trailing commas in objects/arrays\n`;
  message += `   • Unescaped special characters\n\n`;
  message += `   Tip: Validate your JSON at https://jsonlint.com`;
  
  return message;
}

/**
 * Format "did you mean" suggestion for commands
 */
export function suggestCommand(input: string, validCommands: string[]): string | null {
  const distances = validCommands.map(cmd => ({
    command: cmd,
    distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase())
  }));
  
  const closest = distances.sort((a, b) => a.distance - b.distance)[0];
  
  // Only suggest if distance is <= 3 (close enough to be a typo)
  if (closest && closest.distance <= 3) {
    return closest.command;
  }
  
  return null;
}
