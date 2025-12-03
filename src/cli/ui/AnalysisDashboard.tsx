import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from './components/Header.js';
import { MetricCard } from './components/MetricCard.js';
import { ProgressBar } from './components/ProgressBar.js';

interface ROIData {
  model: {
    name: string;
    provider: string;
  };
  jsonTokens: number;
  tonlTokens: number;
  savedTokens: number;
  savingsPercent: number;
  costs: {
    json: {
      per1M: number;
    };
    tonl: {
      per1M: number;
    };
    savings: {
      per1M: number;
    };
  };
  filename?: string;
}

interface AnalysisDashboardProps {
  data: ROIData;
  currency?: string;
  onExport?: () => void;
  onScreenshot?: () => void;
  onQuit?: () => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ 
  data,
  currency = 'USD',
  onExport,
  onScreenshot,
  onQuit
}) => {
  const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 120);
  const [compactMode] = useState(terminalWidth < 100);

  useEffect(() => {
    const handleResize = () => {
      setTerminalWidth(process.stdout.columns || 120);
    };
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      onQuit?.();
      process.exit(0);
    }
    if (input === 'e') onExport?.();
    if (input === 's') onScreenshot?.();
  });

  const annualSavingsAt1K = (data.costs.savings.per1M / 1000) * 365;

  const getRecommendation = (percent: number): { text: string; color: string } => {
    if (percent >= 40) return { text: 'STRONG ADOPT', color: 'green' };
    if (percent >= 30) return { text: 'HIGH PRIORITY', color: 'cyan' };
    if (percent >= 10) return { text: 'RECOMMENDED', color: 'yellow' };
    return { text: 'CONSIDER', color: 'gray' };
  };

  const recommendation = getRecommendation(data.savingsPercent);

  if (compactMode) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header />
        
        <Box marginBottom={2}>
          <Text dimColor>{data.filename || 'data.json'}</Text>
          <Text dimColor> / </Text>
          <Text dimColor>{data.model.name}</Text>
        </Box>

        <Box flexDirection="column" gap={2}>
          <MetricCard
            label="Efficiency"
            value={`${data.savingsPercent.toFixed(1)}%`}
            color="green"
          />
          
          <MetricCard
            label="Annual Savings"
            value={`$${annualSavingsAt1K.toFixed(0)}`}
            change="@ 1K req/day"
            color="yellow"
          />
        </Box>

        <Box marginTop={2} justifyContent="center">
          <Text>
            <Text bold color={recommendation.color}>{recommendation.text}</Text>
            <Text dimColor> Priority</Text>
          </Text>
        </Box>

        <Box marginTop={2} justifyContent="center">
          <Text dimColor>q: quit  e: export  s: screenshot</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      <Header />
      
      <Box marginBottom={2} justifyContent="center">
        <Text dimColor>{data.filename || 'data.json'}</Text>
        <Text dimColor> / </Text>
        <Text>{data.model.name}</Text>
      </Box>

      <Box flexDirection="row" gap={2} marginBottom={2}>
        <MetricCard
          label="Efficiency Gain"
          value={`+${data.savingsPercent.toFixed(1)}%`}
          color="green"
        />
        
        <MetricCard
          label="Tokens Saved"
          value={data.savedTokens.toLocaleString()}
          change="per request"
        />
        
        <MetricCard
          label="Annual Savings"
          value={`$${annualSavingsAt1K.toFixed(0)}`}
          change="@ 1K req/day"
          color="yellow"
        />
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column" width="60%">
          <Box marginBottom={1}>
            <Text bold underline>Token Usage</Text>
          </Box>
          
          <Box flexDirection="column" gap={1}>
            <ProgressBar
              label="BASELINE"
              value={data.jsonTokens}
              max={data.jsonTokens}
              color="red"
            />
            
            <ProgressBar
              label="OPTIMIZED"
              value={data.tonlTokens}
              max={data.jsonTokens}
              color="green"
            />
          </Box>
        </Box>

        <Box flexDirection="column" width="40%">
          <Box marginBottom={1}>
            <Text bold underline>Cost Breakdown</Text>
          </Box>
          
          <Box flexDirection="column" gap={1}>
            <Box justifyContent="space-between">
              <Text dimColor>Baseline (1M)</Text>
              <Text>${data.costs.json.per1M.toFixed(2)}</Text>
            </Box>
            
            <Box justifyContent="space-between">
              <Text dimColor>Optimized (1M)</Text>
              <Text color="green">${data.costs.tonl.per1M.toFixed(2)}</Text>
            </Box>
            
            <Box 
              marginTop={1} 
              borderStyle="round" 
              borderColor="green" 
              paddingX={2}
              justifyContent="center"
            >
              <Text color="green">
                Net: ${data.costs.savings.per1M.toFixed(2)}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box 
        marginTop={2} 
        borderStyle="round" 
        borderColor={recommendation.color}
        paddingX={2}
        paddingY={1}
        justifyContent="center"
      >
        <Text>
          Recommendation: <Text bold color={recommendation.color}>{recommendation.text}</Text>
        </Text>
      </Box>

      <Box marginTop={2} justifyContent="space-between">
        <Text dimColor>q: quit</Text>
        <Text dimColor>e: export</Text>
        <Text dimColor>s: screenshot</Text>
      </Box>
    </Box>
  );
};
