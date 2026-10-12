-- Migration 007: Create ratings table and denormalized average update logic per 04_DATABASE_SCHEMA.md & 09_MODULE_BUILD_PLAN.md

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
  rating_honesty SMALLINT NOT NULL CHECK (rating_honesty BETWEEN 1 AND 5),
  rating_punctuality SMALLINT NOT NULL CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_quality SMALLINT NOT NULL CHECK (rating_quality BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- Trigger function to update denormalized averages in provider_profiles per 04_DATABASE_SCHEMA.md
CREATE OR REPLACE FUNCTION update_provider_denormalized_ratings()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_avg_honesty DECIMAL(2,1);
  v_avg_punctuality DECIMAL(2,1);
  v_avg_quality DECIMAL(2,1);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT provider_id INTO v_provider_id FROM bookings WHERE id = OLD.booking_id;
  ELSE
    SELECT provider_id INTO v_provider_id FROM bookings WHERE id = NEW.booking_id;
  END IF;

  IF v_provider_id IS NOT NULL THEN
    SELECT 
      ROUND(AVG(r.rating_honesty)::numeric, 1),
      ROUND(AVG(r.rating_punctuality)::numeric, 1),
      ROUND(AVG(r.rating_quality)::numeric, 1)
    INTO 
      v_avg_honesty,
      v_avg_punctuality,
      v_avg_quality
    FROM ratings r
    JOIN bookings b ON b.id = r.booking_id
    WHERE b.provider_id = v_provider_id;

    UPDATE provider_profiles
    SET 
      avg_rating_honesty = v_avg_honesty,
      avg_rating_punctuality = v_avg_punctuality,
      avg_rating_quality = v_avg_quality,
      updated_at = NOW()
    WHERE id = v_provider_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_provider_ratings ON ratings;
CREATE TRIGGER trg_update_provider_ratings
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_provider_denormalized_ratings();
