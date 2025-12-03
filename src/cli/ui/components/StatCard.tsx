import React from 'react';
import { Box, Text } from 'ink';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeColor?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeColor = 'green',
  highlight = false
}) => {
  return (
    <Box 
      flexDirection="column" 
      paddingX={2} 
      paddingY={1}
      borderStyle={highlight ? 'double' : 'single'}
      borderColor={highlight ? 'yellow' : 'gray'}
    >
      <Text dimColor>{label}</Text>
      <Text bold color={highlight ? 'yellow' : 'white'}>{value}</Text>
      {change && (
        <Text color={changeColor} dimColor>{change}</Text>
      )}
    </Box>
  );
};
