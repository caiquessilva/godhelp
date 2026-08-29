CREATE TABLE public.places_cache (
  geohash TEXT NOT NULL,
  category TEXT NOT NULL,
  radius INTEGER NOT NULL,
  payload JSONB NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (geohash, category, radius)
);

CREATE INDEX places_cache_expires_at_idx ON public.places_cache (expires_at);

GRANT ALL ON public.places_cache TO service_role;

ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;