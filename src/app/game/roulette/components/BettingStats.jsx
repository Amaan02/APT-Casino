"use client";
import React, { useMemo } from "react";
import { Box, Typography, Divider, Paper } from "@mui/material";
import { FaChartLine, FaTrophy, FaCoins, FaPercentage } from "react-icons/fa";

const BettingStats = ({ history }) => {
    const stats = useMemo(() => {
        if (!history || history.length === 0) return null;

        const statTotal = history.reduce((sum, bet) => sum + bet.totalBets, 0);
        const statWinnings = history.reduce((sum, bet) => sum + bet.winningBets, 0);
        const winRate = statTotal > 0 ? (statWinnings / statTotal * 100).toFixed(1) : 0;
        const netProfit = statWinnings - statTotal;
        const avgBet = (statTotal / history.length).toFixed(4);
        const maxWin = Math.max(...history.map(b => b.winningBets)).toFixed(4);

        return { statTotal, statWinnings, winRate, netProfit, avgBet, maxWin };
    }, [history]);

    if (!stats) return null;

    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <FaChartLine /> Performance Stats
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Win Rate</Typography>
                        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FaPercentage style={{ fontSize: '0.8rem' }} /> {stats.winRate}%
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Net Profit</Typography>
                        <Typography variant="h5" sx={{ color: stats.netProfit >= 0 ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FaCoins style={{ fontSize: '0.8rem' }} /> {stats.netProfit.toFixed(4)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Avg Bet</Typography>
                        <Typography variant="h5">
                            {stats.avgBet}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Max Win</Typography>
                        <Typography variant="h5" sx={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FaTrophy style={{ fontSize: '0.8rem' }} /> {stats.maxWin}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default BettingStats;
