-- ==============================================================================
-- Backend Validation for Allowed Roll Numbers (DBMS)
-- Run this script in the Supabase SQL Editor to prevent API bypasses.
-- ==============================================================================

-- 1. Restrict the `submissions` table
ALTER TABLE public.submissions 
ADD CONSTRAINT valid_dbms_roll_numbers CHECK (
  roll_number IN (
    '25BCAN0668', '25BCAN0107', '25BCAN0108', '25BCAN0109', '25BCAN0110',
    '25BCAN0119', '25BCAN0127', '25BCAN0128', '25BCAN0129', '25BCAN0130',
    '25BCAN0131', '25BCAN0132', '25BCAN0133', '25BCAN0144', '25BCAN0147',
    '25BCAN0153', '25BCAN0154', '25BCAN0164', '25BCAN0168', '25BCAN0169',
    '25BCAN0172', '25BCAN0178', '25BCAN0179', '25BCAN0180', '25BCAN0183',
    '25BCAN0185', '25BCAN0194', '25BCAN0202', '25BCAN0672', '25BCAN0683'
  )
) NOT VALID;

-- 2. Restrict Storage Uploads (certificates bucket)
-- We use a Postgres function to parse the file path (e.g. DBMS/25BCAN0107_DBMS.jpg) 
-- and extract the roll number, then check if it's allowed.
CREATE OR REPLACE FUNCTION public.is_allowed_dbms_roll_number(path text)
RETURNS boolean AS $$
DECLARE
  extracted_roll text;
BEGIN
  -- Extract the roll number part from the filepath, expecting "DBMS/[ROLL]_DBMS"
  extracted_roll := substring(path from 'DBMS/([A-Z0-9]+)_DBMS');
  
  RETURN extracted_roll IN (
    '25BCAN0668', '25BCAN0107', '25BCAN0108', '25BCAN0109', '25BCAN0110',
    '25BCAN0119', '25BCAN0127', '25BCAN0128', '25BCAN0129', '25BCAN0130',
    '25BCAN0131', '25BCAN0132', '25BCAN0133', '25BCAN0144', '25BCAN0147',
    '25BCAN0153', '25BCAN0154', '25BCAN0164', '25BCAN0168', '25BCAN0169',
    '25BCAN0172', '25BCAN0178', '25BCAN0179', '25BCAN0180', '25BCAN0183',
    '25BCAN0185', '25BCAN0194', '25BCAN0202', '25BCAN0672', '25BCAN0683'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WARNING: Drop or modify your existing "Allow uploads" policy on storage.objects 
-- before adding this, otherwise Supabase will combine them with OR.
CREATE POLICY "Allow uploads only for valid DBMS roll numbers"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'certificates' AND
  (
    (name NOT LIKE 'DBMS/%') -- Allow other files (like MATH) to pass this specific check
    OR
    public.is_allowed_dbms_roll_number(name)
  )
);
