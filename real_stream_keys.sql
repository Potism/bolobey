-- Function to get a real Facebook stream key (you can add multiple keys)
CREATE OR REPLACE FUNCTION get_real_stream_key()
RETURNS TEXT AS $$
BEGIN
  -- Return your real Facebook stream key
  RETURN 'FB-1390865243047660-0-Ab08nGnqPJjstViKw7tQpieS';
  
  -- If you have multiple keys, you can rotate them:
  -- RETURN CASE 
  --   WHEN random() < 0.5 THEN 'FB-1390865243047660-0-Ab08nGnqPJjstViKw7tQpieS'
  --   ELSE 'FB-ANOTHER-STREAM-KEY-HERE'
  -- END;
END;
$$ LANGUAGE plpgsql;

-- Update the generate_stream_key function to use real keys
CREATE OR REPLACE FUNCTION generate_stream_key()
RETURNS TEXT AS $$
BEGIN
  -- Use real Facebook stream key instead of fake one
  RETURN get_real_stream_key();
END;
$$ LANGUAGE plpgsql; 