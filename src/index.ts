/**
 * TONL-MCP Bridge
 * Token-optimized format for LLM context windows
 * 
 * @packageDocumentation
 */

// Core converters
export { 
  jsonToTonl, 
  typeNameToTonl, 
  buildTonlHeader, 
  formatValue 
} from './core/json-to-tonl.js';

export { 
  tonlToJson, 
  tonlTypeToValue, 
  parseTonlHeader, 
  splitRespectingQuotes 
} from './core/tonl-to-json.js';

export { yamlToTonl } from './core/yaml-to-tonl.js';
export { tonlToYaml } from './core/tonl-to-yaml.js';

// Type detection
export { 
  detectType, 
  detectObjectSchema 
} from './core/type-detector.js';

// Token utilities
export { 
  estimateTokens, 
  calculateSavings 
} from './utils/token-counter.js';

// Types
export type { TypeName } from './core/type-detector.js';