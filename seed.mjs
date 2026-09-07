import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://disouyodepqsbsmomkzj.supabase.co',
  'sb_publishable_1IfrFfEb-fXEeVleOC0cqg_M7XfMTK4'
)

const companies = [
  { name: 'Toptal', logo_url: 'https://logo.clearbit.com/toptal.com', website: 'https://www.toptal.com', industry: 'Staffing & Recruiting', pakistan_friendly: true },
  { name: 'Deel', logo_url: 'https://logo.clearbit.com/deel.com', website: 'https://www.deel.com', industry: 'HR Tech', pakistan_friendly: true },
  { name: 'Automattic', logo_url: 'https://logo.clearbit.com/automattic.com', website: 'https://automattic.com', industry: 'Software / SaaS', pakistan_friendly: true },
  { name: 'GitLab', logo_url: 'https://logo.clearbit.com/gitlab.com', website: 'https://gitlab.com', industry: 'DevOps / Software', pakistan_friendly: true },
  { name: 'Invisible Technologies', logo_url: 'https://logo.clearbit.com/invisible.email', website: 'https://www.invisible.email', industry: 'AI / Operations', pakistan_friendly: true },
  { name: 'Testlio', logo_url: 'https://logo.clearbit.com/testlio.com', website: 'https://testlio.com', industry: 'QA / Testing', pakistan_friendly: true },
  { name: 'Proxify', logo_url: 'https://logo.clearbit.com/proxify.io', website: 'https://proxify.io', industry: 'Staffing & Recruiting', pakistan_friendly: true },
]

const listingTemplates = [
  {
    title: 'Senior Full-Stack Engineer',
    seniority: 'senior',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    salary_range: '$5,000-$8,000/mo',
    short_summary: 'Join a globally distributed team building scalable SaaS products. You will own feature development end-to-end, from database design to polished UI. Strong async communication and a bias for shipping are a must.',
    original_url: 'https://toptal.com/careers',
    date_posted: '2026-08-01',
    verified: true,
    company_index: 0,
  },
  {
    title: 'Backend Engineer - Python',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'APAC / EMEA',
    tags: ['Python', 'Django', 'REST APIs', 'AWS'],
    salary_range: '$3,000-$5,000/mo',
    short_summary: 'Design and maintain high-throughput APIs powering a global payroll platform. You will work closely with the infrastructure team on performance, reliability, and security.',
    original_url: 'https://deel.com/careers',
    date_posted: '2026-08-03',
    verified: true,
    company_index: 1,
  },
  {
    title: 'React Native Mobile Developer',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['React Native', 'TypeScript', 'Redux', 'iOS/Android'],
    salary_range: '$2,500-$4,500/mo',
    short_summary: 'Build the mobile experience for millions of freelancers and businesses. You will collaborate directly with design and product to ship smooth, cross-platform features.',
    original_url: 'https://automattic.com/work-with-us/',
    date_posted: '2026-07-28',
    verified: true,
    company_index: 2,
  },
  {
    title: 'DevOps / Site Reliability Engineer',
    seniority: 'senior',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['Kubernetes', 'Terraform', 'CI/CD', 'GCP'],
    salary_range: '$6,000-$9,000/mo',
    short_summary: "Own the reliability and scalability of GitLab's own infrastructure - the largest public GitLab instance in the world. Deep Kubernetes and cloud experience required.",
    original_url: 'https://about.gitlab.com/jobs/',
    date_posted: '2026-07-25',
    verified: true,
    company_index: 3,
  },
  {
    title: 'AI Trainer - Data Annotation Lead',
    seniority: 'entry',
    location_type: 'remote',
    region_eligibility: 'Pakistan',
    tags: ['LLMs', 'Prompt Engineering', 'Data Labeling'],
    salary_range: '$800-$1,500/mo',
    short_summary: 'Help shape the next generation of AI models by creating and reviewing high-quality training data. Flexible hours, no prior ML degree required — attention to detail is key.',
    original_url: 'https://invisible.email/careers',
    date_posted: '2026-08-05',
    verified: false,
    company_index: 4,
  },
  {
    title: 'QA Engineer - Manual & Automation',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['Selenium', 'Cypress', 'JIRA', 'Agile'],
    salary_range: '$2,000-$3,500/mo',
    short_summary: "Work as a freelance QA engineer on cutting-edge products via Testlio's vetted network. Choose your projects, set your pace, and get paid weekly.",
    original_url: 'https://testlio.com/freelancers/',
    date_posted: '2026-08-02',
    verified: true,
    company_index: 5,
  },
  {
    title: 'Frontend Engineer - Vue.js',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'EMEA / South Asia',
    tags: ['Vue.js', 'Nuxt', 'TailwindCSS', 'GraphQL'],
    salary_range: '$2,500-$4,000/mo',
    short_summary: "Join Proxify's talent network and get matched with European tech startups looking for skilled frontend engineers. Long-term contracts, competitive rates, no bidding required.",
    original_url: 'https://proxify.io/apply',
    date_posted: '2026-07-30',
    verified: true,
    company_index: 6,
  },
  {
    title: 'Data Analyst - Growth & Marketing',
    seniority: 'entry',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['SQL', 'Python', 'Looker', 'A/B Testing'],
    salary_range: '$1,500-$2,500/mo',
    short_summary: "Analyze product and marketing data to surface growth opportunities. You'll build dashboards, run experiments, and present findings to senior leadership in a fully async environment.",
    original_url: 'https://deel.com/careers',
    date_posted: '2026-08-06',
    verified: false,
    company_index: 1,
  },
  {
    title: 'Technical Writer - Developer Docs',
    seniority: 'entry',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['Markdown', 'REST APIs', 'Git', 'Documentation'],
    salary_range: '$1,200-$2,000/mo',
    short_summary: 'Write clear, developer-friendly documentation for an open-source DevOps platform used by millions. Ideal for candidates with a CS background who love explaining complex ideas simply.',
    original_url: 'https://about.gitlab.com/jobs/',
    date_posted: '2026-07-22',
    verified: true,
    company_index: 3,
  },
  {
    title: 'Product Manager - B2B SaaS',
    seniority: 'senior',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['Product Strategy', 'Roadmapping', 'Agile', 'B2B'],
    salary_range: '$5,500-$8,500/mo',
    short_summary: "Define the roadmap for a suite of HR and compliance tools used by 35,000+ companies. You'll partner with engineering, design, and sales to ship features that solve real pain points.",
    original_url: 'https://deel.com/careers',
    date_posted: '2026-08-07',
    verified: true,
    company_index: 1,
  },
  {
    title: 'WordPress Engineer',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['WordPress', 'PHP', 'JavaScript', 'WooCommerce'],
    salary_range: '$3,000-$5,000/mo',
    short_summary: 'Help build and maintain the open web at the company behind WordPress.com, WooCommerce, and Tumblr. Fully distributed team, async-first culture, no offices.',
    original_url: 'https://automattic.com/work-with-us/',
    date_posted: '2026-07-20',
    verified: true,
    company_index: 2,
  },
  {
    title: 'Cybersecurity Analyst',
    seniority: 'senior',
    location_type: 'remote',
    region_eligibility: 'APAC / EMEA',
    tags: ['Penetration Testing', 'SIEM', 'SOC', 'Zero Trust'],
    salary_range: '$5,000-$7,500/mo',
    short_summary: "Protect a globally-distributed platform from evolving threats. You'll lead red-team exercises, triage incidents, and harden our cloud infrastructure across multiple regions.",
    original_url: 'https://about.gitlab.com/jobs/',
    date_posted: '2026-08-04',
    verified: true,
    company_index: 3,
  },
  {
    title: 'Customer Success Manager',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'South Asia',
    tags: ['CRM', 'Onboarding', 'SaaS', 'Communication'],
    salary_range: '$1,800-$3,000/mo',
    short_summary: 'Own the post-sale experience for SMB clients in South Asia. Drive retention and expansion by building deep relationships, running onboarding sessions, and capturing product feedback.',
    original_url: 'https://toptal.com/careers',
    date_posted: '2026-08-08',
    verified: false,
    company_index: 0,
  },
  {
    title: 'Machine Learning Engineer',
    seniority: 'senior',
    location_type: 'remote',
    region_eligibility: 'Worldwide',
    tags: ['Python', 'PyTorch', 'MLOps', 'NLP'],
    salary_range: '$7,000-$10,000/mo',
    short_summary: "Design, train, and deploy NLP models that power AI-driven workflows for Fortune 500 clients. You'll work at the intersection of research and production engineering.",
    original_url: 'https://invisible.email/careers',
    date_posted: '2026-07-18',
    verified: true,
    company_index: 4,
  },
  {
    title: 'iOS Developer - Swift',
    seniority: 'mid',
    location_type: 'remote',
    region_eligibility: 'APAC',
    tags: ['Swift', 'SwiftUI', 'Xcode', 'App Store'],
    salary_range: '$3,500-$5,500/mo',
    short_summary: "Build polished iOS features for a consumer app with 2M+ downloads. You'll own the full development lifecycle from technical spec to App Store submission in a small, high-trust team.",
    original_url: 'https://proxify.io/apply',
    date_posted: '2026-08-09',
    verified: false,
    company_index: 6,
  },
]

async function seed() {
  console.log('Inserting companies...')
  const { data: insertedCompanies, error: companyError } = await supabase
    .from('companies')
    .insert(companies)
    .select('id, name')

  if (companyError) {
    console.error('Company insert failed:', companyError.message)
    process.exit(1)
  }
  console.log(`Inserted ${insertedCompanies.length} companies.`)

  const listings = listingTemplates.map(({ company_index, ...l }) => ({
    ...l,
    company_id: insertedCompanies[company_index].id,
    is_active: true,
    date_added: new Date().toISOString(),
  }))

  console.log('Inserting listings...')
  const { data: insertedListings, error: listingError } = await supabase
    .from('listings')
    .insert(listings)
    .select('id, title')

  if (listingError) {
    console.error('Listings insert failed:', listingError.message)
    process.exit(1)
  }

  console.log(`Inserted ${insertedListings.length} listings:`)
  insertedListings.forEach((l) => console.log(`  - ${l.title}`))
}

seed()
