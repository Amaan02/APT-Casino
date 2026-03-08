"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Fade, Alert, Switch, FormControlLabel } from '@mui/material';
import { FaHistory, FaChartLine, FaFire, FaCoins, FaTrophy, FaDice, FaExternalLinkAlt, FaImage } from 'react-icons/fa';
import { useCreditcoinGameLogger } from '@/hooks/useCreditCoinGameLogger';
import { useAccount } from 'wagmi';
import { getCreditCoinTestnetExplorerUrl, getArbitrumSepoliaExplorerUrl } from '@/utils/networkUtils';

/**
 * CreditCoin Game History Component
 * 
 * Validates: Requirements 4.9, 4.10, 9.1, 9.2, 9.8, 9.9, 9.10, 3.1, 3.2, 3.3, 3.4, 3.5, 8.4, 8.5
 * 
 * Features:
 * - Fetches game history from CreditCoinGameLogger contract
 * - Displays game history with CreditCoin transaction links
 * - Shows bet amounts and payouts in CTC denomination
 * - Supports filtering by game type
 * - Displays game timestamps from CreditCoin block data
 * - Displays NFT transaction links with token IDs
 * - Shows NFT minting status indicators
 * - Shows NFT error indicators for failed mints
 * - Displays total NFT count owned by connected player
 * - Provides filter toggle to show only games with minted NFTs
 */

// Utility function to format CTC amounts with proper decimal precision
const formatCTCAmount = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  // Round to 6 decimal places to avoid floating point precision issues
  return parseFloat(amount.toFixed(6));
};

// Game type mapping
const GAME_TYPES = {
  ROULETTE: 'Roulette',
  MINES: 'Mines',
  WHEEL: 'Wheel',
  PLINKO: 'Plinko'
};

// Function to calculate statistics from bet history
const calculateStats = (games) => {
  if (!games || games.length === 0) {
    return {
      totalGames: 0,
      totalWagered: 0,
      totalWon: 0,
      winRate: 0,
      netProfit: 0,
      roi: 0,
      mostCommonResults: [],
      biggestWin: null
    };
  }

  const totalGames = games.length;
  const totalWagered = games.reduce((sum, game) => sum + parseFloat(game.betAmount || 0), 0);
  const totalWon = games.reduce((sum, game) => sum + parseFloat(game.payout || 0), 0);
  const winCount = games.filter(game => parseFloat(game.payout || 0) > parseFloat(game.betAmount || 0)).length;
  const winRate = totalGames > 0 ? (winCount / totalGames) * 100 : 0;
  const netProfit = totalWon - totalWagered;
  const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
  
  // Find biggest win
  const biggestWin = games.reduce((max, game) => {
    const payout = parseFloat(game.payout || 0);
    const maxPayout = parseFloat(max.payout || 0);
    return payout > maxPayout ? game : max;
  }, { payout: 0 });
  
  return {
    totalGames,
    totalWagered,
    totalWon,
    winRate,
    netProfit,
    roi,
    biggestWin: parseFloat(biggestWin.payout || 0) > 0 ? biggestWin : null
  };
};

const CreditCoinGameHistory = ({ gameType = null }) => {
  const [tabValue, setTabValue] = useState(0);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nftCount, setNftCount] = useState(0);
  const [showOnlyNFTs, setShowOnlyNFTs] = useState(false);
  
  const { address } = useAccount();
  const { getHistory, getLogsByGameType, isInitialized, getNFTCount } = useCreditcoinGameLogger();
  
  // Fetch game history from CreditCoin (Requirement 4.9)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isInitialized) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        let history;
        if (gameType) {
          // Filter by game type (Requirement 9.9)
          history = await getLogsByGameType(gameType, 50);
        } else if (address) {
          // Get player history
          history = await getHistory(50);
        } else {
          history = [];
        }
        
        setGames(history || []);
      } catch (err) {
        console.error('Failed to fetch game history:', err);
        setError('Failed to load game history from CreditCoin');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [address, gameType, isInitialized, getHistory, getLogsByGameType]);
  
  // Fetch NFT count for connected player (Requirement 8.4)
  useEffect(() => {
    const fetchNFTCount = async () => {
      if (!address || !isInitialized || !getNFTCount) {
        setNftCount(0);
        return;
      }

      try {
        const count = await getNFTCount();
        setNftCount(count);
      } catch (err) {
        console.error('Failed to fetch NFT count:', err);
        setNftCount(0);
      }
    };

    fetchNFTCount();
  }, [address, isInitialized, getNFTCount]);
  
  // Filter games based on NFT filter toggle (Requirement 8.5)
  const filteredGames = useMemo(() => {
    if (!showOnlyNFTs) {
      return games;
    }
    return games.filter(game => game.nftTxHash);
  }, [games, showOnlyNFTs]);
  
  const stats = useMemo(() => calculateStats(games), [games]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Format timestamp from CreditCoin block data (Requirement 9.10)
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000); // Convert from Unix timestamp
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp * 1000); // Convert from Unix timestamp
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Determine color based on roulette number
  const getNumberColor = (num) => {
    if (num === 0) return '#14D854'; // Green for zero
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(num) ? '#d82633' : '#333'; // Red or black
  };

  // Open CreditCoin Explorer link for transaction hash (Requirement 4.10)
  const openCreditCoinExplorer = (txHash) => {
    if (txHash) {
      const explorerUrl = getCreditCoinTestnetExplorerUrl(txHash);
      window.open(explorerUrl, '_blank');
    }
  };

  // Open Arbitrum Sepolia Explorer link for entropy transaction
  const openArbitrumExplorer = (txHash) => {
    if (txHash) {
      const explorerUrl = getArbitrumSepoliaExplorerUrl(txHash);
      window.open(explorerUrl, '_blank');
    }
  };
  
  return (
    <Paper
      elevation={5}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(9, 0, 5, 0.9) 0%, rgba(25, 5, 30, 0.85) 100%)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(104, 29, 219, 0.2)',
        mb: 5,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, #14D854, #d82633)',
        }
      }}
    >
      <Typography 
        variant="h5" 
        fontWeight="bold" 
        gutterBottom
        sx={{ 
          borderBottom: '1px solid rgba(104, 29, 219, 0.3)',
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          color: 'white',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        <FaHistory color="#681DDB" size={22} />
        <span style={{ background: 'linear-gradient(90deg, #FFFFFF, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Game History (CreditCoin)
        </span>
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* NFT Collection Summary (Requirements 8.4, 8.5) */}
      {address && (
        <Box 
          sx={{ 
            mb: 2,
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(104, 29, 219, 0.15) 0%, rgba(104, 29, 219, 0.05) 100%)',
            border: '1px solid rgba(104, 29, 219, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(104, 29, 219, 0.3)',
                boxShadow: '0 3px 8px rgba(104, 29, 219, 0.4)',
              }}
            >
              <FaImage color="#681DDB" size={18} />
            </Box>
            <Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ fontSize: '0.75rem' }}>
                NFT Collection
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="white" sx={{ lineHeight: 1.2 }}>
                {nftCount} {nftCount === 1 ? 'NFT' : 'NFTs'} Owned
              </Typography>
            </Box>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyNFTs}
                onChange={(e) => setShowOnlyNFTs(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#681DDB',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#681DDB',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" color="rgba(255,255,255,0.8)">
                Show only games with NFTs
              </Typography>
            }
          />
        </Box>
      )}
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ 
          mb: 3,
          '& .MuiTabs-indicator': {
            backgroundColor: '#681DDB',
            height: '3px',
            borderRadius: '3px'
          }
        }}
      >
        <Tab 
          label="Recent Games" 
          icon={<FaDice size={16} />}
          iconPosition="start"
          sx={{ 
            color: tabValue === 0 ? 'white' : 'rgba(255,255,255,0.6)',
            textTransform: 'none',
            fontWeight: tabValue === 0 ? 'bold' : 'normal',
            '&.Mui-selected': {
              color: 'white',
            }
          }}
        />
        <Tab 
          label="Statistics" 
          icon={<FaChartLine size={16} />}
          iconPosition="start"
          sx={{ 
            color: tabValue === 1 ? 'white' : 'rgba(255,255,255,0.6)',
            textTransform: 'none',
            fontWeight: tabValue === 1 ? 'bold' : 'normal',
            '&.Mui-selected': {
              color: 'white',
            }
          }}
        />
      </Tabs>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress size={40} sx={{ color: '#681DDB' }} />
        </Box>
      ) : (
        <>
          {tabValue === 0 && (
            <Fade in={true}>
              <TableContainer sx={{ maxHeight: 400, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(104, 29, 219, 0.2)' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ 
                      '& th': { 
                        background: 'linear-gradient(90deg, rgba(104, 29, 219, 0.3), rgba(104, 29, 219, 0.2))',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        borderBottom: 'none',
                      } 
                    }}>
                      <TableCell>Time</TableCell>
                      <TableCell>Game Type</TableCell>
                      <TableCell align="center">Bet Amount</TableCell>
                      <TableCell align="center">Result</TableCell>
                      <TableCell align="right">Payout</TableCell>
                      <TableCell align="center">Transactions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGames.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="rgba(255,255,255,0.6)">
                            {showOnlyNFTs ? 'No games with minted NFTs found' : 'No game history found on CreditCoin'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGames.map((game, index) => (
                        <TableRow 
                          key={game.logId || index}
                          sx={{ 
                            '&:hover': { backgroundColor: 'rgba(104, 29, 219, 0.1)' },
                            '& td': { 
                              color: 'rgba(255,255,255,0.8)', 
                              borderColor: 'rgba(104, 29, 219, 0.1)',
                              transition: 'all 0.2s ease'
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatTime(game.timestamp)}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                {formatDate(game.timestamp)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={GAME_TYPES[game.gameType] || game.gameType} 
                              size="small"
                              sx={{ 
                                fontSize: '0.75rem',
                                bgcolor: 'rgba(104, 29, 219, 0.1)',
                                color: 'white',
                                border: '1px solid rgba(104, 29, 219, 0.2)',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {formatCTCAmount(game.betAmount)} CTC
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {game.resultData && game.resultData.number !== undefined ? (
                              <Box 
                                sx={{ 
                                  width: 28, 
                                  height: 28, 
                                  borderRadius: '50%', 
                                  backgroundColor: getNumberColor(game.resultData.number),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                                }}
                              >
                                <Typography variant="body2" fontWeight="bold" color="white">
                                  {game.resultData.number}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="rgba(255,255,255,0.6)">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              sx={{
                                color: parseFloat(game.payout) > parseFloat(game.betAmount) ? '#14D854' : 'rgba(255,255,255,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 0.5
                              }}
                            >
                              {parseFloat(game.payout) > 0 ? (
                                <>
                                  <FaCoins size={12} color="#14D854" />
                                  {formatCTCAmount(game.payout)} CTC
                                </>
                              ) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {/* CreditCoin Transaction Link (Requirement 4.10) */}
                                {game.explorerUrl && (
                                  <Box
                                    onClick={() => openCreditCoinExplorer(game.logId)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(20, 216, 84, 0.1)',
                                      border: '1px solid rgba(20, 216, 84, 0.3)',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        backgroundColor: 'rgba(20, 216, 84, 0.2)',
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    title="View on CreditCoin Explorer"
                                  >
                                    <FaExternalLinkAlt size={10} color="#14D854" />
                                    <Typography variant="caption" sx={{ color: '#14D854', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      CreditCoin
                                    </Typography>
                                  </Box>
                                )}
                                {/* Arbitrum Sepolia Entropy Transaction Link */}
                                {game.entropyTxHash && (
                                  <Box
                                    onClick={() => openArbitrumExplorer(game.entropyTxHash)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(0, 150, 255, 0.1)',
                                      border: '1px solid rgba(0, 150, 255, 0.3)',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        backgroundColor: 'rgba(0, 150, 255, 0.2)',
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    title="View Entropy on Arbitrum Sepolia"
                                  >
                                    <FaExternalLinkAlt size={10} color="#0096FF" />
                                    <Typography variant="caption" sx={{ color: '#0096FF', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      Entropy
                                    </Typography>
                                  </Box>
                                )}
                                {/* NFT Transaction Link (Requirements 3.1, 3.2, 3.3, 3.4, 3.5) */}
                                {game.nftTxHash ? (
                                  <Box
                                    onClick={() => openCreditCoinExplorer(game.nftTxHash)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(104, 29, 219, 0.1)',
                                      border: '1px solid rgba(104, 29, 219, 0.3)',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        backgroundColor: 'rgba(104, 29, 219, 0.2)',
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    title="View NFT on CreditCoin Explorer"
                                  >
                                    <FaImage size={10} color="#681DDB" />
                                    <Typography variant="caption" sx={{ color: '#681DDB', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      NFT #{game.nftTokenId}
                                    </Typography>
                                  </Box>
                                ) : game.nftMinting ? (
                                  <Chip 
                                    label="Minting..." 
                                    size="small"
                                    sx={{ fontSize: '0.65rem', height: '20px' }}
                                  />
                                ) : game.nftError ? (
                                  <Chip 
                                    label="Mint Failed" 
                                    size="small"
                                    color="error"
                                    sx={{ fontSize: '0.65rem', height: '20px' }}
                                  />
                                ) : null}
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Fade>
          )}
          
          {tabValue === 1 && (
            <Fade in={true}>
              <Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                  <Box 
                    sx={{ 
                      flex: 1, 
                      minWidth: '150px', 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(104, 29, 219, 0.1) 100%)',
                      border: '1px solid rgba(104, 29, 219, 0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: 'rgba(104, 29, 219, 0.2)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <FaChartLine color="#681DDB" size={16} />
                      </Box>
                      <Typography variant="body2" color="rgba(255,255,255,0.7)">Total Games</Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="white" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{stats.totalGames}</Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      flex: 1, 
                      minWidth: '150px', 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(255, 165, 0, 0.1) 100%)',
                      border: '1px solid rgba(255, 165, 0, 0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255, 165, 0, 0.2)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <FaFire color="#FFA500" size={16} />
                      </Box>
                      <Typography variant="body2" color="rgba(255,255,255,0.7)">Win Rate</Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="white" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{stats.winRate.toFixed(1)}%</Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      flex: 1, 
                      minWidth: '150px', 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(216, 38, 51, 0.1) 100%)',
                      border: '1px solid rgba(216, 38, 51, 0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: 'rgba(216, 38, 51, 0.2)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <FaCoins color="#d82633" size={16} />
                      </Box>
                      <Typography variant="body2" color="rgba(255,255,255,0.7)">Total Wagered</Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="white" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{formatCTCAmount(stats.totalWagered)} CTC</Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      flex: 1, 
                      minWidth: '150px', 
                      p: 2, 
                      borderRadius: 2, 
                      background: `linear-gradient(135deg, rgba(0,0,0,0.3) 0%, ${stats.netProfit >= 0 ? 'rgba(20, 216, 84, 0.1)' : 'rgba(216, 38, 51, 0.1)'} 100%)`,
                      border: `1px solid ${stats.netProfit >= 0 ? 'rgba(20, 216, 84, 0.2)' : 'rgba(216, 38, 51, 0.2)'}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: stats.netProfit >= 0 ? 'rgba(20, 216, 84, 0.2)' : 'rgba(216, 38, 51, 0.2)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <FaTrophy color={stats.netProfit >= 0 ? '#14D854' : '#d82633'} size={16} />
                      </Box>
                      <Typography variant="body2" color="rgba(255,255,255,0.7)">Net Profit</Typography>
                    </Box>
                    <Typography 
                      variant="h4" 
                      fontWeight="bold" 
                      color={stats.netProfit >= 0 ? '#14D854' : '#d82633'} 
                      sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                    >
                      {stats.netProfit >= 0 ? '+' : ''}{formatCTCAmount(stats.netProfit)} CTC
                    </Typography>
                  </Box>
                </Box>
                
                {stats.biggestWin && (
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(20, 216, 84, 0.1) 0%, rgba(0,0,0,0.3) 100%)',
                      border: '1px solid rgba(20, 216, 84, 0.2)',
                    }}
                  >
                    <Typography variant="h6" color="white" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FaTrophy color="#14D854" size={18} />
                      Biggest Win
                    </Typography>
                    <Typography variant="body1" color="rgba(255,255,255,0.8)">
                      {formatCTCAmount(stats.biggestWin.payout)} CTC in {GAME_TYPES[stats.biggestWin.gameType] || stats.biggestWin.gameType}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
          )}
        </>
      )}
    </Paper>
  );
};

export default CreditCoinGameHistory;
