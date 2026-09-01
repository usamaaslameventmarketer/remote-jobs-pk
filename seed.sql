-- Remote Jobs PK — seed data
-- Paste this into the Supabase SQL Editor and click Run

-- ============================================================
-- PROFILES TABLE (run once — required for paywall logic)
-- ============================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  is_pro     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS: users can only read their own profile row
alter table profiles enable row level security;
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);
-- ============================================================

-- Companies
INSERT INTO companies (name, logo_url, website, industry, pakistan_friendly) VALUES
  ('Toptal',               'https://logo.clearbit.com/toptal.com',       'https://www.toptal.com',      'Staffing & Recruiting', true),
  ('Deel',                 'https://logo.clearbit.com/deel.com',         'https://www.deel.com',        'HR Tech',               true),
  ('Automattic',           'https://logo.clearbit.com/automattic.com',   'https://automattic.com',      'Software / SaaS',       true),
  ('GitLab',               'https://logo.clearbit.com/gitlab.com',       'https://gitlab.com',          'DevOps / Software',     true),
  ('Invisible Technologies','https://logo.clearbit.com/invisible.email', 'https://www.invisible.email', 'AI / Operations',       true),
  ('Testlio',              'https://logo.clearbit.com/testlio.com',      'https://testlio.com',         'QA / Testing',          true),
  ('Proxify',              'https://logo.clearbit.com/proxify.io',       'https://proxify.io',          'Staffing & Recruiting', true)
RETURNING id, name;

-- Listings (uses a CTE so company IDs are resolved by name)
WITH c AS (
  SELECT id, name FROM companies
  WHERE name IN ('Toptal','Deel','Automattic','GitLab','Invisible Technologies','Testlio','Proxify')
)
INSERT INTO listings (title, seniority, location_type, region_eligibility, tags, salary_range, short_summary, original_url, date_posted, date_added, verified, is_active, company_id)
SELECT * FROM (VALUES
  ('Senior Full-Stack Engineer',     'senior', 'remote', 'Worldwide',
   ARRAY['React','Node.js','TypeScript','PostgreSQL'], '$5,000-$8,000/mo',
   'Join a globally distributed team building scalable SaaS products. You will own feature development end-to-end, from database design to polished UI. Strong async communication and a bias for shipping are a must.',
   'https://toptal.com/careers', '2026-08-01'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Toptal')),

  ('Backend Engineer - Python',      'mid',    'remote', 'APAC / EMEA',
   ARRAY['Python','Django','REST APIs','AWS'], '$3,000-$5,000/mo',
   'Design and maintain high-throughput APIs powering a global payroll platform. You will work closely with the infrastructure team on performance, reliability, and security.',
   'https://deel.com/careers', '2026-08-03'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Deel')),

  ('React Native Mobile Developer',  'mid',    'remote', 'Worldwide',
   ARRAY['React Native','TypeScript','Redux','iOS/Android'], '$2,500-$4,500/mo',
   'Build the mobile experience for millions of freelancers and businesses. You will collaborate directly with design and product to ship smooth, cross-platform features.',
   'https://automattic.com/work-with-us/', '2026-07-28'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Automattic')),

  ('DevOps / Site Reliability Engineer', 'senior', 'remote', 'Worldwide',
   ARRAY['Kubernetes','Terraform','CI/CD','GCP'], '$6,000-$9,000/mo',
   'Own the reliability and scalability of GitLab''s own infrastructure - the largest public GitLab instance in the world. Deep Kubernetes and cloud experience required.',
   'https://about.gitlab.com/jobs/', '2026-07-25'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'GitLab')),

  ('AI Trainer - Data Annotation Lead', 'entry', 'remote', 'Pakistan',
   ARRAY['LLMs','Prompt Engineering','Data Labeling'], '$800-$1,500/mo',
   'Help shape the next generation of AI models by creating and reviewing high-quality training data. Flexible hours, no prior ML degree required — attention to detail is key.',
   'https://invisible.email/careers', '2026-08-05'::date, NOW(), false, true, (SELECT id FROM c WHERE name = 'Invisible Technologies')),

  ('QA Engineer - Manual & Automation', 'mid',  'remote', 'Worldwide',
   ARRAY['Selenium','Cypress','JIRA','Agile'], '$2,000-$3,500/mo',
   'Work as a freelance QA engineer on cutting-edge products via Testlio''s vetted network. Choose your projects, set your pace, and get paid weekly.',
   'https://testlio.com/freelancers/', '2026-08-02'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Testlio')),

  ('Frontend Engineer - Vue.js',     'mid',    'remote', 'EMEA / South Asia',
   ARRAY['Vue.js','Nuxt','TailwindCSS','GraphQL'], '$2,500-$4,000/mo',
   'Join Proxify''s talent network and get matched with European tech startups. Long-term contracts, competitive rates, no bidding required.',
   'https://proxify.io/apply', '2026-07-30'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Proxify')),

  ('Data Analyst - Growth & Marketing', 'entry', 'remote', 'Worldwide',
   ARRAY['SQL','Python','Looker','A/B Testing'], '$1,500-$2,500/mo',
   'Analyze product and marketing data to surface growth opportunities. You will build dashboards, run experiments, and present findings to senior leadership in a fully async environment.',
   'https://deel.com/careers', '2026-08-06'::date, NOW(), false, true, (SELECT id FROM c WHERE name = 'Deel')),

  ('Technical Writer - Developer Docs', 'entry', 'remote', 'Worldwide',
   ARRAY['Markdown','REST APIs','Git','Documentation'], '$1,200-$2,000/mo',
   'Write clear, developer-friendly documentation for an open-source DevOps platform used by millions. Ideal for candidates with a CS background who love explaining complex ideas simply.',
   'https://about.gitlab.com/jobs/', '2026-07-22'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'GitLab')),

  ('Product Manager - B2B SaaS',     'senior', 'remote', 'Worldwide',
   ARRAY['Product Strategy','Roadmapping','Agile','B2B'], '$5,500-$8,500/mo',
   'Define the roadmap for a suite of HR and compliance tools used by 35,000+ companies. You will partner with engineering, design, and sales to ship features that solve real pain points.',
   'https://deel.com/careers', '2026-08-07'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Deel')),

  ('WordPress Engineer',             'mid',    'remote', 'Worldwide',
   ARRAY['WordPress','PHP','JavaScript','WooCommerce'], '$3,000-$5,000/mo',
   'Help build and maintain the open web at the company behind WordPress.com, WooCommerce, and Tumblr. Fully distributed team, async-first culture, no offices.',
   'https://automattic.com/work-with-us/', '2026-07-20'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Automattic')),

  ('Cybersecurity Analyst',          'senior', 'remote', 'APAC / EMEA',
   ARRAY['Penetration Testing','SIEM','SOC','Zero Trust'], '$5,000-$7,500/mo',
   'Protect a globally-distributed platform from evolving threats. You will lead red-team exercises, triage incidents, and harden our cloud infrastructure across multiple regions.',
   'https://about.gitlab.com/jobs/', '2026-08-04'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'GitLab')),

  ('Customer Success Manager',       'mid',    'remote', 'South Asia',
   ARRAY['CRM','Onboarding','SaaS','Communication'], '$1,800-$3,000/mo',
   'Own the post-sale experience for SMB clients in South Asia. Drive retention and expansion by building deep relationships, running onboarding sessions, and capturing product feedback.',
   'https://toptal.com/careers', '2026-08-08'::date, NOW(), false, true, (SELECT id FROM c WHERE name = 'Toptal')),

  ('Machine Learning Engineer',      'senior', 'remote', 'Worldwide',
   ARRAY['Python','PyTorch','MLOps','NLP'], '$7,000-$10,000/mo',
   'Design, train, and deploy NLP models that power AI-driven workflows for Fortune 500 clients. You will work at the intersection of research and production engineering.',
   'https://invisible.email/careers', '2026-07-18'::date, NOW(), true, true, (SELECT id FROM c WHERE name = 'Invisible Technologies')),

  ('iOS Developer - Swift',          'mid',    'remote', 'APAC',
   ARRAY['Swift','SwiftUI','Xcode','App Store'], '$3,500-$5,500/mo',
   'Build polished iOS features for a consumer app with 2M+ downloads. You will own the full development lifecycle from technical spec to App Store submission in a small, high-trust team.',
   'https://proxify.io/apply', '2026-08-09'::date, NOW(), false, true, (SELECT id FROM c WHERE name = 'Proxify'))
) AS v(title, seniority, location_type, region_eligibility, tags, salary_range, short_summary, original_url, date_posted, date_added, verified, is_active, company_id);

SELECT COUNT(*) AS listings_inserted FROM listings;

-- ============================================================
-- FEATURED LISTINGS + EMPLOYER BUNDLES (run once)
-- ============================================================

-- Featured placement fields on listings
alter table listings
  add column if not exists featured boolean not null default false,
  add column if not exists featured_until date;

-- One bundle per payment — tracks 5 featured listing credits per employer
create table if not exists employer_bundles (
  id                   uuid        primary key default gen_random_uuid(),
  contact_email        text        not null,
  credits_total        integer     not null default 5,
  credits_used         integer     not null default 0,
  payment_confirmed_at timestamptz,
  created_at           timestamptz not null default now()
);
-- ============================================================

-- ============================================================
-- POST A JOB SCHEMA (run once — required for employer submissions)
-- ============================================================

-- Track whether a listing came from automated ingestion or an employer submission
alter table listings
  add column if not exists source text not null default 'ingested';

-- Employer job submissions (held for payment + review before going live)
create table if not exists submissions (
  id                 uuid        primary key default gen_random_uuid(),
  company_name       text        not null,
  company_website    text        not null,
  company_logo_url   text,
  title              text        not null,
  category           text        not null,
  seniority          text        not null,
  region_eligibility text        not null,
  description        text        not null,
  application_url    text        not null,
  salary_range       text,
  contact_email      text        not null,
  payment_status     text        not null default 'pending',  -- pending | confirmed
  approval_status    text        not null default 'pending',  -- pending | approved | rejected
  listing_id         uuid        references listings(id),
  submitted_at       timestamptz not null default now(),
  reviewed_at        timestamptz,
  admin_notes        text
);

alter table submissions enable row level security;

-- Anyone (including unauthenticated visitors) can submit a listing
drop policy if exists "Public can insert submissions" on submissions;
create policy "Public can insert submissions" on submissions
  for insert with check (true);

-- Only the admin account can read submissions
drop policy if exists "Admin can read submissions" on submissions;
create policy "Admin can read submissions" on submissions
  for select using ((auth.jwt() ->> 'email') = 'usama.aslam975@gmail.com');

-- Only the admin account can update submissions (confirm payment, approve, reject)
drop policy if exists "Admin can update submissions" on submissions;
create policy "Admin can update submissions" on submissions
  for update using ((auth.jwt() ->> 'email') = 'usama.aslam975@gmail.com');
-- ============================================================
