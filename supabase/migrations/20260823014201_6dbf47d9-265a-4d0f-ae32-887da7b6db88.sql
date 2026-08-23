ALTER TABLE public.merchant_applications ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id);
ALTER TABLE public.driver_applications ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id);

UPDATE public.merchant_applications a
SET area_id = p.area_id
FROM public.profiles p
WHERE p.id = a.user_id AND a.area_id IS NULL AND p.area_id IS NOT NULL;

UPDATE public.driver_applications a
SET area_id = p.area_id
FROM public.profiles p
WHERE p.id = a.user_id AND a.area_id IS NULL AND p.area_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS merchant_applications_area_idx ON public.merchant_applications(area_id);
CREATE INDEX IF NOT EXISTS driver_applications_area_idx ON public.driver_applications(area_id);