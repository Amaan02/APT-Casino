-- Migration: Add NFT image path storage
-- Feature: NFT Display in Game History
-- Validates: Requirements 7.1, 7.2, 7.5

-- Add nft_image_path column to game_results table
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS nft_image_path VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN game_results.nft_image_path IS 
'Path to NFT image in public folder (e.g., /nft.png, /nft1.png, /nft2.png, /nft3.png)';

-- Create index on nft_image_path for efficient querying
CREATE INDEX IF NOT EXISTS idx_nft_image_path 
ON game_results(nft_image_path) 
WHERE nft_image_path IS NOT NULL;
