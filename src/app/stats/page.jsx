"use client";
import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import CreditCoinStatsDashboard from '@/components/CreditCoinStatsDashboard';
import CreditCoinGameHistory from '@/components/CreditCoinGameHistory';

/**
 * Statistics Page
 * 
 * Demonstrates the CreditCoin statistics dashboard and game history components
 * Validates: Requirements 4.9, 4.10, 9.1-9.10
 */

export default function StatsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          fontWeight="bold" 
          color="white" 
          sx={{ 
            mb: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          CreditCoin Casino Statistics
        </Typography>
        <Typography variant="body1" color="rgba(255,255,255,0.7)">
          Live statistics and game history from CreditCoin Testnet blockchain
        </Typography>
      </Box>
      
      {/* Statistics Dashboard */}
      <Box sx={{ mb: 4 }}>
        <CreditCoinStatsDashboard />
      </Box>
      
      {/* Game History */}
      <Box>
        <CreditCoinGameHistory />
      </Box>
    </Container>
  );
}
