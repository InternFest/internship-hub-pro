-- Add new fields to internship_diary table for enhanced diary entries
ALTER TABLE public.internship_diary
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS work_summary TEXT,
ADD COLUMN IF NOT EXISTS reference_links TEXT,
ADD COLUMN IF NOT EXISTS skills_gained TEXT;

-- Add new fields to batches table
ALTER TABLE public.batches
ADD COLUMN IF NOT EXISTS batch_strength INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS batch_timings TEXT;

-- Add title field to leave_requests for enhanced leave management
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS title TEXT;