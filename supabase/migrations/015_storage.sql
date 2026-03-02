-- Migration 015: Storage bucket for print order files
-- Private bucket with 50MB limit, restricted to document/image MIME types
-- NOTE: This INSERT may fail if run via migration tools that don't have access
-- to the storage schema. If it fails, run it directly in the Supabase SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print-files',
  'print-files',
  FALSE,  -- private bucket
  52428800,  -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);
