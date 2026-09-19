/* SkyCodes — seed data.
   Everything the site renders comes from here (or from localStorage once the
   admin panel edits it). Nothing is hardcoded inside components. */

const SEED = {
  categories: [
    { id: 'c1', name: 'Cheat Sheets', slug: 'cheat-sheets', blurb: 'One-page references you actually keep open', sort_order: 1, is_featured: true },
    { id: 'c2', name: 'Interview Prep', slug: 'interview-prep', blurb: 'Question banks and answer frameworks', sort_order: 2, is_featured: true },
    { id: 'c3', name: 'Learning Plans', slug: 'learning-plans', blurb: 'Day-by-day routes from zero to job-ready', sort_order: 3, is_featured: true },
    { id: 'c4', name: 'Templates', slug: 'templates', blurb: 'Starter kits, resumes, pipelines', sort_order: 4, is_featured: true },
    { id: 'c5', name: 'Project Walkthroughs', slug: 'walkthroughs', blurb: 'Real builds, real errors, real fixes', sort_order: 5, is_featured: true },
    { id: 'c6', name: 'Trackers', slug: 'trackers', blurb: 'Stay honest about your progress', sort_order: 6, is_featured: true },
    { id: 'c7', name: 'Bundles', slug: 'bundles', blurb: 'Everything for one goal, one price', sort_order: 7, is_featured: true }
  ],

  products: [
    // Cheat sheets
    p('p1', 'Python Basics Cheat Sheet', 'c1', 199, null, 'Syntax, data types, loops, functions and the standard-library calls you reach for daily — on pages you can pin next to your editor.', 'Syntax and standard library, one page at a time', ['PDF · 12 pages', 'Print-friendly', 'Lifetime updates'], true, 0),
    p('p2', 'AWS Cloud Practitioner Formula Sheet', 'c1', 249, 199, 'Every pricing model, service category and exam-favourite comparison laid out so you stop second-guessing on test day.', 'The CLF-C02 facts that actually get asked', ['PDF · 18 pages', 'Exam-aligned', 'Updated 2026'], true, 340),
    p('p3', 'Linux Commands Handbook', 'c1', 199, null, 'Files, permissions, processes, networking, systemd and text processing — grouped by the task you are trying to finish.', 'Grouped by task, not alphabetically', ['PDF · 24 pages', 'Task-grouped'], false, 120),
    p('p4', 'Docker Quick Reference Card', 'c1', 199, null, 'Build, run, network, volume and compose commands with the flags that matter and the ones that quietly break things.', 'Build, run, debug, clean up', ['PDF · 8 pages'], false, 90),
    p('p5', 'Kubernetes Commands Cheat Sheet', 'c1', 249, null, 'kubectl for humans: inspect, debug, roll out, roll back, and read the events that explain why a pod will not start.', 'kubectl, organised by what broke', ['PDF · 14 pages'], true, 260),
    p('p6', 'Git & GitHub Commands Guide', 'c1', 199, null, 'Branching, rebasing, fixing a bad commit, and getting out of a detached HEAD without deleting the repo.', 'Including how to undo things safely', ['PDF · 16 pages'], false, 150),
    p('p7', 'Terraform Syntax Reference', 'c1', 299, null, 'HCL blocks, expressions, functions, state commands and module structure, with a worked example beside each concept.', 'HCL with a worked example per concept', ['PDF · 20 pages'], false, 70),

    // Interview prep
    p('p8', '100 DevOps Interview Q&A', 'c2', 399, 349, 'A hundred questions from real screening rounds — Linux, CI/CD, containers, cloud, incident handling — each with an answer you can say out loud.', 'Answers written to be spoken, not memorised', ['PDF · 86 pages', 'Answer scripts'], true, 410),
    p('p9', '50 AWS Interview Questions + Answers', 'c2', 349, null, 'VPC design, IAM boundaries, S3 consistency, autoscaling and the follow-up questions interviewers ask after your first answer.', 'With the follow-up questions too', ['PDF · 48 pages'], true, 300),
    p('p10', 'Python Coding Interview Questions Pack', 'c2', 349, null, 'Forty problems in the shapes companies keep reusing, with worked solutions and the complexity trade-offs explained.', 'Forty problems, worked solutions', ['PDF + .py files'], false, 180),
    p('p11', 'Mock Interview Question Bank', 'c2', 299, null, 'Self-practice format: prompt on one side, scoring rubric on the other, so you can run rounds with a friend or alone.', 'Run your own rounds with a rubric', ['PDF · 40 pages'], false, 60),
    p('p12', 'STAR Method Answer Templates', 'c2', 299, null, 'Twelve behavioural prompts with fill-in frames for Situation, Task, Action and Result — plus examples from real infra work.', 'Fill-in frames for behavioural rounds', ['DOCX + PDF'], false, 95),

    // Learning plans
    p('p13', '30-Day Python Learning Plan', 'c3', 399, null, 'A dated schedule with daily topics, practice sets and a small build at the end of each week, sized for people with a job.', 'One hour a day for thirty days', ['PDF + Notion'], true, 280),
    p('p14', '30-Day AWS Learning Plan', 'c3', 449, 399, 'Console to CLI to Terraform across a month, ending with a deployed three-tier app you can put on your resume.', 'Ends with a deployed app, not a certificate', ['PDF + Notion'], true, 320),
    p('p15', '21-Day Linux Mastery Plan', 'c3', 399, null, 'Three weeks of daily drills on the shell, permissions, services and troubleshooting, with a checkpoint every Sunday.', 'Daily drills, weekly checkpoints', ['PDF + Notion'], false, 110),
    p('p16', '14-Day Docker & Containers Plan', 'c3', 399, null, 'From first container to a multi-service compose stack with volumes, networks and a working local registry.', 'First container to compose stack', ['PDF + Notion'], false, 85),
    p('p17', 'Kubernetes in 21 Days', 'c3', 599, null, 'Beginner-friendly path through pods, services, ingress, config, storage and a real deployment on EKS at the end.', 'Beginner-friendly, ends on EKS', ['PDF + Notion'], false, 140),

    // Templates
    p('p18', 'Terraform Starter Templates Pack', 'c4', 799, null, 'Three-tier VPC, EC2 with hardened security groups, and S3 with lifecycle rules — modules you can drop into a real account today.', 'Three production-shaped modules', ['.tf modules + README'], true, 210),
    p('p19', 'CI/CD Pipeline Templates', 'c4', 699, 599, 'GitHub Actions and Jenkins pipelines for build, test, scan and deploy, including the secrets handling most tutorials skip.', 'GitHub Actions and Jenkins, secrets included', ['YAML + Jenkinsfile'], true, 190),
    p('p20', 'Resume Template Pack for Cloud/DevOps Freshers', 'c4', 499, null, 'Three ATS-safe layouts with phrasing for projects when you do not yet have production experience to point at.', 'ATS-safe, written for first jobs', ['DOCX + PDF'], true, 380),
    p('p21', 'LinkedIn-Ready Project Description Templates', 'c4', 499, null, 'Turn a GitHub repo into a post and a profile entry people actually read, with twelve worked rewrites.', 'Turn a repo into something readable', ['DOCX'], false, 75),
    p('p22', 'Cover Letter + Follow-up Email Templates', 'c4', 499, null, 'Application, referral request, post-interview thank you and the polite nudge after silence.', 'Including the polite nudge after silence', ['DOCX'], false, 55),

    // Walkthroughs
    p('p23', 'Library Management on EKS — Full Walkthrough', 'c5', 999, 899, 'The whole build: containerise the app, provision EKS with Terraform, wire CI/CD, add ingress and monitoring, then tear it down cleanly.', 'Full build, including the teardown', ['PDF · 120 pages', 'Private repo access'], true, 240),
    p('p24', 'AWS 3-Tier VPC Architecture Walkthrough', 'c5', 799, null, 'Subnets, route tables, NAT, bastion access and security groups explained by drawing the traffic path for every request.', 'Follow one request through the whole VPC', ['PDF · 64 pages', 'Diagrams'], false, 160),
    p('p25', 'Deploy Your First App on Kubernetes', 'c5', 599, null, 'One afternoon from a Dockerfile to a service reachable over the internet, with every error message you will hit on the way.', 'One afternoon, errors included', ['PDF · 52 pages'], false, 130),
    p('p26', 'GitOps + ArgoCD Mini-Project Guide', 'c5', 799, null, 'Declarative deployments with ArgoCD: repo layout, sync policies, rollbacks and what to do when drift appears.', 'Repo layout, sync, rollback, drift', ['PDF + repo'], false, 88),

    // Trackers
    p('p27', 'Notion Job Application + Learning Tracker', 'c6', 299, 249, 'A duplicate-and-go Notion workspace for applications, follow-up dates, interview notes and what you studied each week.', 'Applications and study in one workspace', ['Notion template'], true, 290),
    p('p28', 'Study Planner + Progress Tracker', 'c6', 249, null, 'Excel and Notion versions with streaks, topic coverage and an honest weekly review page.', 'Excel and Notion, with an honest review page', ['XLSX + Notion'], false, 100),
    p('p29', 'DevOps Skills Self-Assessment Checklist', 'c6', 199, null, 'Ninety skills scored one to five, so you can see the gap between what you know and what the job posting wants.', 'Score ninety skills, find the gap', ['PDF + XLSX'], false, 65),

    // Bundle
    Object.assign(
      p('p30', 'Fresher to First Job — Mega Bundle', 'c7', 999, null, 'The resume pack, the hundred-question DevOps interview set and the EKS project walkthrough, sold together for less than two of them separately.', 'Resume, interview prep and one real project', ['3 products', 'Save ₹898'], true, 450),
      { is_bundle: true, bundle_includes: ['p20', 'p8', 'p23'] }
    )
  ],

  services: [
    { id: 's1', title: 'Cloud solutions', description: 'AWS setup, EC2, S3, VPC, IAM, networking and end-to-end deployment.', category: 'Cloud', is_active: true },
    { id: 's2', title: 'DevOps & CI/CD', description: 'GitHub Actions, Jenkins, Docker and fully automated deployment pipelines.', category: 'Automation', is_active: true },
    { id: 's3', title: 'Infrastructure as code', description: 'Terraform provisioning and repeatable, reviewable automation.', category: 'Automation', is_active: true },
    { id: 's4', title: 'Kubernetes', description: 'Containerisation, deployments and cluster setup on EKS.', category: 'Platform', is_active: true },
    { id: 's5', title: 'Cloud security & IAM', description: 'IAM configuration, access policies and security hardening.', category: 'Security', is_active: true },
    { id: 's6', title: 'Monitoring', description: 'Prometheus, Grafana, CloudWatch and logging setup.', category: 'Platform', is_active: true },
    { id: 's7', title: 'Web development', description: 'React and Next.js sites plus full-stack applications.', category: 'Build', is_active: true },
    { id: 's8', title: 'Website deployment', description: 'Shipping apps to AWS, VPS and Docker environments.', category: 'Build', is_active: true },
    { id: 's9', title: 'Server setup & Linux', description: 'Linux server configuration and application deployment.', category: 'Cloud', is_active: true },
    { id: 's10', title: 'DevOps automation', description: 'Automating repetitive deployment and infrastructure work.', category: 'Automation', is_active: true }
  ],

  courses: [
    {
      id: 'k1', title: 'DSA — Full Course', slug: 'dsa-full-course', type: 'free', price_inr: null,
      description: 'Arrays to graphs, taught the way interviews ask about them. Hosted free on YouTube.',
      external_url: 'https://youtu.be/sri38AXpTJs', level: 'Beginner', hours: 11, is_active: true,
      lessons: []
    },
    {
      id: 'k2', title: 'JavaScript — Full Course', slug: 'javascript-full-course', type: 'free', price_inr: null,
      description: 'The language from syntax to async, with the browser bits you need to ship something real. Free on YouTube.',
      external_url: 'https://youtu.be/EA4lftpSyz4', level: 'Beginner', hours: 9, is_active: true,
      lessons: []
    },
    {
      id: 'k3', title: 'AWS for Absolute Beginners', slug: 'aws-for-beginners', type: 'paid', price_inr: 1499,
      description: 'Build and deploy a three-tier application on AWS, explained from an empty console. Ends with a project you can show an interviewer.',
      external_url: null, level: 'Beginner', hours: 6, is_active: true,
      lessons: [
        { id: 'l1', title: 'What the cloud actually is', duration: '08:12' },
        { id: 'l2', title: 'Your account, billing alarms and IAM users', duration: '14:40' },
        { id: 'l3', title: 'EC2: your first server', duration: '19:05' },
        { id: 'l4', title: 'VPC, subnets and why traffic gets blocked', duration: '22:31' },
        { id: 'l5', title: 'S3 and static hosting', duration: '11:48' },
        { id: 'l6', title: 'RDS and connecting the app tier', duration: '17:20' },
        { id: 'l7', title: 'Load balancing and autoscaling', duration: '16:02' },
        { id: 'l8', title: 'Deploying the finished app', duration: '21:15' }
      ]
    },
    {
      id: 'k4', title: 'Kubernetes on EKS, End to End', slug: 'kubernetes-on-eks', type: 'paid', price_inr: 2499,
      description: 'Provision a cluster with Terraform, deploy a real workload, add ingress, monitoring and GitOps, and handle the failures on the way.',
      external_url: null, level: 'Intermediate', hours: 8, is_active: true,
      lessons: [
        { id: 'l1', title: 'Pods, deployments, services', duration: '18:24' },
        { id: 'l2', title: 'Provisioning EKS with Terraform', duration: '26:10' },
        { id: 'l3', title: 'Config, secrets and storage', duration: '15:35' },
        { id: 'l4', title: 'Ingress and TLS', duration: '20:02' },
        { id: 'l5', title: 'Monitoring with Prometheus and Grafana', duration: '23:47' },
        { id: 'l6', title: 'GitOps with ArgoCD', duration: '19:58' },
        { id: 'l7', title: 'Debugging a cluster at 2am', duration: '24:12' }
      ]
    }
  ],

  reviews: [
    { id: 'r1', product_id: 'p8', user_name: 'Ankit R.', rating: 5, comment: 'Used the answer scripts the night before a screening round and cleared it. The follow-up questions section is the part nobody else writes.', is_approved: true, created_at: '2026-07-14' },
    { id: 'r2', product_id: 'p20', user_name: 'Priyanka S.', rating: 5, comment: 'Rewrote my resume with the fresher layout and started getting callbacks in two weeks. Worth it.', is_approved: true, created_at: '2026-08-02' },
    { id: 'r3', product_id: 'p23', user_name: 'Mohit K.', rating: 4, comment: 'The teardown chapter saved me a bill I would have cried about. Very thorough walkthrough.', is_approved: true, created_at: '2026-08-21' },
    { id: 'r4', product_id: 'p14', user_name: 'Sneha D.', rating: 5, comment: 'Followed the 30 days properly and ended with a deployed app. Finally something with an actual finish line.', is_approved: true, created_at: '2026-09-01' }
  ],

  settings: {
    brand: 'SkyCodes',
    tagline: 'Buy Smarter. Live Higher.',
    email: 'contact.skycodes@gmail.com',
    socials: {
      instagram: 'https://instagram.com/skycodes10',
      youtube: 'https://youtube.com/@skycodes10',
      github: 'https://github.com/vaishnavipatelj',
      linkedin: 'https://linkedin.com/in/vaishnavikurmi'
    },
    admin_email: 'contact.skycodes@gmail.com'
  }
};

function p(id, title, category_id, price, discount, description, short_description, specs, bestseller, sales) {
  return {
    id, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category_id, price_inr: price, discount_price_inr: discount,
    description, short_description, specs,
    fulfillment_type: 'digital_download',
    file_path: `private/products/${id}.zip`,
    is_bestseller: !!bestseller, sales_count: sales || 0,
    is_active: true, is_bundle: false, bundle_includes: null,
    created_at: new Date(Date.now() - (parseInt(id.slice(1)) * 36e5 * 26)).toISOString()
  };
}

/* ---- store: seed once, then persist every admin edit ---- */
const DB = (() => {
  const KEY = 'skycodes.db.v1';
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db || !db.products || db.products.length === 0) db = JSON.parse(JSON.stringify(SEED));
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  save();
  return {
    get raw() { return db; },
    save,
    reset() { db = JSON.parse(JSON.stringify(SEED)); save(); },
    products: () => db.products,
    activeProducts: () => db.products.filter(x => x.is_active),
    product: id => db.products.find(x => x.id === id),
    productBySlug: s => db.products.find(x => x.slug === s),
    categories: () => db.categories.slice().sort((a, b) => a.sort_order - b.sort_order),
    category: id => db.categories.find(c => c.id === id),
    services: () => db.services.filter(s => s.is_active),
    courses: () => db.courses.filter(c => c.is_active),
    course: id => db.courses.find(c => c.id === id),
    courseBySlug: s => db.courses.find(c => c.slug === s),
    reviews: () => db.reviews.filter(r => r.is_approved),
    allReviews: () => db.reviews,
    settings: () => db.settings
  };
})();
