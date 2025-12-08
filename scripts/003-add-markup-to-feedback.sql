-- Add markup coordinates to feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS markup_x DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS markup_y DECIMAL(5,2);

-- Add index for faster queries on feedback with markups
CREATE INDEX IF NOT EXISTS idx_feedback_markup ON feedback (file_version_id) WHERE markup_x IS NOT NULL;
