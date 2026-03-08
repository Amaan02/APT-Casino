-- Migration: Add NFT tracking columns and tables
-- Feature: APT Casino NFT Collection
-- Validates: Requirements 2.5, 7.2, 7.3

-- Add NFT tracking columns to game_results table
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS nft_tx_hash VARCHAR(66);
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS nft_token_id BIGINT;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS nft_minting_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS nft_error_message TEXT;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS nft_retry_count INT DEFAULT 0;

-- Create index on nft_minting_status for efficient querying
CREATE INDEX IF NOT EXISTS idx_nft_status ON game_results(nft_minting_status);

-- Create failed_nft_mints table for manual recovery
CREATE TABLE IF NOT EXISTS failed_nft_mints (
  id SERIAL PRIMARY KEY,
  log_id VARCHAR(66) NOT NULL UNIQUE,
  player_address VARCHAR(42) NOT NULL,
  game_type VARCHAR(20) NOT NULL,
  bet_amount VARCHAR(78) NOT NULL,
  payout VARCHAR(78) NOT NULL,
  timestamp BIGINT NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_retry_at TIMESTAMP
);

-- Create index on log_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_failed_nft_log_id ON failed_nft_mints(log_id);

-- Create index on player_address for player-specific queries
CREATE INDEX IF NOT EXISTS idx_failed_nft_player ON failed_nft_mints(player_address);
