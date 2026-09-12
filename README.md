# 🚀 Hirely — AI-Powered Job Search & Recruitment SaaS Platform

> **Hirely** is a production-grade, full-stack recruitment SaaS platform that connects ambitious tech professionals with verified employers in Pakistan and beyond through AI-driven candidate matching, automated screening, verified skill assessments, and fraud-resistant employer verification.

---

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Groq_AI-FF6B00?style=for-the-badge&logo=openai&logoColor=white" alt="Groq AI" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Status-Production_Ready-brightgreen?style=for-the-badge" alt="Status" />
</p>

---

## 📌 Overview

**Hirely** was engineered from the ground up to solve the core inefficiencies, trust deficits, and noise that plague traditional job search portals. In rapidly expanding technology hubs, job seekers are frequently confronted with unverified company listings, fake job posts, opaque application statuses, and zero feedback on resume compatibility. Conversely, employers face mountains of unvetted, out-of-context applications that overwhelm screening pipelines.

Hirely transforms the recruitment lifecycle into a high-signal, transparent ecosystem. By combining **Groq-powered Llama-3 AI models**, **strict employer verification**, **timed skill assessment badges**, and **semi-autonomous application drafting**, Hirely bridges the gap between top-tier candidates and high-growth enterprises.

Built primarily for job seekers and employers in Pakistan's technology sector, Hirely's scalable architecture is fully extensible for international recruitment markets and multi-tenant SaaS deployments.

---

## ✨ Key Features

### 🔐 Core Infrastructure & Platform Experience
- **Multi-Role Authentication:** Standard Email/Password registration with bcrypt salt-hashing, Two-Factor Authentication (2FA) via Speakeasy TOTP, and native **Google OAuth 2.0** single sign-on.
- **Role-Based Access Control (RBAC):** Strict separation between `job_seeker`, `employer`, and `admin` permission boundaries across API endpoints and client views.
- **Real-Time Direct Messaging:** Instant candidate-to-employer chat powered by Socket.io with file attachment support (PDF/DOCX/Images via Cloudinary) and unread badge synchronization.
- **Real-Time Notification Engine:** Persisted in-app alerts for application status updates, interview invitations, company verification reviews, and administrative notices.

### 👨‍💻 For Job Seekers
- **Dynamic Profile Builder:** Rich profile creation featuring work history, education records, skill tags, portfolio links, and PDF resume upload.
- **AI Resume & ATS Checker:** Instant PDF resume parsing and AI audit yielding detailed compatibility scores, formatting checks, and keyword optimization feedback.
- **AI Cover Letter Generator:** Tailored cover letter drafting based on the candidate's verified profile data and exact job requisition requirements.
- **AI Job Matching Engine:** Smart recommendation feed filtering for high-relevance jobs (enforcing a strict >80% match threshold).
- **AI Mock Interview Coach:** Interactive technical and behavioral interview practice sessions with real-time feedback on answer clarity and technical depth.
- **Verified Skill Assessments:** Timed technical skill tests with anti-cheat measures (fullscreen enforcement, blur detection, window tab tracking) that award verified badges upon passing.
- **Semi-Autonomous Auto-Apply Assistant:** Intelligent background matching engine that auto-drafts cover letters and pre-fills job screening questions using profile context for candidate review and explicit approval.
- **Application Tracking Pipeline:** Real-time visibility into application status (`Submitted`, `Under Review`, `Shortlisted`, `Interview Scheduled`, `Rejected`, `Hired`).

### 🏢 For Employers
- **Multi-Step Job Posting Wizard:** Intuitive posting workflow with AI-assisted job description polishing and optional custom screening questions.
- **Company Verification System:** Formal business verification workflow requiring registration documents (NTN/Incorporation certificates) evaluated via manual review and AI document analysis.
- **Candidate Pipeline Management:** Drag-and-drop / status-card applicant evaluation pipeline with direct message links and interview scheduling tools.
- **AI Talent Assistant:** Natural language candidate search enabling queries like *"Find senior React developers in Karachi with 3+ years experience"*.
- **Company Analytics Dashboard:** Real-time visual metrics tracking job post performance, applicant conversion rates, and review statistics.
- **Featured Jobs & Pro Subscription Tiers:** Monetization architecture allowing employers to upgrade to Pro tier features or boost listing visibility with Featured Job badges.

### 🛡️ Admin Core & Platform Governance
- **Executive Analytics Dashboard:** Comprehensive platform overview with 30-day time-series charts for user signups, applications, category distributions, and geographic analytics.
- **Employer Verification Queue:** Administrative verification workspace with side-by-side document inspection and AI authenticity scoring.
- **Fraud Detection Engine:** Automated heuristic system flagging suspicious job postings, unverified claims, or abnormal account activity.
- **Granular Sub-Admin Permission Management:** Super Admin capabilities to create sub-admin team members with 10 fine-grained permission toggles.
- **Support Ticket Management:** Centralized support ticket center with threaded conversation history and direct email reply delivery via **Nodemailer**.
- **User & Job Governance:** Admin controls to suspend/reactivate accounts, issue official warnings, trigger password resets, or remove non-compliant listings.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14+ (App Router)** | Server-side rendering, optimized page transitions, and static site generation |
| **Frontend Language** | **TypeScript** | End-to-end type safety across components, pages, and API contracts |
| **Styling & Theme** | **Vanilla CSS / Tailwind CSS** | Custom Obsidian Ink design system (`#09090b` / `#f4f4f5`) with native Dark Mode |
| **Animations** | **GSAP / Lucide Icons** | Micro-interactions, cinematic entrances, and vector iconography |
| **Backend Framework** | **Node.js / Express.js** | RESTful API architecture with Modular MVC controller pattern |
| **Database** | **MongoDB Atlas** | NoSQL document storage managed via Mongoose ODM |
| **Real-Time Communication** | **Socket.io** | Low-latency bi-directional WebSocket messaging and live notification events |
| **AI Engine** | **Groq API (Llama-3)** | Ultra-fast AI inference for resume checking, job matching, and chat assistants |
| **Media & Document Storage** | **Cloudinary API** | Secure cloud storage and delivery of PDF resumes, avatars, and business documents |
| **Authentication & Security** | **JWT / Passport / Bcrypt** | `httpOnly` secure cookies, Google OAuth 2.0, 2FA Speakeasy, and Rate Limiting |
| **Transactional Email** | **Nodemailer** | SMTP support email delivery for admin ticket replies |
| **End-to-End Testing** | **Playwright** | Full browser automation test suite covering 13 critical user journeys |

---

## 📁 Project Structure

```text
hirely/
├── frontend/                   # Next.js 14 App Router Web Application
│   ├── src/
│   │   ├── app/                # Public, Dashboard, and Admin page routes
│   │   ├── components/         # Design System UI primitives, Headers, Footers, and Modals
│   │   ├── context/            # Global Auth, Notification, and Socket Chat contexts
│   │   ├── lib/                # Axios API client, Socket instance, and utility helpers
│   │   └── types/              # TypeScript interface definitions
│   ├── .env.example            # Environment variable template for Frontend
│   └── tailwind.config.ts      # Design system color tokens & typography config
│
├── backend/                    # Express.js REST API Server
│   ├── src/
│   │   ├── config/             # Database, Passport, Cloudinary, and Environment setup
│   │   ├── controllers/        # Request handlers (Auth, Jobs, Applications, Admin, AI)
│   │   ├── middlewares/        # Auth, Role, Admin Permission, Rate Limiters & Sanitization
│   │   ├── models/             # Mongoose Schemas (User, Job, Company, SupportTicket, etc.)
│   │   ├── routes/             # Express API router modules
│   │   ├── services/           # AI Service, Candidate Search & Notification logic
│   │   └── scripts/            # Database mock data seeding and initial admin creation
│   └── .env.example            # Environment variable template for Backend
│
├── e2e/                        # Playwright End-to-End Test Automation Suite
│   ├── *.spec.ts               # Test suites (Auth, Auto-Apply, AI features, Chat, Jobs)
│   └── playwright.config.ts    # Playwright runner configuration
│
├── LICENSE                     # MIT License
└── README.md                   # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **MongoDB Atlas** account (or local MongoDB instance)
- **Groq API Key** (for AI features)
- **Cloudinary Account** (for file uploads)
- **Google Cloud Console OAuth 2.0 Credentials** (optional, for Google SSO)

---

### Installation & Environment Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/ammad-muhammad/Hirely---AI-powered-job-platform.git
cd Hirely---AI-powered-job-platform
```

#### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env
```

> 💡 **Environment Configuration Note:**  
> Update `backend/.env` with your actual credentials. Refer to [`backend/.env.example`](file:///d:/hirely/backend/.env.example) for the full list of required keys (`MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `CLOUDINARY_*`, `EMAIL_*`).

```bash
# Seed the database with initial mock users, jobs, skill tests, and admin account
npm run seed:mock-data

# Start the development API server
npm run dev
```
The Express server will start on `http://localhost:5000`.

#### 3. Frontend Setup
Open a new terminal window:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local
```

> 💡 Refer to [`frontend/.env.example`](file:///d:/hirely/frontend/.env.example) for required client-side environment keys (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`).

```bash
# Start the Next.js development server
npm run dev
```
The Next.js application will start on `http://localhost:3000`.

---

## 📸 Screenshots Showcase

*(Drop your application screenshots into the table below)*

| View | Screenshot | Description |
| :--- | :---: | :--- |
| **Landing Page** | `![Landing Page](./docs/screenshots/landing.png)` | Public landing page featuring Obsidian Ink dark aesthetics, category filters, and live metrics. |
| **Job Seeker Dashboard** | `![Job Seeker](./docs/screenshots/job-seeker-dashboard.png)` | Candidate workspace with AI job recommendations, application status tracker, and skill badges. |
| **Employer Pipeline** | `![Employer Pipeline](./docs/screenshots/employer-pipeline.png)` | Employer applicant management workspace with status columns and candidate resume inspection. |
| **AI Resume Checker** | `![AI Resume Checker](./docs/screenshots/resume-checker.png)` | Interactive PDF resume auditor returning ATS compliance scores and formatting recommendations. |
| **Admin Governance** | `![Admin Dashboard](./docs/screenshots/admin-dashboard.png)` | Executive admin overview with geographic analytics, fraud detection alerts, and verification review queues. |

---

## 🧪 Testing

Hirely includes a comprehensive **Playwright End-to-End Automation Test Suite** covering 13 critical user journeys:

```bash
# Navigate to e2e test directory
cd e2e

# Install Playwright browsers (first time only)
npx playwright install chromium

# Execute the complete test suite
npx playwright test
```

### Test Coverage Highlights:
- ✅ **Authentication & Role Boundaries:** Verifies unauthorized access prevention across candidate, employer, and admin routes.
- ✅ **Browser Signup & MongoDB Verification:** Validates user registration via UI form and confirms record creation in MongoDB.
- ✅ **Job Seeker Flow:** Full journey covering profile setup, job search, application submission, and direct messaging.
- ✅ **Employer Flow:** Full journey covering company profile setup, job post creation, applicant review, and status updates.
- ✅ **Auto-Apply Assistant:** Tests background matching, preference configuration, and candidate approval workflow.
- ✅ **Real-Time Direct Messaging:** Tests cross-session instant messaging between candidate and employer browser instances.
- ✅ **Skill Assessments:** Tests timed assessment UI, anti-cheat detection, and verified badge calculation.

---

## 🔒 Security & Engineering Maturity

- **Cookie-Based JWT Tokens:** Session tokens are stored in `httpOnly`, `SameSite` secure cookies, eliminating XSS token theft vectors.
- **NoSQL Injection Defense:** All incoming request parameters undergo automatic MongoDB query operator sanitization (`sanitizeNoSqlInput`).
- **Server-Side Sub-Admin Permission Enforcement:** Administrative endpoints verify granular permission flags on the server before serving data, preventing direct API access bypasses.
- **Multi-Layered Rate Limiting:** Granular rate limiters protect authentication endpoints, AI inference pipelines, and public support forms against brute-force attacks and abuse.
- **Data Protection Guarantee:** Candidate resume files and personal data are strictly isolated and never sold to third-party brokers.

---

## 🗺 Roadmap & Future Enhancements

- [ ] **Payment Gateway Integration:** Direct payment integration (Stripe / JazzCash / EasyPaisa) for Pro employer subscriptions and featured listing boosts.
- [ ] **Mobile Native Application:** Cross-platform mobile client for iOS & Android built using Capacitor / React Native.
- [ ] **Expanded OAuth Providers:** Native GitHub and LinkedIn OAuth single sign-on integration.
- [ ] **Calendar Integration:** Automated candidate interview scheduling with Google Calendar and Microsoft Outlook synchronization.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

> *Note: If using a custom proprietary or commercial license, update `LICENSE` accordingly.*

---

## ✉️ Author & Contact

**Muhammad Ammad** — *Full-Stack AI & Web Application Developer*

<p align="left">
  <a href="https://www.linkedin.com/in/ammadm/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://github.com/ammad-muhammad" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://ammad-portfolio-wine.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio" />
  </a>
  <a href="mailto:official.muhammadammad@gmail.com">
    <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
</p>

| Channel | Link / Details |
| :--- | :--- |
| **💼 LinkedIn** | [linkedin.com/in/ammadm](https://www.linkedin.com/in/ammadm/) |
| **🐙 GitHub** | [github.com/ammad-muhammad](https://github.com/ammad-muhammad) |
| **🌐 Portfolio** | [ammad-portfolio-wine.vercel.app](https://ammad-portfolio-wine.vercel.app/) |
| **📧 Email** | [official.muhammadammad@gmail.com](mailto:official.muhammadammad@gmail.com) |

---

<p align="center">
  Designed & Built with ❤️ for the Future of Recruitment in Pakistan.
</p>
