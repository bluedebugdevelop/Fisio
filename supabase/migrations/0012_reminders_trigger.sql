-- supabase/migrations/0012_reminders_trigger.sql

create or replace function public.enqueue_appointment_reminders()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_template uuid;
  v_24h timestamptz;
  v_2h timestamptz;
  v_patient_email text;
begin
  -- Cancelar recordatorios anteriores si la cita cambia de tiempo o se cancela
  if tg_op = 'UPDATE' then
    if (old.starts_at <> new.starts_at)
       or (old.status in ('cancelled','no_show') and new.status not in ('cancelled','no_show'))
       or (new.status in ('cancelled','no_show')) then
      update appointment_reminders
        set status = 'cancelled'
        where appointment_id = new.id and status = 'pending';
    end if;
    if new.status in ('cancelled','no_show') then
      return new;
    end if;
  end if;

  -- Si el paciente no tiene consentimiento de comunicaciones activo, no encolar
  if not exists (
    select 1 from patient_consents pc
      join clinic_consents cc on cc.id = pc.consent_id
      where pc.patient_id = new.patient_id
        and pc.granted = true
        and pc.withdrawn_at is null
        and cc.kind = 'comunicaciones'
        and cc.is_current = true
  ) then
    return new;
  end if;

  v_24h := new.starts_at - interval '24 hours';
  v_2h := new.starts_at - interval '2 hours';

  -- Encolar 24h si está en el futuro y no existe ya
  if v_24h > now() then
    select id into v_template from reminder_templates
      where clinic_id = new.clinic_id and name = 'Recordatorio 24h' and is_active = true limit 1;
    insert into appointment_reminders(clinic_id, appointment_id, template_id, channel, scheduled_at)
    select new.clinic_id, new.id, v_template, 'email', v_24h
    where not exists (
      select 1 from appointment_reminders
        where appointment_id = new.id and scheduled_at = v_24h and channel = 'email' and status = 'pending'
    );
  end if;

  -- Encolar 2h
  if v_2h > now() then
    insert into appointment_reminders(clinic_id, appointment_id, template_id, channel, scheduled_at)
    select new.clinic_id, new.id, null, 'email', v_2h
    where not exists (
      select 1 from appointment_reminders
        where appointment_id = new.id and scheduled_at = v_2h and channel = 'email' and status = 'pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_reminders_ins on appointments;
create trigger trg_enqueue_reminders_ins
  after insert on appointments
  for each row execute function enqueue_appointment_reminders();

drop trigger if exists trg_enqueue_reminders_upd on appointments;
create trigger trg_enqueue_reminders_upd
  after update of starts_at, status on appointments
  for each row execute function enqueue_appointment_reminders();
