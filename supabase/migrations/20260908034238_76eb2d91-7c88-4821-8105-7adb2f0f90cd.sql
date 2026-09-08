REVOKE ALL ON public.pois FROM anon, authenticated;
GRANT ALL ON public.pois TO service_role;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_alerts_sent FROM anon, authenticated;
GRANT ALL ON public.push_alerts_sent TO service_role;
ALTER TABLE public.push_alerts_sent ENABLE ROW LEVEL SECURITY;