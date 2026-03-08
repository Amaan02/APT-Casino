"use client";
// Updated for Creditcoin migration - v2.2
import React, { useState, useEffect } from 'react';
import { FaDice, FaCoins, FaTrophy } from 'react-icons/fa';
import { useCreditcoinGameLogger } from '@/hooks/useCreditCoinGameLogger';

/**
 * Game Statistics Component
 * 
 * Displays live statistics from CreditCoin blockchain
 * Validates: Requirements 9.1, 9.2, 9.3, 9.5
 */

// Utility function to format CTC amounts
const formatCTCAmount = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return amount.toFixed(0);
  }
};

const GameStats = () => {
  const [stats, setStats] = useState(null);
  const { getStats, isConnected: isInitialized } = useCreditcoinGameLogger();

  useEffect(() => {
    const fetchStats = async () => {
      if (!isInitialized) return;

      try {
        const contractStats = await getStats();
        setStats(contractStats);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [isInitialized, getStats]);

  // Show loading state or default values
  const totalGames = stats?.totalGames || 0;
  const totalBets = stats?.totalBets ? parseFloat(stats.totalBets) : 0;
  const totalPayouts = stats?.totalPayouts ? parseFloat(stats.totalPayouts) : 0;

  // Calculate max win from total payouts (approximation)
  const maxWin = totalPayouts > 0 ? totalPayouts * 0.1 : 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-end gap-6 md:gap-8 text-white bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/5 shadow-lg">
      <div className="flex flex-col items-center md:items-end">
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <FaDice className="text-blue-400" />
          <span className="uppercase tracking-wider font-display">Total Games</span>
        </div>
        <p className="font-display font-bold text-xl md:text-2xl bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
          {totalGames.toLocaleString()}
        </p>
      </div>

      <div className="flex flex-col items-center md:items-end">
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <FaCoins className="text-yellow-400" />
          <span className="uppercase tracking-wider font-display">Volume</span>
        </div>
        <p className="font-display font-bold text-xl md:text-2xl bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
          {formatCTCAmount(totalBets)} CTC
        </p>
      </div>

      <div className="flex flex-col items-center md:items-end">
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <FaTrophy className="text-green-400" />
          <span className="uppercase tracking-wider font-display">Total Payouts</span>
        </div>
        <p className="font-display font-bold text-xl md:text-2xl bg-gradient-to-r from-green-300 to-teal-300 bg-clip-text text-transparent">
          {formatCTCAmount(totalPayouts)} CTC
        </p>
      </div>
    </div>
  );
};

export default GameStats; 
