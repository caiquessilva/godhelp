CREATE TABLE IF NOT EXISTS public.pois (
  id text NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  payload jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, category)
);

GRANT ALL ON public.pois TO service_role;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pois_geo_idx ON public.pois (category, latitude, longitude);
CREATE INDEX IF NOT EXISTS pois_refreshed_idx ON public.pois (refreshed_at);

CREATE OR REPLACE FUNCTION public.pois_geosearch(
  _lat double precision,
  _lng double precision,
  _radius double precision,
  _category text,
  _limit integer DEFAULT 12,
  _max_age_minutes integer DEFAULT 180
)
RETURNS TABLE (payload jsonb, distance_meters double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH box AS (
    SELECT
      _radius / 111320.0 AS dlat,
      _radius / (111320.0 * GREATEST(cos(radians(_lat)), 0.01)) AS dlng
  )
  SELECT p.payload,
         (6371000 * 2 * asin(sqrt(
            power(sin(radians(p.latitude - _lat) / 2), 2) +
            cos(radians(_lat)) * cos(radians(p.latitude)) *
            power(sin(radians(p.longitude - _lng) / 2), 2)
         )))::double precision AS distance_meters
  FROM public.pois p, box b
  WHERE p.category = _category
    AND p.refreshed_at > now() - make_interval(mins => _max_age_minutes)
    AND p.latitude BETWEEN _lat - b.dlat AND _lat + b.dlat
    AND p.longitude BETWEEN _lng - b.dlng AND _lng + b.dlng
    AND (6371000 * 2 * asin(sqrt(
          power(sin(radians(p.latitude - _lat) / 2), 2) +
          cos(radians(_lat)) * cos(radians(p.latitude)) *
          power(sin(radians(p.longitude - _lng) / 2), 2)
       ))) <= _radius
  ORDER BY distance_meters
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.pois_geosearch(double precision, double precision, double precision, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pois_geosearch(double precision, double precision, double precision, text, integer, integer) TO service_role;