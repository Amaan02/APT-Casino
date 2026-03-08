-- Migration: Rename Somnia columns to CreditCoin (game logging is on CreditCoin Testnet)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_results' AND column_name = 'somnia_tx_hash'
  ) THEN
    ALTER TABLE game_results RENAME COLUMN somnia_tx_hash TO creditcoin_tx_hash;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_results' AND column_name = 'creditcoin_tx_hash'
  ) THEN
    ALTER TABLE game_results ADD COLUMN creditcoin_tx_hash VARCHAR(66);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_results' AND column_name = 'somnia_block_number'
  ) THEN
    ALTER TABLE game_results RENAME COLUMN somnia_block_number TO creditcoin_block_number;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_results' AND column_name = 'creditcoin_block_number'
  ) THEN
    ALTER TABLE game_results ADD COLUMN creditcoin_block_number BIGINT;
  END IF;
END $$;
