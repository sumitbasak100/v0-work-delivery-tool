-- Add timestamp column for video markups
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS markup_timestamp DECIMAL(10, 3);

-- This column stores the video timestamp in seconds when the markup was placed
-- It will be NULL for image/pdf markups
