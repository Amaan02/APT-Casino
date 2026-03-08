"use client";
import { useState } from "react";
import { FaExternalLinkAlt, FaImage } from "react-icons/fa";
import Image from "next/image";

export default function GameHistory({ history }) {
  const [visibleCount, setVisibleCount] = useState(5);
  const [imageErrors, setImageErrors] = useState({});

  // Open Entropy Explorer link (Arbitrum Sepolia)
  const openEntropyExplorer = (txHash) => {
    if (txHash) {
      const entropyExplorerUrl = `https://entropy-explorer.pyth.network/?chain=arbitrum-sepolia&search=${txHash}`;
      window.open(entropyExplorerUrl, '_blank');
    }
  };

  // Open Creditcoin Testnet Explorer link
  const openCreditcoinExplorer = (txHash) => {
    if (txHash) {
      const explorerUrl = `https://creditcoin-testnet.blockscout.com/tx/${txHash}`;
      window.open(explorerUrl, '_blank');
    }
  };

  // Handle image load errors
  const handleImageError = (gameId, imagePath) => {
    console.error('Failed to load NFT image:', imagePath);
    setImageErrors(prev => ({ ...prev, [gameId]: true }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Game History</h3>
        {history.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + 5, history.length))}
            className="bg-[#2A0025] border border-[#333947] rounded-lg px-3 py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            Show more
          </button>
        )}
      </div>

      {/* Game History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333947]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Game
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Title
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Bet amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Multiplier
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Payout
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                NFT
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Entropy Explorer
              </th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, visibleCount).map((game) => (
              <tr key={game.id} className="border-b border-[#333947]/30 hover:bg-[#2A0025]/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">P</span>
                    </div>
                    <span className="text-white text-sm">Plinko</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.title}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.betAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.multiplier}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.payout}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => window.open('https://creditcoin-testnet.blockscout.com/token/0x0B61D7b981062b0dd5D95F8B6455Eca0a2C1d8C7', '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#681DDB]/20 border border-[#681DDB]/40 rounded-lg text-[#681DDB] text-xs font-bold hover:bg-[#681DDB]/30 transition-all transform hover:-translate-y-0.5 shadow-sm shadow-purple-900/20"
                    title="View NFT Collection"
                  >
                    <FaImage size={12} />
                    <span>NFT</span>
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    {game.entropyProof || game.creditcoinTxHash ? (
                      <>
                        <div className="text-xs text-gray-300 font-mono">
                          <div className="text-yellow-400 font-bold">{game.entropyProof?.sequenceNumber && game.entropyProof.sequenceNumber !== '0' ? String(game.entropyProof.sequenceNumber) : ''}</div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {game.creditcoinTxHash && (
                            <button
                              onClick={() => openCreditcoinExplorer(game.creditcoinTxHash)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#65B3AE]/10 border border-[#65B3AE]/30 rounded text-[#65B3AE] text-xs hover:bg-[#65B3AE]/20 transition-colors"
                              title="View on Creditcoin Testnet Explorer"
                            >
                              <FaExternalLinkAlt size={8} />
                              Creditcoin
                            </button>
                          )}
                          {game.entropyProof?.transactionHash && (
                            <button
                              onClick={() => openEntropyExplorer(game.entropyProof.transactionHash)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#681DDB]/10 border border-[#681DDB]/30 rounded text-[#681DDB] text-xs hover:bg-[#681DDB]/20 transition-colors"
                              title="View on Pyth Entropy Explorer"
                            >
                              <FaExternalLinkAlt size={8} />
                              Entropy
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-purple-400 text-xs">Generating...</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {history.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#2A0025] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <p className="text-gray-400 text-sm">No games played yet</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to see your game history</p>
        </div>
      )}

      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {Math.min(visibleCount, history.length)} of {history.length} entries
      </div>
    </div>
  );
}

