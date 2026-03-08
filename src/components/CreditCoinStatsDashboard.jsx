"use client";
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Alert, Chip } from '@mui/material';
import { FaDice, FaCoins, FaTrophy, FaChartBar, FaGamepad } from 'react-icons/fa';
import { GiMineExplosion, GiPerspectiveDiceSixFacesRandom } from 'react-icons/gi';
import { MdCasino } from 'react-icons/md';
import { useCreditcoinGameLogger } from '@/hooks/useCreditCoinGameLogger';

/**
 * CreditCoin Statistics Dashboard Component
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * 
 * Features:
 * - Fetches statistics from CreditCoinGameLogger.getStats
 * - Displays total games logged on CreditCoin
 * - Displays game type counts (Roulette, Mines, Wheel, Plinko)
 * - Displays total bet amounts in CTC
 * - Displays total payout amounts in CTC
 */

// Utility function to format CTC amounts
const formatCTCAmount = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }

  // Format with appropriate precision
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  } else {
    return amount.toFixed(2);
  }
};

// Game type icons
const GAME_ICONS = {
  roulette: <MdCasino size={24} />,
  mines: <GiMineExplosion size={24} />,
  wheel: <GiPerspectiveDiceSixFacesRandom size={24} />,
  plinko: <FaGamepad size={24} />
};

const CreditCoinStatsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { getStats, isInitialized } = useCreditcoinGameLogger();

  // Fetch statistics from CreditCoin (Requirement 9.1, 9.2)
  useEffect(() => {
    const fetchStats = async () => {
      if (!isInitialized) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const contractStats = await getStats();
        setStats(contractStats);
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
        setError('Failed to load statistics from CreditCoin');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [isInitialized, getStats]);

  if (loading) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(104, 29, 219, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(104, 29, 219, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress size={40} sx={{ color: '#681DDB' }} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(104, 29, 219, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(104, 29, 219, 0.2)',
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(104, 29, 219, 0.1) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(104, 29, 219, 0.2)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <FaChartBar color="#681DDB" size={24} />
          CreditCoin Statistics
        </Typography>
        <Chip
          label="Live"
          size="small"
          sx={{
            bgcolor: 'rgba(20, 216, 84, 0.2)',
            color: '#14D854',
            border: '1px solid rgba(20, 216, 84, 0.3)',
            fontWeight: 'bold'
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {/* Total Games (Requirement 9.2) */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(104, 29, 219, 0.2) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(104, 29, 219, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 20px rgba(104, 29, 219, 0.3)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(104, 29, 219, 0.2)',
                }}
              >
                <FaDice color="#681DDB" size={20} />
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Total Games
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              {stats.totalGames.toLocaleString()}
            </Typography>
          </Box>
        </Grid>

        {/* Total Bets in CTC (Requirement 9.3, 9.5) */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 20px rgba(255, 165, 0, 0.3)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255, 165, 0, 0.2)',
                }}
              >
                <FaCoins color="#FFA500" size={20} />
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Total Bets
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              {formatCTCAmount(parseFloat(stats.totalBets))} CTC
            </Typography>
          </Box>
        </Grid>

        {/* Total Payouts in CTC (Requirement 9.3, 9.5) */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(20, 216, 84, 0.2) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(20, 216, 84, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 20px rgba(20, 216, 84, 0.3)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(20, 216, 84, 0.2)',
                }}
              >
                <FaTrophy color="#14D854" size={20} />
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Total Payouts
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              {formatCTCAmount(parseFloat(stats.totalPayouts))} CTC
            </Typography>
          </Box>
        </Grid>

        {/* House Edge */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(216, 38, 51, 0.2) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(216, 38, 51, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 20px rgba(216, 38, 51, 0.3)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(216, 38, 51, 0.2)',
                }}
              >
                <FaChartBar color="#d82633" size={20} />
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                House Edge
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              {(() => {
                const totalBets = parseFloat(stats.totalBets);
                const totalPayouts = parseFloat(stats.totalPayouts);
                if (totalBets === 0) return '0%';
                const houseEdge = ((totalBets - totalPayouts) / totalBets) * 100;
                return `${houseEdge.toFixed(2)}%`;
              })()}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Game Type Counts (Requirement 9.4) */}
      <Box sx={{ mt: 3 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          color="white"
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FaGamepad color="#681DDB" size={20} />
          Games by Type
        </Typography>

        <Grid container spacing={2}>
          {/* Roulette */}
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: 'rgba(104, 29, 219, 0.5)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: '#681DDB' }}>
                {GAME_ICONS.roulette}
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 0.5 }}>
                Roulette
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="white">
                {stats.gameTypeCounts.roulette.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {/* Mines */}
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: 'rgba(255, 165, 0, 0.5)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: '#FFA500' }}>
                {GAME_ICONS.mines}
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 0.5 }}>
                Mines
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="white">
                {stats.gameTypeCounts.mines.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {/* Wheel */}
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: 'rgba(20, 216, 84, 0.5)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: '#14D854' }}>
                {GAME_ICONS.wheel}
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 0.5 }}>
                Wheel
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="white">
                {stats.gameTypeCounts.wheel.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {/* Plinko */}
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: 'rgba(216, 38, 51, 0.5)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: '#d82633' }}>
                {GAME_ICONS.plinko}
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 0.5 }}>
                Plinko
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="white">
                {stats.gameTypeCounts.plinko.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CreditCoinStatsDashboard;
