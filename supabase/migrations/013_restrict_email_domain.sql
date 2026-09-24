-- Le Studio — Kanban : migration 013
-- À exécuter dans le SQL Editor de ton projet Supabase existant (safe à rejouer).
--
-- Restreint la création de compte aux adresses e-mail se terminant par
-- @cgi.com : toute autre adresse est rejetée avant l'envoi du code de
-- connexion, quelle que soit la façon dont l'appel est fait (frontend ou
-- appel direct à l'API Supabase).
--
-- Ne touche pas aux comptes déjà créés avant cette migration, même s'ils
-- n'utilisent pas une adresse @cgi.com.

create or replace function public.enforce_cgi_email_domain()
returns trigger as $$
begin
  if new.email is null or new.email !~* '@([a-z0-9-]+\.)*cgi\.com$' then
    raise exception 'Adresse e-mail non autorisée : seules les adresses @cgi.com peuvent créer un compte.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists enforce_cgi_email_domain on auth.users;
create trigger enforce_cgi_email_domain
  before insert on auth.users
  for each row execute function public.enforce_cgi_email_domain();
