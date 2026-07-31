# Graph Report - .  (2026-07-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 459 nodes · 1491 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00da1f79`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Application Shell and Navigation
- Admin Client Operations APIs
- Admin Interface and Actions
- Plans and Staff Authentication
- Frontend Dependencies and Build
- Security and Content Guidance
- Contact Intake and Email
- Financial Brand Design System
- SEO and Structured Metadata
- Credit Bureau Report Parsing
- Encrypted Monitoring Credentials
- ConsumerDirect Integration Spike
- Client Document Uploads
- Brand Social Preview
- Vercel Routing and Security
- Theme Selection
- Blog API
- HTML Entry and Theme Boot
- Static Prerendering
- Bureau Review Workflow
- Stripe Billing and Webhooks
- Blog Content Synchronization

## God Nodes (most connected - your core abstractions)
1. `json()` - 86 edges
2. `allowedOrigin()` - 83 edges
3. `supabaseRequest()` - 67 edges
4. `supabaseOne()` - 67 edges
5. `useLanguage()` - 65 edges
6. `getActiveStaffSession()` - 56 edges
7. `isUuid()` - 48 edges
8. `clean()` - 36 edges
9. `portal/Dashboard.jsx` - 35 edges
10. `request()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Magic Enterprise Group Brand Favicon` --implements--> `Navy Gold Ivory Brand Color System`  [INFERRED]
  public/favicon.svg → design-system.md
- `Orbital Top Hat Mark` --implements--> `Magic Enterprise Group Logo Symbolism`  [INFERRED]
  public/favicon.svg → design-system.md
- `No Guaranteed Credit Outcomes` --semantically_similar_to--> `Listen Educate Guide Confirm`  [INFERRED] [semantically similar]
  public/llms.txt → design-system.md
- `Protected Sensitive Document Channel` --conceptually_related_to--> `Service Role Server Boundary`  [INFERRED]
  public/llms.txt → AGENTS.md
- `Local Brand Font Preloading` --implements--> `Editorial Financial Typography`  [INFERRED]
  index.html → design-system.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Trust-Oriented Brand Expression** — design_system_less_decoration_more_meaning, design_system_brand_color_system, design_system_editorial_financial_typography, design_system_sober_ui_components [EXTRACTED 1.00]
- **Protected Client Data Architecture** — agents_shared_supabase_isolation, agents_service_role_server_boundary, agents_portal_app_auth, agents_staff_auth_separation, agents_credit_monitoring_encryption_exception [INFERRED 0.95]
- **Consistent Public Brand Surface** — design_system_brand_color_system, design_system_editorial_financial_typography, index_spanish_orlando_credit_metadata, public_favicon_brand_favicon [INFERRED 0.85]
- **MEG Credit Brand Message** — public_og_image_magic_enterprise_group, public_og_image_credito_con_claridad, public_og_image_evaluacion_estrategia_espanol, public_og_image_megcredit_website, public_og_image_orlando_florida [INFERRED 0.95]

## Communities (23 total, 5 thin omitted)

### Community 0 - "Application Shell and Navigation"
Cohesion: 0.05
Nodes (72): App(), AppContent(), Footer(), LanguageSelector(), DOT_ANGLES, Lockup(), Nav(), Modal() (+64 more)

### Community 1 - "Admin Client Operations APIs"
Cohesion: 0.09
Nodes (72): filename(), handler(), handler(), handler(), BUREAUS, handler(), parseCaseStatus(), parseScores() (+64 more)

### Community 2 - "Admin Interface and Actions"
Cohesion: 0.10
Nodes (55): AdminLayout(), IconCatalog(), IconContracts(), IconUsers(), ConfirmDialog(), archiveAgreement(), assignPlan(), attachAgreementPdf() (+47 more)

### Community 3 - "Plans and Staff Authentication"
Cohesion: 0.10
Nodes (54): BILLING_TYPES, handler(), RECURRING_INTERVALS, validService(), handler(), isAuthorized(), admin/login.js, handler() (+46 more)

### Community 4 - "Frontend Dependencies and Build"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, react-router-dom, unpdf, devDependencies, vite, @vitejs/plugin-react (+14 more)

### Community 5 - "Security and Content Guidance"
Cohesion: 0.11
Nodes (18): Encrypted Credit Monitoring Credential Exception, Portal Application-Level Authentication, Project Operating Notes, Service Role Server Boundary, Shared Supabase Tenant Isolation, Staff Authentication Separation, Architect and Mentor Brand Archetypes, Clarity to Hope Emotional Progression (+10 more)

### Community 6 - "Contact Intake and Email"
Cohesion: 0.36
Nodes (11): allowedOrigin(), clean(), clientHash(), confirmationEmail(), emailLayout(), escapeHtml(), handler(), json() (+3 more)

### Community 7 - "Financial Brand Design System"
Cohesion: 0.18
Nodes (11): Navy Gold Ivory Brand Color System, Editorial Financial Typography, Financial Growth Company Positioning, Human-Centered Financial Imagery, Less Decoration, More Meaning, Magic Enterprise Group Logo Symbolism, Magic Enterprise Group Design System, Sober Trust-Oriented UI Components (+3 more)

### Community 8 - "SEO and Structured Metadata"
Cohesion: 0.33
Nodes (9): SEO(), upsertMeta(), DEFAULT_IMAGE, getPageMeta(), getStructuredData(), ROUTES, SITE_NAME, SITE_URL (+1 more)

### Community 9 - "Credit Bureau Report Parsing"
Cohesion: 0.36
Nodes (7): ACCOUNT_RATING_PATTERN, BUREAUS, extractBureauTriplets(), extractCaseStatusProxy(), extractScores(), isScoreTriplet(), ratingToStatusCategory()

### Community 10 - "Encrypted Monitoring Credentials"
Cohesion: 0.52
Nodes (5): decryptSecret(), encryptSecret(), getKey(), handler(), PROVIDERS

### Community 11 - "ConsumerDirect Integration Spike"
Cohesion: 0.62
Nodes (5): callPapi(), callPws(), login(), main(), section()

### Community 12 - "Client Document Uploads"
Cohesion: 0.60
Nodes (5): ALLOWED_MIME_TYPES, createSignedUploadUrl(), DOCUMENT_TYPES, handler(), sanitizeFilename()

### Community 13 - "Brand Social Preview"
Cohesion: 0.60
Nodes (6): Crédito con claridad, Evaluación y estrategia en español, Magic Enterprise Group, megcredit.com, Orlando, Florida, MEG Credit Social Preview

### Community 14 - "Vercel Routing and Security"
Cohesion: 0.33
Nodes (5): cleanUrls, headers, rewrites, $schema, trailingSlash

### Community 15 - "Theme Selection"
Cohesion: 0.83
Nodes (3): currentTheme(), systemTheme(), ThemeToggle()

### Community 17 - "HTML Entry and Theme Boot"
Cohesion: 0.67
Nodes (3): HTML Application Entry Document, Pre-Render Theme Restoration, Spanish Orlando Credit Metadata

## Knowledge Gaps
- **52 isolated node(s):** `STAFF_SESSION_COOKIE_NAME`, `SESSION_COOKIE_NAME`, `INVITE_TTL_MS`, `BUREAUS`, `BUREAUS` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Application Shell and Navigation` to `Admin Interface and Actions`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `json()` connect `Admin Client Operations APIs` to `Credit Bureau Report Parsing`, `Encrypted Monitoring Credentials`, `Plans and Staff Authentication`, `Client Document Uploads`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `STAFF_SESSION_COOKIE_NAME`, `SESSION_COOKIE_NAME`, `INVITE_TTL_MS` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Application Shell and Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05222286934575811 - nodes in this community are weakly interconnected._
- **Should `Admin Client Operations APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.09111111111111111 - nodes in this community are weakly interconnected._
- **Should `Admin Interface and Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.10153358011634056 - nodes in this community are weakly interconnected._
- **Should `Plans and Staff Authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.09830508474576272 - nodes in this community are weakly interconnected._