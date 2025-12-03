import React from 'react';
import { Box, Text } from 'ink';

interface CostTableProps {
  model: string;
  costs: {
    json: { per1K: number; per1M: number };
    tonl: { per1K: number; per1M: number };
    savings: { per1K: number; per1M: number };
  };
  currency?: string;
}

export const CostTable: React.FC<CostTableProps> = ({ 
  model, 
  costs,
  currency = 'USD'
}) => {
  const formatCost = (amount: number) => {
    if (currency === 'USD') return `$${amount.toFixed(2)}`;
    return `${amount.toFixed(2)}`;
  };

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text bold underline>💰 Cost Analysis ({model})</Text>
      <Box marginTop={1} flexDirection="column">
        {/* Header */}
        <Box>
          <Box width={20}>
            <Text bold></Text>
          </Box>
          <Box width={15}>
            <Text bold>Per 1K</Text>
          </Box>
          <Box width={15}>
            <Text bold>Per 1M</Text>
          </Box>
        </Box>
        
        {/* Divider */}
        <Text dimColor>{'─'.repeat(50)}</Text>
        
        {/* JSON Row */}
        <Box>
          <Box width={20}>
            <Text>JSON</Text>
          </Box>
          <Box width={15}>
            <Text color="red">{formatCost(costs.json.per1K)}</Text>
          </Box>
          <Box width={15}>
            <Text color="red">{formatCost(costs.json.per1M)}</Text>
          </Box>
        </Box>
        
        {/* TONL Row */}
        <Box>
          <Box width={20}>
            <Text>TONL</Text>
          </Box>
          <Box width={15}>
            <Text color="green">{formatCost(costs.tonl.per1K)}</Text>
          </Box>
          <Box width={15}>
            <Text color="green">{formatCost(costs.tonl.per1M)}</Text>
          </Box>
        </Box>
        
        {/* Divider */}
        <Text dimColor>{'─'.repeat(50)}</Text>
        
        {/* Savings Row */}
        <Box>
          <Box width={20}>
            <Text bold color="cyan">💎 NET SAVINGS</Text>
          </Box>
          <Box width={15}>
            <Text bold color="cyan">{formatCost(costs.savings.per1K)}</Text>
          </Box>
          <Box width={15}>
            <Text bold color="cyan">{formatCost(costs.savings.per1M)}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
