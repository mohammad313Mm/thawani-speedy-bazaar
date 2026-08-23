ALTER TABLE public.app_categories ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.broadcast_notifications ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.taxi_drivers ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS app_categories_area_idx ON public.app_categories(area_id);
CREATE INDEX IF NOT EXISTS broadcast_notifications_area_idx ON public.broadcast_notifications(area_id);
CREATE INDEX IF NOT EXISTS admin_notifications_area_idx ON public.admin_notifications(area_id);
CREATE INDEX IF NOT EXISTS taxi_drivers_area_idx ON public.taxi_drivers(area_id);

-- stamp admin notifications with the related user's area so the admin panel can isolate them
CREATE OR REPLACE FUNCTION public.notify_admin_driver_app()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id, area_id)
  values (
    'driver_application',
    'طلب انضمام مندوب توصيل جديد',
    coalesce(new.full_name,'') || case when new.vehicle_type is not null then ' — ' || new.vehicle_type else '' end,
    'driver_applications',
    new.id,
    (select p.area_id from public.profiles p where p.id = new.user_id)
  );
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.notify_admin_merchant_app()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id, area_id)
  values (
    'merchant_application',
    'طلب انضمام صاحب متجر جديد',
    coalesce(new.full_name,'') || case when new.store_name is not null then ' — ' || new.store_name else '' end,
    'merchant_applications',
    new.id,
    (select p.area_id from public.profiles p where p.id = new.user_id)
  );
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.notify_admin_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id, area_id)
  values (
    'support_message',
    'رسالة دعم جديدة',
    coalesce(nullif(new.full_name,''), 'مستخدم') ||
      case when new.phone is not null and new.phone <> '' then ' — ' || new.phone else '' end ||
      ': ' || left(new.message, 300),
    'support_messages',
    new.id,
    (select p.area_id from public.profiles p where p.id = new.user_id)
  );
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.support_chat_after_user_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  has_system boolean;
  uname text;
  uarea uuid;
BEGIN
  IF new.sender <> 'user' THEN
    RETURN new;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.support_chat_messages
    WHERE user_id = new.user_id AND sender = 'system'
  ) INTO has_system;

  IF NOT has_system THEN
    INSERT INTO public.support_chat_messages (user_id, sender, body)
    VALUES (new.user_id, 'system', 'مرحباً بك في ثواني، سيتم الرد عليك قريباً.');
  END IF;

  SELECT coalesce(nullif(full_name,''), phone), area_id INTO uname, uarea
  FROM public.profiles WHERE id = new.user_id;

  INSERT INTO public.admin_notifications (kind, title, body, ref_table, ref_id, area_id)
  VALUES (
    'support_chat',
    'رسالة دعم جديدة',
    coalesce(uname, 'زبون') || ': ' || left(new.body, 300),
    'support_chat_messages',
    new.id,
    uarea
  );

  RETURN new;
END;
$function$;