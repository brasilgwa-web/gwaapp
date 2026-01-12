-- Create a table for system logs
create table public.system_logs (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    level text not null, -- 'info', 'warn', 'error'
    category text not null, -- 'AI', 'TEMPLATE', 'SYSTEM', 'USER_ACTION'
    message text not null,
    details jsonb null,
    user_id uuid null references auth.users(id),
    constraint system_logs_pkey primary key (id)
);

-- Enable RLS
alter table public.system_logs enable row level security;

-- Policy: Allow authenticated users to insert logs
create policy "Enable insert for authenticated users only" 
on public.system_logs 
for insert 
to authenticated 
with check (true);

-- Policy: Allow authenticated users to view logs (optional, maybe restrict to admins later)
create policy "Enable select for authenticated users only" 
on public.system_logs 
for select 
to authenticated 
using (true);
