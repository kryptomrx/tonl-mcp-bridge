# TONL Examples

This folder contains practical examples showing how to use TONL-MCP Bridge.

## Running the Examples
```bash
# Install package
npm install tonl-mcp-bridge

# Run examples
node examples/basic-usage.js
node examples/real-tokenizer.js
node examples/yaml-prompts.js
```

## Examples Overview

### `basic-usage.js`
Simple JSON ↔ TONL conversion showing:
- Basic conversion
- Size comparison
- Lossless round-trip

### `real-tokenizer.js`
Real-world token counting with:
- GPT-4 tokenizer integration
- Actual token counts (not estimates)
- Cost calculations

### `yaml-prompts.js`
YAML prompt library conversion showing:
- YAML → TONL for prompt templates
- Token savings for configuration files
- Round-trip verification

## CLI Examples
```bash
# Convert JSON to TONL with stats
tonl convert data.json -s

# Convert YAML prompts
tonl convert prompts.yaml --name prompts -s

# Convert back to JSON
tonl convert data.tonl

# Convert TONL to YAML
tonl convert data.tonl output.yaml
```

## API Examples

### Basic Conversion
```javascript
import { jsonToTonl, tonlToJson } from 'tonl-mcp-bridge';

const data = [{ id: 1, name: "Alice" }];
const tonl = jsonToTonl(data);
const json = tonlToJson(tonl);
```

### Real Token Counting
```javascript
import { calculateRealSavings } from 'tonl-mcp-bridge';

const savings = calculateRealSavings(jsonStr, tonlStr, 'gpt-4');
console.log(`Saved ${savings.savingsPercent}% tokens!`);
```

### YAML Support
```javascript
import { yamlToTonl, tonlToYaml } from 'tonl-mcp-bridge';

const tonl = yamlToTonl(yamlString, 'prompts');
const yaml = tonlToYaml(tonl);
```