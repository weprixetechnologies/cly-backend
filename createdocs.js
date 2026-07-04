const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition, TableOfContents
} = require('docx');
const fs = require('fs');

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  primary:   '1A3C6E',   // deep navy
  accent:    '2D7DD2',   // medium blue
  light:     'E8F1FB',   // very light blue
  mid:       'C6DCF5',   // mid blue
  headerRow: '1A3C6E',   // dark header
  altRow:    'F0F5FC',   // alternating row tint
  white:     'FFFFFF',
  text:      '1A1A2E',
  muted:     '6B7280',
  border:    'B0C4DE',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const b = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: b, bottom: b, left: b, right: b };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cell(text, { width = 2340, fill = C.white, bold = false, color = C.text, align = AlignmentType.LEFT, isHeader = false } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({
        text,
        bold: bold || isHeader,
        color: isHeader ? C.white : color,
        font: 'Arial',
        size: isHeader ? 20 : 20,
      })]
    })]
  });
}

function hdrCell(text, width = 2340) {
  return cell(text, { width, fill: C.primary, bold: true, isHeader: true });
}

function row(cells) { return new TableRow({ children: cells }); }

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 6 } },
    children: [new TextRun({ text, font: 'Arial', size: 40, bold: true, color: C.primary })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 100 },
    children: [new TextRun({ text, font: 'Arial', size: 30, bold: true, color: C.accent })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: C.primary })]
  });
}

function p(text, { size = 20, color = C.text, bold = false, italic = false, spacing = { before: 60, after: 120 } } = {}) {
  return new Paragraph({
    spacing,
    children: [new TextRun({ text, font: 'Arial', size, color, bold, italic })]
  });
}

function bullet(text, level = 0, { bold = false } = {}) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: C.text, bold })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: C.text })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.mid, space: 1 } },
    children: []
  });
}

function callout(text, { fill = C.light, borderColor = C.accent } = {}) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [row([new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
        left: { style: BorderStyle.THICK, size: 20, color: borderColor },
        right: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
      },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20, color: C.text, italic: true })] })]
    })])]
  });
}

function spacer(before = 120) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Numbering config ─────────────────────────────────────────────────────────
const numbering = {
  config: [
    {
      reference: 'bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial' } } },
        { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } }, run: { font: 'Arial' } } },
      ]
    },
    {
      reference: 'numbers',
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial' } } },
        { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } }, run: { font: 'Arial' } } },
      ]
    },
  ]
};

// ─── Cover page ───────────────────────────────────────────────────────────────
function coverSection() {
  return {
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      spacer(2880),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: 'PRODUCT REQUIREMENTS DOCUMENT', font: 'Arial', size: 28, color: C.accent, bold: true, allCaps: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: 'Agency Website & Premium Video Learning Platform', font: 'Arial', size: 52, bold: true, color: C.primary })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: 'Version 1.0  |  Confidential  |  June 2026', font: 'Arial', size: 22, color: C.muted })]
      }),
      new Table({
        width: { size: 5040, type: WidthType.DXA },
        columnWidths: [2520, 2520],
        rows: [
          row([cell('Document Status', { width: 2520, fill: C.light, bold: true }), cell('DRAFT — FOR REVIEW', { width: 2520, bold: true, color: C.accent })]),
          row([cell('Version', { width: 2520, fill: C.light, bold: true }), cell('1.0', { width: 2520 })]),
          row([cell('Date', { width: 2520, fill: C.light, bold: true }), cell('June 2026', { width: 2520 })]),
          row([cell('Prepared By', { width: 2520, fill: C.light, bold: true }), cell('Product Management', { width: 2520 })]),
          row([cell('Classification', { width: 2520, fill: C.light, bold: true }), cell('Confidential', { width: 2520 })]),
        ]
      }),
      spacer(240),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '\u00A0', size: 24 })] }),
    ]
  };
}

// ─── Document children ────────────────────────────────────────────────────────
const children = [];

// ── 1. TOC + Executive Summary ─────────────────────────────────────────────
children.push(
  h1('Table of Contents'),
  new TableOfContents('Table of Contents', {
    hyperlink: true,
    headingStyleRange: '1-3',
    stylesWithLevels: [
      { styleId: 'Heading1', level: 1 },
      { styleId: 'Heading2', level: 2 },
      { styleId: 'Heading3', level: 3 },
    ]
  }),
  pageBreak(),
  h1('1. Executive Summary'),
  p('This Product Requirements Document (PRD) defines the full scope, requirements, architecture, and acceptance criteria for the development of a modern agency website integrated with an enterprise-grade premium video learning platform. It serves as the authoritative reference for all stakeholders — including executives, developers, designers, product managers, and QA engineers — throughout the entire project lifecycle.'),
  p('The platform is composed of two primary product surfaces that function as a unified system:'),
  bullet('A public-facing agency website that showcases the organisation\'s brand, services, portfolio, case studies, team, and thought leadership content through a managed blog.'),
  bullet('A gated premium video learning platform that enables the agency to monetise educational content through secure, authenticated course delivery — complete with payment processing, user dashboards, progress tracking, and enterprise-grade video protection.'),
  spacer(120),
  callout('Strategic Intent: The platform is designed to simultaneously serve as a lead generation and brand authority engine (public site), and as a scalable recurring revenue vehicle (course platform). Both surfaces must operate with production-grade reliability, security, and performance.'),
  spacer(120),
  p('Technology Foundation: The recommended implementation is a WordPress-based stack leveraging LearnDash or LifterLMS for learning management, WooCommerce for payment processing, BunnyCDN or Cloudflare Stream for secure video delivery, and a headless or traditional WordPress architecture with Elementor Pro or a custom theme for front-end rendering.'),
  pageBreak(),
);

// ── 2. Project Goals ───────────────────────────────────────────────────────
children.push(
  h1('2. Project Goals'),
  h2('2.1 Primary Goals'),
  bullet('Establish a high-performance, SEO-optimised public website that accurately represents the agency\'s brand and drives qualified lead generation.', 0),
  bullet('Build a fully functional, commercially ready video course platform allowing users to discover, purchase, and consume premium educational content securely.', 0),
  bullet('Provide non-technical administrators with a complete, intuitive content management interface capable of managing all website and platform content without developer assistance.', 0),
  bullet('Implement enterprise-grade video security to prevent content theft, unauthorised sharing, and direct download of purchased video assets.', 0),
  bullet('Deliver a globally fast, mobile-first, accessible product that meets Core Web Vitals thresholds across all key pages.', 0),
  spacer(80),
  h2('2.2 Secondary Goals'),
  bullet('Create a scalable technical architecture that can accommodate significant future growth in courses, users, and content volume without requiring a full replatform.'),
  bullet('Integrate with analytics, CRM, and marketing automation tooling to support data-driven growth strategies.'),
  bullet('Ensure full compliance with GDPR and applicable data protection regulations from day one.'),
  bullet('Enable rapid content iteration with zero downtime deployments and a robust staging/production workflow.'),
  pageBreak(),
);

// ── 3. Business Objectives ─────────────────────────────────────────────────
children.push(
  h1('3. Business Objectives'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 3500, 2700, 2760],
    rows: [
      row([hdrCell('#', 400), hdrCell('Objective', 3500), hdrCell('Key Result', 2700), hdrCell('Target Timeline', 2760)]),
      row([cell('BO-1', { width: 400, fill: C.altRow }), cell('Establish credible brand presence online', { width: 3500, fill: C.altRow }), cell('Website live, scoring 90+ Lighthouse across all metrics', { width: 2700, fill: C.altRow }), cell('Launch + 0', { width: 2760, fill: C.altRow })]),
      row([cell('BO-2', { width: 400 }), cell('Generate qualified inbound leads via website', { width: 3500 }), cell('Lead capture forms converting at ≥3%', { width: 2700 }), cell('Launch + 30 days', { width: 2760 })]),
      row([cell('BO-3', { width: 400, fill: C.altRow }), cell('Monetise educational expertise via course sales', { width: 3500, fill: C.altRow }), cell('First paid course enrollments within 7 days of launch', { width: 2700, fill: C.altRow }), cell('Launch + 7 days', { width: 2760, fill: C.altRow })]),
      row([cell('BO-4', { width: 400 }), cell('Achieve content independence for the client', { width: 3500 }), cell('100% of content types manageable without developer help', { width: 2700 }), cell('At launch', { width: 2760 })]),
      row([cell('BO-5', { width: 400, fill: C.altRow }), cell('Protect premium content investment', { width: 3500, fill: C.altRow }), cell('Zero direct video URL exposure in production', { width: 2700, fill: C.altRow }), cell('At launch', { width: 2760, fill: C.altRow })]),
      row([cell('BO-6', { width: 400 }), cell('Support data-driven growth decisions', { width: 3500 }), cell('Analytics + conversion tracking live at launch', { width: 2700 }), cell('At launch', { width: 2760 })]),
    ]
  }),
  pageBreak(),
);

// ── 4. Target Audience ─────────────────────────────────────────────────────
children.push(
  h1('4. Target Audience'),
  h2('4.1 Public Website Audience'),
  bullet('Potential clients evaluating the agency\'s services — typically decision-makers at SMEs and growth-stage companies.'),
  bullet('Entrepreneurs and founders researching agency options for digital, marketing, or creative projects.'),
  bullet('Recruiters and potential employees exploring the agency as an employer.'),
  bullet('Industry peers and press seeking thought leadership content via the blog.'),
  spacer(80),
  h2('4.2 Course Platform Audience'),
  bullet('Professionals seeking to upskill in areas of the agency\'s domain expertise.'),
  bullet('Entrepreneurs wanting to learn the agency\'s methodologies to implement themselves.'),
  bullet('Students and early-career individuals pursuing structured learning in the agency\'s field.'),
  bullet('Corporate teams where managers purchase courses for team members.'),
  pageBreak(),
);

// ── 5. User Personas ───────────────────────────────────────────────────────
children.push(
  h1('5. User Personas'),
);

const personas = [
  {
    id: 'P-01',
    name: 'Alex — The Prospective Client',
    role: 'Marketing Director, Mid-size Company',
    goals: 'Evaluate whether the agency is a credible partner. Understand services, view portfolio, read case studies, and make contact.',
    frustrations: 'Hard-to-navigate sites; no proof of results; no clear pricing signals; slow pages on mobile.',
    touchpoints: 'Homepage, Services, Portfolio, Case Studies, Testimonials, Contact.',
    surface: 'Public Website'
  },
  {
    id: 'P-02',
    name: 'Jordan — The Eager Learner',
    role: 'Freelancer / Independent Professional',
    goals: 'Purchase a course, learn at their own pace, track their progress, and receive a completion record.',
    frustrations: 'Complicated checkout; videos that buffer or fail on mobile; no way to pick up where they left off.',
    touchpoints: 'Course Listing, Course Detail, Checkout, Student Dashboard, Video Player.',
    surface: 'Course Platform'
  },
  {
    id: 'P-03',
    name: 'Sam — The Content Administrator',
    role: 'Agency Marketing / Operations Staff',
    goals: 'Publish blog posts, update services pages, add portfolio entries, and manage testimonials — all without raising a support ticket.',
    frustrations: 'Complex CMSes requiring developer access; no preview; accidental unpublishing.',
    touchpoints: 'WordPress Admin, Block Editor, Media Library, Custom Post Types.',
    surface: 'Admin Panel'
  },
  {
    id: 'P-04',
    name: 'Morgan — The Super Administrator',
    role: 'Agency Owner / Technical Lead',
    goals: 'Full platform control: manage users, courses, payments, roles, and review audit logs. Needs operational visibility.',
    frustrations: 'Opaque systems with no logging; inability to revoke access quickly; no consolidated dashboard.',
    touchpoints: 'All admin surfaces, user management, payment records, audit log.',
    surface: 'Super Admin Panel'
  },
];

for (const persona of personas) {
  children.push(
    h2(`${persona.id} — ${persona.name}`),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2000, 7360],
      rows: [
        row([cell('Role', { width: 2000, fill: C.light, bold: true }), cell(persona.role, { width: 7360 })]),
        row([cell('Goals', { width: 2000, fill: C.light, bold: true }), cell(persona.goals, { width: 7360, fill: C.altRow })]),
        row([cell('Frustrations', { width: 2000, fill: C.light, bold: true }), cell(persona.frustrations, { width: 7360 })]),
        row([cell('Key Touchpoints', { width: 2000, fill: C.light, bold: true }), cell(persona.touchpoints, { width: 7360, fill: C.altRow })]),
        row([cell('Primary Surface', { width: 2000, fill: C.light, bold: true }), cell(persona.surface, { width: 7360 })]),
      ]
    }),
    spacer(200),
  );
}
children.push(pageBreak());

// ── 6. Functional Requirements ─────────────────────────────────────────────
children.push(
  h1('6. Functional Requirements'),
  h2('6.1 Public Website'),
  h3('6.1.1 Homepage'),
  bullet('Hero section with headline, sub-headline, primary CTA button, and supporting visual.'),
  bullet('Services overview section with icons/imagery and links to full service pages.'),
  bullet('Featured portfolio / case study highlights (minimum 3 items).'),
  bullet('Client logo strip / social proof section.'),
  bullet('Testimonials carousel or static block (minimum 3 items).'),
  bullet('Blog teaser section showing the 3 most recent posts.'),
  bullet('Primary lead generation CTA section (e.g. "Start a Project", "Book a Call").'),
  bullet('Footer with navigation links, social media links, legal links, and contact info.'),
  spacer(80),
  h3('6.1.2 About Us'),
  bullet('Agency overview: mission statement, vision, and values.'),
  bullet('Founding story or company timeline.'),
  bullet('Team members section with photos, names, titles, and optional short bios.'),
  bullet('Awards, certifications, or media mentions section.'),
  bullet('Secondary CTA block.'),
  spacer(80),
  h3('6.1.3 Services'),
  bullet('Landing page listing all services with short descriptions and icons.'),
  bullet('Individual service detail pages for each service with full copy, process breakdown, benefits, and relevant case studies.'),
  bullet('Per-service lead generation form or CTA.'),
  spacer(80),
  h3('6.1.4 Portfolio / Case Studies'),
  bullet('Grid or masonry portfolio listing with filter by category/industry.'),
  bullet('Individual case study pages with: client brief, approach, execution, results, and visuals.'),
  bullet('Related case studies recommendation block at bottom of each case study.'),
  spacer(80),
  h3('6.1.5 Blog'),
  bullet('Blog listing page with pagination (10 posts per page default; configurable).'),
  bullet('Post cards showing featured image, category, title, excerpt, author, date, and read time.'),
  bullet('Filter/search by category, tag, or keyword.'),
  bullet('Individual blog post pages with: hero image, author block, share buttons (Twitter/X, LinkedIn, copy link), reading progress indicator, related posts block.'),
  bullet('Author bio block at end of post.'),
  spacer(80),
  h3('6.1.6 Contact Page'),
  bullet('Contact form: Name, Email, Phone (optional), Subject, Message, Submit.'),
  bullet('Form submissions forwarded to configured email address(es).'),
  bullet('Optional CRM integration (e.g. HubSpot, Mailchimp) via Zapier or native plugin.'),
  bullet('Office address, phone number, email, and embedded Google Map.'),
  bullet('Social media links.'),
  spacer(80),
  h3('6.1.7 FAQ Page'),
  bullet('Accordion-style FAQ list, grouped by category.'),
  bullet('FAQ items fully manageable via CMS.'),
  bullet('Search/filter functionality within FAQ page.'),
  spacer(80),
  h3('6.1.8 Lead Generation Forms'),
  bullet('Inline contact / discovery call booking form on relevant pages.'),
  bullet('Exit-intent popup (configurable, with ability to disable).'),
  bullet('All form submissions stored in admin panel and forwarded by email.'),
  bullet('Honeypot and/or reCAPTCHA v3 spam protection on all forms.'),
  spacer(120),
  h2('6.2 Blog / Content Management'),
  bullet('Administrators can create, draft, preview, publish, unpublish, schedule, and delete blog posts via the WordPress block editor.'),
  bullet('Posts support: featured image, title, excerpt, body (full Gutenberg block support), categories (multiple), tags, author attribution, custom SEO metadata, and publication date.'),
  bullet('Scheduled publication: posts set to a future date/time auto-publish at that time.'),
  bullet('Media library: upload, organise, and reuse images and files across all content.'),
  bullet('Revision history: administrators can view and restore previous versions of any post.'),
  spacer(120),
  h2('6.3 Course & Video Platform'),
  h3('6.3.1 Course Catalogue'),
  bullet('Public course listing page with: course card (thumbnail, title, short description, price, instructor, lesson count, skill level).'),
  bullet('Individual course detail page: full description, curriculum accordion (modules > lessons), instructor bio, what you\'ll learn bullets, requirements, testimonials, sticky purchase CTA sidebar.'),
  bullet('Categories and tag-based filtering.'),
  spacer(80),
  h3('6.3.2 Purchase Flow'),
  bullet('User clicks "Enroll Now" / "Buy This Course" on course detail page.'),
  bullet('Redirected to secure checkout (WooCommerce or equivalent).'),
  bullet('Payment processed via Stripe and/or PayPal.'),
  bullet('On successful payment: WordPress user account auto-created (if new user) OR existing account detected and course access granted.'),
  bullet('Welcome email sent automatically with login credentials (new users) or access confirmation (existing users).'),
  bullet('Order confirmation email sent with purchase details and receipt.'),
  spacer(80),
  h3('6.3.3 Student Dashboard'),
  bullet('Overview panel showing: enrolled courses, overall progress, recently accessed lesson, account info.'),
  bullet('Course cards for each enrolled course with: thumbnail, title, progress bar (% complete), "Continue Learning" CTA.'),
  bullet('Order history: list of all past purchases with date, amount, course name, and downloadable receipt.'),
  bullet('Profile management: update name, email, profile picture, change password.'),
  spacer(80),
  h3('6.3.4 Course Player / Learning Interface'),
  bullet('Sidebar course curriculum: collapsible module list with lesson status indicators (not started / in progress / completed).'),
  bullet('Main content area: video player, lesson title, description, and any supplementary downloads.'),
  bullet('Lesson-level navigation: Previous / Next lesson buttons.'),
  bullet('Lesson completion: auto-mark as complete after video reaches configurable threshold (default 90%), or manual "Mark Complete" button.'),
  bullet('Progress persists across sessions and devices.'),
  bullet('Mobile-responsive player and layout.'),
  spacer(80),
  h3('6.3.5 Completion & Certification'),
  bullet('Course completion triggered when all lessons are marked complete.'),
  bullet('Completion notification email sent automatically.'),
  bullet('Optional: auto-generated PDF certificate of completion with user name, course name, and date.'),
  spacer(120),
  h2('6.4 User Roles & Permissions'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 1800, 1800, 1800, 1760],
    rows: [
      row([hdrCell('Capability', 2200), hdrCell('Super Admin', 1800), hdrCell('Content Manager', 1800), hdrCell('Course Manager', 1800), hdrCell('Student', 1760)]),
      row([cell('Manage Users & Roles', { width: 2200, fill: C.altRow }), cell('Yes', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('No', { width: 1760, fill: C.altRow })]),
      row([cell('Publish Blog Posts', { width: 2200 }), cell('Yes', { width: 1800 }), cell('Yes', { width: 1800 }), cell('No', { width: 1800 }), cell('No', { width: 1760 })]),
      row([cell('Manage Website Pages', { width: 2200, fill: C.altRow }), cell('Yes', { width: 1800, fill: C.altRow }), cell('Yes', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('No', { width: 1760, fill: C.altRow })]),
      row([cell('Create / Edit Courses', { width: 2200 }), cell('Yes', { width: 1800 }), cell('No', { width: 1800 }), cell('Yes', { width: 1800 }), cell('No', { width: 1760 })]),
      row([cell('View All Orders & Revenue', { width: 2200, fill: C.altRow }), cell('Yes', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('Read Only', { width: 1800, fill: C.altRow }), cell('Own Only', { width: 1760, fill: C.altRow })]),
      row([cell('Access Purchased Courses', { width: 2200 }), cell('Yes', { width: 1800 }), cell('No', { width: 1800 }), cell('No', { width: 1800 }), cell('Yes', { width: 1760 })]),
      row([cell('Manage Settings / Plugins', { width: 2200, fill: C.altRow }), cell('Yes', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('No', { width: 1800, fill: C.altRow }), cell('No', { width: 1760, fill: C.altRow })]),
      row([cell('View Audit Logs', { width: 2200 }), cell('Yes', { width: 1800 }), cell('No', { width: 1800 }), cell('No', { width: 1800 }), cell('No', { width: 1760 })]),
    ]
  }),
  pageBreak(),
);

// ── 7. Non-Functional Requirements ────────────────────────────────────────
children.push(
  h1('7. Non-Functional Requirements'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 2200, 4760, 2000],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Category', 2200), hdrCell('Requirement', 4760), hdrCell('Threshold', 2000)]),
      row([cell('NFR-01', { width: 400, fill: C.altRow }), cell('Performance', { width: 2200, fill: C.altRow }), cell('Page load time (First Contentful Paint) on broadband', { width: 4760, fill: C.altRow }), cell('< 1.5 seconds', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-02', { width: 400 }), cell('Performance', { width: 2200 }), cell('Largest Contentful Paint (LCP)', { width: 4760 }), cell('< 2.5 seconds', { width: 2000 })]),
      row([cell('NFR-03', { width: 400, fill: C.altRow }), cell('Performance', { width: 2200, fill: C.altRow }), cell('Cumulative Layout Shift (CLS)', { width: 4760, fill: C.altRow }), cell('< 0.1', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-04', { width: 400 }), cell('Performance', { width: 2200 }), cell('Interaction to Next Paint (INP)', { width: 4760 }), cell('< 200ms', { width: 2000 })]),
      row([cell('NFR-05', { width: 400, fill: C.altRow }), cell('Availability', { width: 2200, fill: C.altRow }), cell('Platform uptime SLA', { width: 4760, fill: C.altRow }), cell('99.9% / month', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-06', { width: 400 }), cell('Scalability', { width: 2200 }), cell('Concurrent authenticated users without degradation', { width: 4760 }), cell('500+ simultaneous', { width: 2000 })]),
      row([cell('NFR-07', { width: 400, fill: C.altRow }), cell('Scalability', { width: 2200, fill: C.altRow }), cell('Video delivery concurrent streams', { width: 4760, fill: C.altRow }), cell('1,000+', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-08', { width: 400 }), cell('Accessibility', { width: 2200 }), cell('WCAG compliance level', { width: 4760 }), cell('WCAG 2.1 AA', { width: 2000 })]),
      row([cell('NFR-09', { width: 400, fill: C.altRow }), cell('Security', { width: 2200, fill: C.altRow }), cell('SSL/TLS encryption across all routes', { width: 4760, fill: C.altRow }), cell('TLS 1.2+ required', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-10', { width: 400 }), cell('Browser Support', { width: 2200 }), cell('Chrome, Firefox, Safari, Edge — last 2 major versions; iOS Safari; Chrome Android', { width: 4760 }), cell('Full support', { width: 2000 })]),
      row([cell('NFR-11', { width: 400, fill: C.altRow }), cell('Responsiveness', { width: 2200, fill: C.altRow }), cell('Breakpoints: 320px, 768px, 1024px, 1440px, 1920px', { width: 4760, fill: C.altRow }), cell('Fully responsive', { width: 2000, fill: C.altRow })]),
      row([cell('NFR-12', { width: 400 }), cell('Recovery', { width: 2200 }), cell('RTO — time to restore from backup', { width: 4760 }), cell('< 4 hours', { width: 2000 })]),
      row([cell('NFR-13', { width: 400, fill: C.altRow }), cell('Recovery', { width: 2200, fill: C.altRow }), cell('RPO — maximum data loss window', { width: 4760, fill: C.altRow }), cell('< 24 hours', { width: 2000, fill: C.altRow })]),
    ]
  }),
  pageBreak(),
);

// ── 8. User Flows ──────────────────────────────────────────────────────────
children.push(
  h1('8. User Flows'),
  h2('8.1 New User — Course Purchase Flow'),
  numbered('User arrives on Course Listing page (organic search, social, direct).'),
  numbered('User browses catalogue, clicks on a course card.'),
  numbered('User reviews Course Detail page: curriculum, description, instructor bio, price.'),
  numbered('User clicks "Enroll Now" / "Buy Course".'),
  numbered('User is presented with Checkout page (WooCommerce): order summary, billing details, payment.'),
  numbered('User enters payment details (Stripe checkout or PayPal).'),
  numbered('On payment success: WordPress account auto-created, user enrolled in course.'),
  numbered('System sends Welcome Email (login credentials) + Order Confirmation Email.'),
  numbered('User is redirected to Student Dashboard showing the newly enrolled course.'),
  numbered('User clicks "Start Learning" — enters Course Player.'),
  spacer(80),
  h2('8.2 Returning Student — Continue Learning Flow'),
  numbered('Returning user visits site, clicks "Login" in header.'),
  numbered('Enters email and password on login page.'),
  numbered('On success, redirected to Student Dashboard.'),
  numbered('Sees enrolled courses with progress bars. Clicks "Continue" on desired course.'),
  numbered('Course Player opens directly to last incomplete lesson.'),
  numbered('Completes lesson — system auto-marks complete when video hits threshold.'),
  numbered('Clicks "Next Lesson" or selects from sidebar curriculum.'),
  spacer(80),
  h2('8.3 Content Administrator — Publish Blog Post'),
  numbered('Admin logs in to WordPress Admin (/wp-admin).'),
  numbered('Navigates to Posts > Add New.'),
  numbered('Authors post using Gutenberg block editor: heading, body, images, embed, etc.'),
  numbered('Assigns categories and tags.'),
  numbered('Uploads or selects featured image from media library.'),
  numbered('Configures SEO metadata via Yoast/RankMath plugin.'),
  numbered('Clicks "Preview" to review post in-browser.'),
  numbered('Sets publication date (immediate or scheduled), clicks Publish.'),
  numbered('Post appears on blog listing page and feeds.'),
  spacer(80),
  h2('8.4 Lead Generation — Contact Form Submission'),
  numbered('Visitor fills in contact form on Contact page (or inline CTA form on any page).'),
  numbered('Form validated client-side and server-side. reCAPTCHA verified.'),
  numbered('Submission stored in WordPress database under "Form Submissions" (via CF7 or Gravity Forms).'),
  numbered('Notification email dispatched to configured admin email addresses.'),
  numbered('Optional: submission pushed to CRM (HubSpot / Mailchimp) via webhook / Zapier.'),
  numbered('Visitor sees on-page success confirmation message.'),
  pageBreak(),
);

// ── 9. Technical Requirements & Architecture ───────────────────────────────
children.push(
  h1('9. Technical Requirements & Architecture'),
  h2('9.1 Recommended Technology Stack'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 3400, 3160],
    rows: [
      row([hdrCell('Layer', 2800), hdrCell('Recommended Technology', 3400), hdrCell('Purpose', 3160)]),
      row([cell('CMS / Platform', { width: 2800, fill: C.altRow }), cell('WordPress 6.x (latest stable)', { width: 3400, fill: C.altRow }), cell('Content management, routing, user management', { width: 3160, fill: C.altRow })]),
      row([cell('LMS Plugin', { width: 2800 }), cell('LearnDash 4.x or LifterLMS 7.x', { width: 3400 }), cell('Course, module, lesson, progress, certificates', { width: 3160 })]),
      row([cell('E-Commerce', { width: 2800, fill: C.altRow }), cell('WooCommerce + LearnDash WC Integration', { width: 3400, fill: C.altRow }), cell('Payment processing, orders, receipts, enrollment', { width: 3160, fill: C.altRow })]),
      row([cell('Payment Gateway', { width: 2800 }), cell('Stripe (primary) + PayPal (secondary)', { width: 3400 }), cell('Secure card and digital wallet payments', { width: 3160 })]),
      row([cell('Page Builder / Theme', { width: 2800, fill: C.altRow }), cell('Elementor Pro on a custom parent theme OR custom WordPress theme', { width: 3400, fill: C.altRow }), cell('Front-end design and layout management', { width: 3160, fill: C.altRow })]),
      row([cell('SEO Plugin', { width: 2800 }), cell('RankMath Pro or Yoast SEO Premium', { width: 3400 }), cell('Meta, sitemaps, schema, social OG, redirects', { width: 3160 })]),
      row([cell('Forms', { width: 2800, fill: C.altRow }), cell('Gravity Forms or WPForms Pro', { width: 3400, fill: C.altRow }), cell('Contact, lead gen, conditional logic, CRM push', { width: 3160, fill: C.altRow })]),
      row([cell('Video Hosting', { width: 2800 }), cell('Bunny Stream or Cloudflare Stream', { width: 3400 }), cell('Secure tokenised video delivery via CDN', { width: 3160 })]),
      row([cell('CDN', { width: 2800, fill: C.altRow }), cell('BunnyCDN or Cloudflare (Pro)', { width: 3400, fill: C.altRow }), cell('Global static asset delivery, DDoS protection', { width: 3160, fill: C.altRow })]),
      row([cell('Object / Image Optimisation', { width: 2800 }), cell('Imagify or Smush Pro + EWWW', { width: 3400 }), cell('WebP conversion, compression, lazy loading', { width: 3160 })]),
      row([cell('Caching', { width: 2800, fill: C.altRow }), cell('WP Rocket or LiteSpeed Cache', { width: 3400, fill: C.altRow }), cell('Page/object/browser cache, GZIP, minification', { width: 3160, fill: C.altRow })]),
      row([cell('Email Transactional', { width: 2800 }), cell('SendGrid or Postmark via WP Mail SMTP', { width: 3400 }), cell('Reliable delivery of system and notification emails', { width: 3160 })]),
      row([cell('Hosting', { width: 2800, fill: C.altRow }), cell('WP Engine, Kinsta, or Cloudways (managed WP)', { width: 3400, fill: C.altRow }), cell('Managed WordPress with auto-scaling, backups', { width: 3160, fill: C.altRow })]),
      row([cell('Backup', { width: 2800 }), cell('UpdraftPlus Premium + host-native backups', { width: 3400 }), cell('Daily offsite backups to S3/Google Drive', { width: 3160 })]),
      row([cell('Security', { width: 2800, fill: C.altRow }), cell('Wordfence Premium or Sucuri Platform', { width: 3400, fill: C.altRow }), cell('WAF, malware scan, login protection, audit log', { width: 3160, fill: C.altRow })]),
      row([cell('Analytics', { width: 2800 }), cell('Google Analytics 4 + Google Tag Manager', { width: 3400 }), cell('Visitor analytics, funnel tracking, events', { width: 3160 })]),
      row([cell('Monitoring', { width: 2800, fill: C.altRow }), cell('UptimeRobot or Better Uptime + Query Monitor', { width: 3400, fill: C.altRow }), cell('Uptime monitoring, alerting, performance tracking', { width: 3160, fill: C.altRow })]),
    ]
  }),
  spacer(120),
  h2('9.2 Architecture Overview'),
  callout('Architecture Principle: All platform components should be loosely coupled with clear data contracts. The CDN layer should handle as much traffic as possible. The WordPress application server should only be hit for authenticated, dynamic requests.'),
  spacer(100),
  h3('9.2.1 CMS Architecture (WordPress)'),
  bullet('WordPress installed on a managed hosting environment with PHP 8.2+ and MySQL 8.0+.'),
  bullet('Custom Post Types (CPTs) registered for: Services, Portfolio/Case Studies, Team Members, Testimonials, FAQs — keeping them separate from core Posts for cleaner admin UX.'),
  bullet('All CPTs managed via Gutenberg or ACF (Advanced Custom Fields) Pro for structured field input.'),
  bullet('WordPress REST API enabled but restricted (non-public endpoints require authentication).'),
  bullet('wp-config.php hardened: debug disabled in production, salts rotated, table prefix non-standard.'),
  spacer(80),
  h3('9.2.2 Course Architecture (LearnDash / LifterLMS)'),
  bullet('Hierarchy: Course > Section > Lesson > Topic (LearnDash terminology) or Course > Section > Lesson (LifterLMS).'),
  bullet('Each lesson contains: video embed (via secure video platform), written content, optional downloadable resources, optional quiz.'),
  bullet('Progress stored in WordPress custom tables, tied to user ID.'),
  bullet('Course access controlled by plugin enrollment tables, cross-validated server-side on every lesson request.'),
  spacer(80),
  h3('9.2.3 Payment Architecture'),
  bullet('WooCommerce handles the full cart and checkout flow.'),
  bullet('Stripe Payment Element (iFrame-based, PCI-compliant) embedded in checkout — card data never touches the application server.'),
  bullet('On WooCommerce order completion hook, LearnDash/LifterLMS auto-enrolment plugin grants course access.'),
  bullet('WooCommerce webhooks or cron trigger post-purchase email sequences via transactional email provider.'),
  bullet('Refund flow: admin-initiated refund in WooCommerce triggers Stripe refund API and optionally revokes course access.'),
  spacer(80),
  h3('9.2.4 Secure Video Delivery Architecture'),
  bullet('All video files uploaded to Bunny Stream or Cloudflare Stream — never hosted on the WordPress server directly.'),
  bullet('Videos are private-mode by default: no public URL can play the video without a signed token.'),
  bullet('Server-side token generation: when an authenticated, enrolled student requests a lesson, the WordPress backend generates a short-lived signed URL (TTL: 2–4 hours) and passes it to the video player embed.'),
  bullet('The video player embed code is rendered server-side inside a lesson template — the raw video URL is never exposed in the HTML source or JavaScript.'),
  bullet('Hotlink protection enabled on the CDN: video URLs will only play when embedded on the allowed domain.'),
  bullet('HLS (HTTP Live Streaming) used for adaptive bitrate streaming — prevents straightforward download managers from capturing a single video file.'),
  bullet('DRM (Digital Rights Management): For enterprise-grade protection, Widevine + FairPlay DRM can be enabled via Bunny Stream DRM or Cloudflare Stream DRM at additional cost — recommended for high-value content.'),
  bullet('Right-click and context menu disabled on the video player embed.'),
  bullet('Screen recording cannot be technically blocked, but watermarking (user email/ID overlaid on video, low opacity) is strongly recommended as a deterrent.'),
  spacer(80),
  h3('9.2.5 CDN Architecture'),
  bullet('BunnyCDN or Cloudflare CDN serves all static assets globally (images, CSS, JS, fonts).'),
  bullet('WordPress pages are edge-cached for anonymous visitors. Cache is purged on post publish/update via WP Rocket or LiteSpeed Cache integration.'),
  bullet('Authenticated pages (student dashboard, course player) are served dynamically — not edge-cached.'),
  bullet('CDN rules configured to: add security headers (X-Frame-Options, CSP, HSTS), block bad bots, and enforce HTTPS redirect.'),
  spacer(80),
  h3('9.2.6 User Management Architecture'),
  bullet('WordPress native user management extended by WooCommerce (customer data) and LearnDash/LifterLMS (student data).'),
  bullet('On purchase: WooCommerce creates a customer record and generates a WordPress account if one does not exist for the billing email. A secure auto-generated password is set and emailed to the user.'),
  bullet('Password reset flow: standard WordPress email-based password reset, styled to match brand.'),
  bullet('Social login (optional Phase 2): Google OAuth via Nextend Social Login or equivalent.'),
  pageBreak(),
);

// ── 10. Security Requirements ──────────────────────────────────────────────
children.push(
  h1('10. Security Requirements'),
  h2('10.1 Authentication & Authorisation'),
  bullet('All admin routes (/wp-admin, /wp-login.php) protected by: strong password policy enforcement, login attempt rate limiting (lockout after 5 failed attempts), and optional two-factor authentication (2FA) for admin roles.'),
  bullet('Consider moving /wp-admin and /wp-login.php to a non-standard URL to reduce automated attack surface.'),
  bullet('All authenticated API requests validated with server-side session or nonce verification.'),
  bullet('Role-Based Access Control (RBAC) enforced at both application and database level — no capability escapes role definition.'),
  spacer(80),
  h2('10.2 Content Protection'),
  bullet('Course content pages (lessons, topics) return 403 Forbidden to unauthenticated or unenrolled requests — no partial content exposure.'),
  bullet('Video token generation endpoint is authenticated — only enrolled students can request a token for their enrolled course lessons.'),
  bullet('Tokens are single-use or short-TTL to limit sharing window.'),
  bullet('Media library files uploaded as course resources are protected from direct URL access (stored outside web root or .htaccess protected).'),
  spacer(80),
  h2('10.3 Application Security'),
  bullet('All user input sanitised and validated on both client and server side.'),
  bullet('Protection against OWASP Top 10: SQL injection (WordPress prepared statements), XSS (output escaping, CSP header), CSRF (WordPress nonces on all form actions), IDOR (server-side ownership validation), insecure direct object references.'),
  bullet('WordPress file editor disabled in production (DISALLOW_FILE_EDIT = true in wp-config.php).'),
  bullet('Plugin and theme auto-updates disabled; updates applied through a tested staging-to-production workflow.'),
  bullet('Web Application Firewall (WAF) active — Wordfence Premium or Sucuri CloudProxy.'),
  spacer(80),
  h2('10.4 Data Protection & Privacy'),
  bullet('GDPR compliance: cookie consent banner (Complianz or CookieYes), privacy policy page, right to erasure supported (WooCommerce GDPR tools).'),
  bullet('Payment data: Stripe handles all card data. No card numbers stored on the application server. PCI DSS SAQ A compliance applicable.'),
  bullet('User passwords stored as bcrypt hashes — WordPress default + PasswordHash library.'),
  bullet('Email addresses and user data encrypted at rest at the database/hosting level.'),
  spacer(80),
  h2('10.5 Audit Logging'),
  bullet('All administrative actions logged: post publish/unpublish/delete, user creation/deletion/role change, plugin activation/deactivation, settings changes, login events.'),
  bullet('Audit log accessible only to Super Admin role.'),
  bullet('Log entries include: timestamp, user ID, user email, action type, affected object, IP address.'),
  bullet('Log retention: minimum 90 days. Export to CSV available.'),
  bullet('Recommended plugin: WP Activity Log (WSAL) Premium.'),
  spacer(80),
  h2('10.6 Backup & Recovery'),
  bullet('Daily automated full database backup to off-site storage (AWS S3 or Google Cloud Storage).'),
  bullet('Daily automated file system backup (wp-content directory).'),
  bullet('Host-native backup snapshot taken daily (WP Engine, Kinsta, or Cloudways all provide this natively).'),
  bullet('Backup retention: 30 days minimum.'),
  bullet('Backup restoration tested quarterly by development team.'),
  bullet('Documented recovery runbook maintained and accessible to at least 2 team members.'),
  pageBreak(),
);

// ── 11. CMS Requirements ──────────────────────────────────────────────────
children.push(
  h1('11. CMS Requirements'),
  h2('11.1 Content Editability'),
  bullet('Every text element, image, and CTA on the public website must be editable by a non-technical administrator without touching code.'),
  bullet('Homepage sections (hero, services, testimonials, blog teaser, CTA) managed via a custom admin panel or Elementor page builder with clearly labelled fields.'),
  bullet('Global elements (header navigation, footer links, social links, contact details) managed through a "Site Settings" custom options page (ACF Options or Elementor Theme Builder).'),
  spacer(80),
  h2('11.2 Custom Post Types'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2500, 3000, 3860],
    rows: [
      row([hdrCell('CPT Name', 2500), hdrCell('Key Fields', 3000), hdrCell('Used On', 3860)]),
      row([cell('Services', { width: 2500, fill: C.altRow }), cell('Title, Icon, Short Desc, Full Description, CTA', { width: 3000, fill: C.altRow }), cell('Services listing + individual service pages', { width: 3860, fill: C.altRow })]),
      row([cell('Portfolio / Case Studies', { width: 2500 }), cell('Title, Client, Category, Thumbnail, Body, Results', { width: 3000 }), cell('Portfolio grid + individual case study pages', { width: 3860 })]),
      row([cell('Team Members', { width: 2500, fill: C.altRow }), cell('Name, Title, Photo, Bio, Social Links, Order', { width: 3000, fill: C.altRow }), cell('About Us page, blog author blocks', { width: 3860, fill: C.altRow })]),
      row([cell('Testimonials', { width: 2500 }), cell('Quote, Author Name, Role, Company, Photo, Rating', { width: 3000 }), cell('Homepage, Services pages, Course detail pages', { width: 3860 })]),
      row([cell('FAQs', { width: 2500, fill: C.altRow }), cell('Question, Answer, Category', { width: 3000, fill: C.altRow }), cell('FAQ page, conditional page-specific FAQs', { width: 3860, fill: C.altRow })]),
    ]
  }),
  spacer(100),
  h2('11.3 Media Management'),
  bullet('WordPress media library used for all image and file uploads.'),
  bullet('Images automatically optimised on upload (compression, WebP conversion) via Imagify or EWWW.'),
  bullet('Image srcset and lazy loading implemented for all public-facing images.'),
  bullet('Video files are NOT uploaded to the WordPress media library — they are uploaded directly to the video hosting platform (Bunny Stream / Cloudflare Stream) and linked via embed ID.'),
  pageBreak(),
);

// ── 12. Performance Requirements ──────────────────────────────────────────
children.push(
  h1('12. Performance Requirements'),
  h2('12.1 Core Web Vitals Targets'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 3000, 3360],
    rows: [
      row([hdrCell('Metric', 3000), hdrCell('Target (Good)', 3000), hdrCell('Measurement Tool', 3360)]),
      row([cell('Largest Contentful Paint (LCP)', { width: 3000, fill: C.altRow }), cell('< 2.5 seconds', { width: 3000, fill: C.altRow }), cell('PageSpeed Insights, CrUX', { width: 3360, fill: C.altRow })]),
      row([cell('Interaction to Next Paint (INP)', { width: 3000 }), cell('< 200ms', { width: 3000 }), cell('PageSpeed Insights, CrUX', { width: 3360 })]),
      row([cell('Cumulative Layout Shift (CLS)', { width: 3000, fill: C.altRow }), cell('< 0.1', { width: 3000, fill: C.altRow }), cell('PageSpeed Insights, CrUX', { width: 3360, fill: C.altRow })]),
      row([cell('Time to First Byte (TTFB)', { width: 3000 }), cell('< 800ms (CDN-served)', { width: 3000 }), cell('WebPageTest', { width: 3360 })]),
      row([cell('Google Lighthouse Score', { width: 3000, fill: C.altRow }), cell('≥ 90 (Performance, SEO, Best Practices, Accessibility)', { width: 3000, fill: C.altRow }), cell('Lighthouse CI', { width: 3360, fill: C.altRow })]),
    ]
  }),
  spacer(100),
  h2('12.2 Optimisation Measures'),
  bullet('Page caching: full-page cache for anonymous visitors via WP Rocket or LiteSpeed Cache.'),
  bullet('Asset minification and concatenation: CSS, JS minified and combined where safe.'),
  bullet('Critical CSS inlined for above-the-fold content; non-critical CSS deferred.'),
  bullet('JavaScript deferred or async to unblock render.'),
  bullet('All images served in WebP format with JPEG/PNG fallback via <picture> element.'),
  bullet('Lazy loading for all below-fold images and iframes.'),
  bullet('Google Fonts self-hosted to eliminate render-blocking third-party requests.'),
  bullet('Database query caching (object caching) via Redis or Memcached (available on managed hosts).'),
  bullet('HTTP/2 or HTTP/3 enabled at server and CDN level.'),
  pageBreak(),
);

// ── 13. Admin Panel Requirements ───────────────────────────────────────────
children.push(
  h1('13. Admin Panel Requirements'),
  h2('13.1 Dashboard Overview'),
  bullet('WordPress Admin dashboard customised to show relevant KPIs: new orders (last 7 / 30 days), new user registrations, top-performing courses, recent form submissions, pending/draft posts.'),
  bullet('Admin dashboard widgets surfacing Google Analytics data (via Analytify or MonsterInsights).'),
  spacer(80),
  h2('13.2 Content Administration'),
  bullet('Posts: full CRUD — create, view, edit, preview, publish, unpublish, schedule, trash, permanently delete.'),
  bullet('Pages: full CRUD with Gutenberg / Elementor editing.'),
  bullet('Custom Post Types: full CRUD with structured ACF field interfaces.'),
  bullet('Media: upload (drag-and-drop), folder/category organisation, bulk operations, metadata editing (alt text, caption, description).'),
  spacer(80),
  h2('13.3 Course Administration'),
  bullet('Create, edit, and delete courses, sections, lessons, topics, and quizzes.'),
  bullet('Set course pricing, access type (free, paid, subscription), and enrollment requirements.'),
  bullet('Manually enroll or unenroll users in courses.'),
  bullet('View per-course enrollment count and completion rates.'),
  bullet('Export student progress reports as CSV.'),
  spacer(80),
  h2('13.4 Order & Payment Management'),
  bullet('View all orders with: order ID, customer name/email, course, amount, status, date.'),
  bullet('Filter orders by status (completed, pending, refunded, failed), date range, and course.'),
  bullet('Initiate full or partial refund directly from admin (triggers Stripe refund API).'),
  bullet('Manual course enrollment override: grant access to a user without payment (for comped enrollments, B2B sales, etc.).'),
  spacer(80),
  h2('13.5 User Management'),
  bullet('View all registered users with: name, email, registration date, roles, enrolled courses.'),
  bullet('Search and filter users by name, email, role, or enrollment.'),
  bullet('Change user role.'),
  bullet('Manually reset user password (send password reset email).'),
  bullet('Delete or deactivate user account.'),
  pageBreak(),
);

// ── 14. User Dashboard Requirements ───────────────────────────────────────
children.push(
  h1('14. User Dashboard Requirements'),
  h2('14.1 Dashboard Home'),
  bullet('Welcome message with user first name.'),
  bullet('Summary cards: total enrolled courses, courses in progress, completed courses.'),
  bullet('Recently accessed course with "Continue Learning" deep link.'),
  spacer(80),
  h2('14.2 My Courses'),
  bullet('Grid/list of all enrolled courses with: thumbnail, title, progress percentage, last accessed date, lesson count, "Continue" / "Start" button.'),
  bullet('Filter by: In Progress, Completed, Not Started.'),
  spacer(80),
  h2('14.3 Order History'),
  bullet('Table of all past purchases: date, course name, amount, payment method, order status.'),
  bullet('Link to download PDF receipt for each completed order.'),
  spacer(80),
  h2('14.4 Profile Settings'),
  bullet('Edit first name, last name, display name.'),
  bullet('Update email address (with re-verification email).'),
  bullet('Upload or change profile avatar.'),
  bullet('Change password (requires current password confirmation).'),
  spacer(80),
  h2('14.5 Certificates'),
  bullet('List of all earned completion certificates.'),
  bullet('Each certificate: course name, completion date, download as PDF.'),
  pageBreak(),
);

// ── 15. SEO Requirements ───────────────────────────────────────────────────
children.push(
  h1('15. SEO Requirements'),
  h2('15.1 On-Page SEO'),
  bullet('Every page has a configurable: SEO title (with character counter), meta description, canonical URL, robots directive, og:title, og:description, og:image.'),
  bullet('Blog posts and course pages have configurable per-post SEO metadata.'),
  bullet('Breadcrumb navigation rendered with structured data (Schema.org BreadcrumbList).'),
  bullet('All images have alt text fields enforced in media upload workflow.'),
  spacer(80),
  h2('15.2 Technical SEO'),
  bullet('XML sitemap auto-generated and updated on content publish. Sitemap submitted to Google Search Console.'),
  bullet('robots.txt configured to block admin URLs, login pages, thank-you pages, and other non-indexable routes.'),
  bullet('Canonical URLs set on all pages to prevent duplicate content from URL parameter variations.'),
  bullet('Hreflang tags if multi-language support is added in Phase 2.'),
  bullet('Structured data (Schema.org JSON-LD) implemented for: Article (blog posts), Course (courses), Organization, FAQPage, BreadcrumbList, and Review.'),
  bullet('No 404 errors from internal links. 301 redirects managed via RankMath/Yoast redirect manager.'),
  bullet('Page load speed optimised — Google uses performance signals as a ranking factor.'),
  spacer(80),
  h2('15.3 Blog SEO Optimisation'),
  bullet('Yoast SEO or RankMath provides per-post content analysis (keyword density, readability score, link checks).'),
  bullet('Social sharing preview (Twitter Card, Open Graph) generated automatically from post metadata.'),
  bullet('Reading time calculation displayed on each post.'),
  bullet('Estimated indexation within 48 hours via Google Search Console manual fetch or auto ping on publish.'),
  pageBreak(),
);

// ── 16. Analytics Requirements ─────────────────────────────────────────────
children.push(
  h1('16. Analytics Requirements'),
  h2('16.1 Core Analytics'),
  bullet('Google Analytics 4 (GA4) installed site-wide via Google Tag Manager.'),
  bullet('Enhanced measurement enabled: page views, scroll depth, outbound clicks, file downloads, video engagement.'),
  bullet('Custom events tracked: form submission, checkout initiated, purchase completed, lesson started, lesson completed, course completed, login, registration.'),
  spacer(80),
  h2('16.2 Conversion Tracking'),
  bullet('GA4 conversion events configured for: contact form submission, purchase completed, course enrollment confirmed.'),
  bullet('Google Ads conversion tracking supported via GTM (if paid campaigns are run).'),
  bullet('Facebook/Meta Pixel implemented via GTM for retargeting capability.'),
  spacer(80),
  h2('16.3 E-Commerce Analytics'),
  bullet('WooCommerce GA4 integration via GTM: product views (course viewed), add to cart, checkout steps, purchase.'),
  bullet('Revenue attributed to acquisition channel (organic, direct, referral, paid).'),
  spacer(80),
  h2('16.4 Reporting'),
  bullet('Admin-accessible Analytics dashboard embedded via MonsterInsights or Analytify plugin.'),
  bullet('Key reports visible to Super Admin: sessions by channel, top pages, top blog posts, course purchase funnel, revenue by period.'),
  pageBreak(),
);

// ── 17. Future Scalability Considerations ──────────────────────────────────
children.push(
  h1('17. Future Scalability Considerations'),
  h2('17.1 Platform Growth'),
  bullet('Database: consider MySQL read replica for high-query periods. Object caching (Redis) essential above 10k monthly active users.'),
  bullet('Hosting: managed WordPress hosting plans can auto-scale. Define thresholds to trigger plan review (e.g. 50k monthly visits or 1,000 concurrent users).'),
  bullet('Course catalogue: LMS plugins support hundreds of courses and thousands of students natively. Evaluate custom indexing if catalogue exceeds 200 courses.'),
  spacer(80),
  h2('17.2 Potential Phase 2 Features'),
  bullet('Subscription / Membership model: recurring monthly/annual course access via WooCommerce Subscriptions or MemberPress.'),
  bullet('Live sessions / Webinars: integration with Zoom or StreamYard embedded in course player.'),
  bullet('Affiliate programme: LearnDash + AffiliateWP integration for course referral commissions.'),
  bullet('Mobile native app: React Native or Flutter app consuming WordPress REST API + LMS endpoints.'),
  bullet('Multi-language: WPML or Polylang for content translation; Weglot for automated translation.'),
  bullet('Community / Forums: BuddyBoss or LearnDash Groups for cohort-based learning.'),
  bullet('AI-powered course recommendations: implement recommendation engine based on purchase/completion history.'),
  bullet('Corporate / B2B purchasing: team seats, group management, manager dashboards.'),
  spacer(80),
  h2('17.3 Headless / Decoupled Architecture Pathway'),
  p('Should WordPress performance or flexibility become a constraint at scale, the architecture can evolve to a headless model without a full replatform:', { italic: false }),
  bullet('WordPress remains the CMS and API backend (REST API or WPGraphQL).'),
  bullet('Front-end migrated to Next.js or Nuxt.js for server-side rendering and ISR (Incremental Static Regeneration).'),
  bullet('LMS data exposed via WPGraphQL LearnDash extension.'),
  bullet('This pathway is supported by keeping all current content in WordPress — no vendor lock-in on the content layer.'),
  pageBreak(),
);

// ── 18. Acceptance Criteria ────────────────────────────────────────────────
children.push(
  h1('18. Acceptance Criteria'),
  p('The following criteria must all be satisfied before the project is accepted as complete and approved for production launch.'),
  spacer(80),
  h2('18.1 Public Website'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-01', { width: 400, fill: C.altRow }), cell('All pages listed in scope are live and accessible at the production domain.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-02', { width: 400 }), cell('Website is fully responsive on mobile (375px+), tablet (768px+), and desktop (1440px+).', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-03', { width: 400, fill: C.altRow }), cell('Google Lighthouse score ≥ 90 across Performance, SEO, Best Practices, and Accessibility on all primary pages.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-04', { width: 400 }), cell('All lead generation forms submit successfully, trigger confirmation message, and deliver email notifications.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-05', { width: 400, fill: C.altRow }), cell('XML sitemap is generated, accessible at /sitemap.xml, and submitted to Google Search Console.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
    ]
  }),
  spacer(100),
  h2('18.2 CMS & Blog'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-06', { width: 400, fill: C.altRow }), cell('Content Manager role can create, publish, unpublish, schedule, and delete a blog post without developer assistance.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-07', { width: 400 }), cell('All Custom Post Types (Services, Portfolio, Team, Testimonials, FAQs) are editable via the WordPress admin.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-08', { width: 400, fill: C.altRow }), cell('Scheduled posts auto-publish at the configured date/time.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-09', { width: 400 }), cell('Post revision history is accessible and a previous version can be restored.', { width: 6560 }), cell('Should Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
    ]
  }),
  spacer(100),
  h2('18.3 Course Platform & Payments'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-10', { width: 400, fill: C.altRow }), cell('A test purchase via Stripe test mode completes successfully and triggers auto-enrollment.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-11', { width: 400 }), cell('Welcome email (with credentials) and order confirmation email are received within 2 minutes of successful purchase.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-12', { width: 400, fill: C.altRow }), cell('Student Dashboard displays enrolled courses, progress percentage, and order history.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-13', { width: 400 }), cell('Course progress persists: lesson marked complete on one device/session reflects on another device after re-login.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-14', { width: 400, fill: C.altRow }), cell('An unenrolled or unauthenticated user cannot access lesson content — receives appropriate redirect/denial.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-15', { width: 400 }), cell('Admin can initiate a refund from WooCommerce admin; refund reflects in Stripe within 60 seconds.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
    ]
  }),
  spacer(100),
  h2('18.4 Video Security'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-16', { width: 400, fill: C.altRow }), cell('No raw/direct video URLs are present in the HTML source or network requests visible to the browser for lesson pages.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-17', { width: 400 }), cell('Copying the video embed URL and opening in a private browser tab without authentication returns an error/expiry.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-18', { width: 400, fill: C.altRow }), cell('Video plays correctly on: Chrome (desktop), Safari (desktop + iOS), Firefox, Edge, Chrome Android.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-19', { width: 400 }), cell('Video adopts adaptive bitrate streaming — quality adjusts gracefully on throttled connection.', { width: 6560 }), cell('Should Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
    ]
  }),
  spacer(100),
  h2('18.5 Security & Infrastructure'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-20', { width: 400, fill: C.altRow }), cell('SSL certificate active across all domains/subdomains. All HTTP requests redirect to HTTPS.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-21', { width: 400 }), cell('Automated daily backup confirmed running. A test restore from backup completed successfully before launch.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-22', { width: 400, fill: C.altRow }), cell('Audit log captures admin login events and post publish/delete actions with timestamp, user, and IP.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-23', { width: 400 }), cell('WAF is active. A simulated brute-force login attempt (10 rapid failures) results in an IP lockout.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
    ]
  }),
  spacer(100),
  h2('18.6 Analytics'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 6560, 1200, 1200],
    rows: [
      row([hdrCell('ID', 400), hdrCell('Acceptance Criterion', 6560), hdrCell('Priority', 1200), hdrCell('Status', 1200)]),
      row([cell('AC-24', { width: 400, fill: C.altRow }), cell('GA4 tracking active: page view events confirmed in GA4 Realtime report.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
      row([cell('AC-25', { width: 400 }), cell('Purchase event fires and appears in GA4 on successful WooCommerce order.', { width: 6560 }), cell('Must Have', { width: 1200 }), cell('[ ]', { width: 1200 })]),
      row([cell('AC-26', { width: 400, fill: C.altRow }), cell('Contact form submission event tracked in GA4 and visible as a conversion.', { width: 6560, fill: C.altRow }), cell('Must Have', { width: 1200, fill: C.altRow }), cell('[ ]', { width: 1200, fill: C.altRow })]),
    ]
  }),
  pageBreak(),
);

// ── 19. Appendix ───────────────────────────────────────────────────────────
children.push(
  h1('19. Appendix'),
  h2('19.1 Glossary'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      row([hdrCell('Term', 2400), hdrCell('Definition', 6960)]),
      row([cell('CMS', { width: 2400, fill: C.altRow }), cell('Content Management System — software for creating and managing digital content.', { width: 6960, fill: C.altRow })]),
      row([cell('CPT', { width: 2400 }), cell('Custom Post Type — WordPress content model beyond default Posts and Pages.', { width: 6960 })]),
      row([cell('CDN', { width: 2400, fill: C.altRow }), cell('Content Delivery Network — distributed server network for fast global asset delivery.', { width: 6960, fill: C.altRow })]),
      row([cell('LMS', { width: 2400 }), cell('Learning Management System — platform for creating and delivering educational content.', { width: 6960 })]),
      row([cell('HLS', { width: 2400, fill: C.altRow }), cell('HTTP Live Streaming — adaptive bitrate video streaming protocol developed by Apple.', { width: 6960, fill: C.altRow })]),
      row([cell('DRM', { width: 2400 }), cell('Digital Rights Management — technology for controlling access to and copying of digital content.', { width: 6960 })]),
      row([cell('WAF', { width: 2400, fill: C.altRow }), cell('Web Application Firewall — filters/monitors HTTP traffic between a web app and the internet.', { width: 6960, fill: C.altRow })]),
      row([cell('RBAC', { width: 2400 }), cell('Role-Based Access Control — access permissions assigned based on user roles.', { width: 6960 })]),
      row([cell('WCAG', { width: 2400, fill: C.altRow }), cell('Web Content Accessibility Guidelines — standards for web accessibility by W3C.', { width: 6960, fill: C.altRow })]),
      row([cell('CWV', { width: 2400 }), cell('Core Web Vitals — Google\'s set of metrics for user experience (LCP, INP, CLS).', { width: 6960 })]),
      row([cell('PCI DSS', { width: 2400, fill: C.altRow }), cell('Payment Card Industry Data Security Standard — security standards for card payment handling.', { width: 6960, fill: C.altRow })]),
      row([cell('TTL', { width: 2400 }), cell('Time To Live — duration after which a token or cached object expires.', { width: 6960 })]),
      row([cell('RTO', { width: 2400, fill: C.altRow }), cell('Recovery Time Objective — maximum acceptable downtime after a failure.', { width: 6960, fill: C.altRow })]),
      row([cell('RPO', { width: 2400 }), cell('Recovery Point Objective — maximum acceptable data loss measured in time.', { width: 6960 })]),
    ]
  }),
  spacer(120),
  h2('19.2 Document Revision History'),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1500, 3000, 3660],
    rows: [
      row([hdrCell('Version', 1200), hdrCell('Date', 1500), hdrCell('Author', 3000), hdrCell('Summary of Changes', 3660)]),
      row([cell('1.0', { width: 1200, fill: C.altRow }), cell('June 2026', { width: 1500, fill: C.altRow }), cell('Product Management', { width: 3000, fill: C.altRow }), cell('Initial draft — full scope definition.', { width: 3660, fill: C.altRow })]),
    ]
  }),
  spacer(120),
  callout('This document is confidential and intended solely for authorised recipients involved in the project. It should not be distributed externally without prior written approval from the project stakeholders.'),
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  default: {
    document: {
      run: { font: 'Arial', size: 20, color: C.text },
    }
  },
  paragraphStyles: [
    {
      id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 40, bold: true, font: 'Arial', color: C.primary },
      paragraph: { spacing: { before: 480, after: 120 }, outlineLevel: 0 }
    },
    {
      id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 30, bold: true, font: 'Arial', color: C.accent },
      paragraph: { spacing: { before: 320, after: 100 }, outlineLevel: 1 }
    },
    {
      id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 24, bold: true, font: 'Arial', color: C.primary },
      paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 }
    },
  ]
};

// ─── Header / Footer ──────────────────────────────────────────────────────────
const header = new Header({
  children: [
    new Paragraph({
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: 'Agency Website & Video Learning Platform — PRD v1.0', font: 'Arial', size: 16, color: C.muted }),
        new TextRun({ text: '\t', font: 'Arial', size: 16 }),
        new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 16, bold: true, color: C.accent }),
      ]
    })
  ]
});

const footer = new Footer({
  children: [
    new Paragraph({
      spacing: { before: 100 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.mid, space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: '\u00A9 2026 Agency. All rights reserved.', font: 'Arial', size: 16, color: C.muted }),
        new TextRun({ text: '\t', font: 'Arial' }),
        new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: C.muted }),
        PageNumber,
      ]
    })
  ]
});

// ─── Document assembly ────────────────────────────────────────────────────────
const doc = new Document({
  styles,
  numbering,
  sections: [
    coverSection(),
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 }
        }
      },
      headers: { default: header },
      footers: { default: footer },
      children,
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('./Agency_Website_LMS_PRD_v1.0.docx', buf);
  console.log('Done.');
}).catch(err => { console.error(err); process.exit(1); });