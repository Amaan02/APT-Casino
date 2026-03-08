"use client";

/**
 * Global Notification System for Game Results
 * 
 * Displays real-time notifications for game results across all connected clients.
 * Updated for Creditcoin Testnet network.
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { formatEther } from 'viem';
import { formatDisplayBalance } from '@/utils/formatters';

/**
 * Game type icons
 */
const GameIcons = {
  ROULETTE: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  ),
  MINES: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
  ),
  WHEEL: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="2" x2="12" y2="12"></line>
      <line x1="12" y1="12" x2="19.07" y2="16.93"></line>
      <line x1="12" y1="12" x2="4.93" y2="16.93"></line>
    </svg>
  ),
  PLINKO: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20"></path>
      <path d="M8 6l4 4-4 4"></path>
      <path d="M16 6l-4 4 4 4"></path>
    </svg>
  )
};

/**
 * Format player address for display
 */
const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format amount in CTC (18 decimal precision)
 */
const formatAmount = (amount) => {
  try {
    const formatted = formatEther(BigInt(amount));
    return formatDisplayBalance(formatted);
  } catch (error) {
    console.error('Error formatting amount:', error);
    return '0.00 CTC';
  }
};

/**
 * Individual Game Result Notification Component
 */
const GameResultNotification = ({ notification, onDismiss }) => {
  const { player, gameType, betAmount, payout, timestamp } = notification;

  const isWin = BigInt(payout) > BigInt(betAmount);
  const profit = BigInt(payout) - BigInt(betAmount);

  useEffect(() => {
    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 8000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-2xl border backdrop-blur-md
        animate-slideInRight transition-all duration-300 hover:scale-105
        ${isWin
          ? 'bg-gradient-to-r from-green-600/90 to-emerald-600/90 border-green-400'
          : 'bg-gradient-to-r from-red-600/90 to-rose-600/90 border-red-400'
        }
      `}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

      <div className="relative p-4">
        <div className="flex items-start justify-between">
          {/* Left side: Game icon and info */}
          <div className="flex items-start space-x-3 flex-1">
            {/* Game icon */}
            <div className={`
              flex-shrink-0 p-2 rounded-lg
              ${isWin ? 'bg-green-500/30' : 'bg-red-500/30'}
            `}>
              <div className="text-white">
                {GameIcons[gameType] || GameIcons.ROULETTE}
              </div>
            </div>

            {/* Game details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-white font-bold text-sm">
                  {gameType}
                </h4>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-semibold
                  ${isWin ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                `}>
                  {isWin ? 'WIN' : 'LOSS'}
                </span>
              </div>

              <p className="text-white/80 text-xs mb-2">
                Player: <span className="font-mono">{formatAddress(player)}</span>
              </p>

              <div className="flex items-center space-x-4 text-xs">
                <div>
                  <span className="text-white/60">Bet:</span>
                  <span className="text-white font-semibold ml-1">
                    {formatAmount(betAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Payout:</span>
                  <span className="text-white font-semibold ml-1">
                    {formatAmount(payout)}
                  </span>
                </div>
              </div>

              {isWin && (
                <div className="mt-1">
                  <span className="text-green-200 text-xs font-bold">
                    +{formatAmount(profit.toString())}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => onDismiss(notification.id)}
            className="flex-shrink-0 ml-2 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Notifications Container Component
 */
const NotificationsContainer = ({ notifications, onDismiss }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed top-24 right-4 z-[9999] w-full max-w-md pointer-events-none">
      <style jsx global>{`
        @keyframes slideInRight {
          0% { 
            opacity: 0; 
            transform: translateX(100%); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="space-y-3 pointer-events-auto">
        {notifications.map(notification => (
          <GameResultNotification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

/**
 * Global Notification System Component
 * 
 * Main component that manages the notification queue.
 * Note: Real-time streaming removed - notifications are now triggered locally.
 */
export function GlobalNotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  /**
   * Add a notification to the queue (can be called from other components)
   */
  const addNotification = useCallback((gameResult) => {
    console.log('🎰 New game result notification:', {
      player: gameResult.player,
      gameType: gameResult.gameType,
      betAmount: gameResult.betAmount,
      payout: gameResult.payout,
      timestamp: gameResult.timestamp
    });

    // Create notification object
    const notification = {
      id: `${gameResult.player}-${gameResult.timestamp}-${Date.now()}`,
      player: gameResult.player,
      gameType: gameResult.gameType,
      betAmount: gameResult.betAmount,
      payout: gameResult.payout,
      timestamp: gameResult.timestamp,
      entropyRequestId: gameResult.entropyRequestId,
      logId: gameResult.logId,
      transactionHash: gameResult.transactionHash
    };

    console.log('📢 Adding notification to queue:', notification.id);

    // Add to notification queue
    setNotifications(prev => {
      // Limit queue to 5 notifications
      const newNotifications = [notification, ...prev].slice(0, 5);
      console.log('📋 Notification queue size:', newNotifications.length);
      return newNotifications;
    });
  }, []);

  /**
   * Dismiss a notification
   */
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Expose addNotification globally for other components to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addGameNotification = addNotification;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.addGameNotification;
      }
    };
  }, [addNotification]);

  return (
    <>
      {/* Game result notifications */}
      <NotificationsContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </>
  );
}

export default GlobalNotificationSystem;
