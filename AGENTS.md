# IMPORTANT. ALWAYS READ, DON'T SKIP

“Kisan Vakil” sounds like a farmer’s legal and advisory ally, so the app should feel like a sharp pocket advocate for land, schemes, disputes, and paperwork. Mostly, farmers face an issue whereby they are made to signup paperwork they don't know about so we want to combat that

Core features:

* Legal help in local languages with plain-language explanations
* Farm land record lookup, including khata, khasra, mutation, and ownership history
* Document vault for land papers, IDs, agreements, court notices, and receipts
* Scheme checker to find eligible government subsidies, loans, and grants
* Step-by-step claim filing for crop insurance, compensation, and disaster relief
* Voice search and voice notes for low-literacy users
* Regional language support with dialect-friendly UI
* Offline mode for storing documents and drafts when network is weak
* Loan and credit guidance with repayment planning

Strong “vakil” features:

* Legal notice generator for tenancy, land dispute, theft, and payment defaults
* Template library for affidavits, applications, RTI requests, and complaints
* Red-flag checker for fraudulent land sale, fake agents, and bad loan terms
* Evidence capture tools for photos, video, geo-tagging, and timestamps


Trust and usability features:

* Very simple home screen with 3 or 4 big action buttons
* Family sharing so a son, daughter, or agent can help manage cases
* Secure login with OTP and optional biometric lock
* SOS or emergency helpline button for urgent legal or field issues
* Audio summaries for long legal text, because nobody needs to wrestle a wall of jargon at 7 a.m. ☀️

Best-priority MVP version:

1. Land record lookup
3. Legal notice and complaint templates
4. Document vault
5. Expert chat in local language

A strong tagline could be:
**“Kisan Vakil: Zameen, Kanoon, aur Haq ka saathi.”**

---

THIS IS NOT TO BE TAKEN BY HEART, IT'S A DRAFT

1. Mobile first platform (While we use Next.js it should feel fast, responsive and interactive)
2. Primary user: Farmers (Low literacy, regional language preference)
3. Voice-first UX: Assume many users prefer audio over text
4. Offline resilience: App must degrade gracefully in low connectivity
5. Trust-first design: Every action must feel safe and verifiable
6. Internationalization (`next-intl`)

We are using:
1. Next.js frontend and backend
2. TursoDB as the database (SQLite-based)
3. Uploadthing for document storage
4. Vercel for deployment
5. Gemini 3 for parsing documents (Multi modal) and generating JSON responses (AI SDK)
6. Groq for small chats (Max context: 8k) (AI SDK extension: https://ai-sdk.dev/providers/ai-sdk-providers/groq)
7. Upstash for caching and pub/sub (Redis-based)
8. Better-auth for everything authentication
9. Zod for schema validation
10. Nodemailer for email stuff
11. Pusher for real-time notifications
12. Drizzle for ORM
13. ShadCN + Tailwind v4
14. React Query for data fetching and caching
15. React Hook Form for forms
16. If need be use Tambo (https://ui.tambo.co/) for generative UI components
17. A TTS feature (Very important) (Farmers may not understand english, so we need to translate and optionally give a read out feature in their indian language)
18. React PDF for PDF viewing and annotation
19. React email and components / renderer for building email templates using Tailwind
20. Use Gemini 2.5 Flash (Google API and free) or Whisper Large v3 (Groq API) (https://console.groq.com/docs/rate-limits)
21. For local development in AI specifically use AI SDK Ollama
22. We are also using QStash

ABSOLUTELY NON-NEGOTIABLE:
1. Brilliant, non-generic designs
2. Robust, extensible and well-thought out backend (Fully REST compliant and also plural noun naming)
3. Ask user if anything needs to be done
4. ALWAYS search the web for the LATEST stuff. No excuses. You can fetch, search, crawl and so on
5. Make heavy use of flyout or such components, don't just link to pages. The app should feel like a single page experience, with modals, flyouts, and such. Use drawers, dialogs, grouped input, accordions and so on where you can.
6. Everything must be free and not require a credit card
7. Always do `pnpm i` before `pnpm dev`. After any changes are done always make sure to do `lint:ts` and `format`.
8. Card-y UI should not be the first thing you go for, unless necessary
9. Keep packages upto their latest stable releases

## Extra notes for reference

1. Bhu-Aadhaar (ULPIN)
2. PM-Kisan 
3. Fasal Bima
4. Hidden cost scanner
5. Kisan Credit Card (KCC)
6. Kisan Pehchan Patra (Farmer ID)
7. PM Dhan-Dhaanya Krishi Yojana

## Steps for Fetching Details or the documents reqquired for the Land laws 

🔹 1. How to Get Satbara Online (Very Common)
Step-by-step:
Go to official portal
👉 https://mahabhumi.gov.in/

(“Mahabhulekh” website)
Select:
District
Taluka
Village
Choose search method:
Survey Number / Gat Number
OR Owner Name
Click Search
View your 7/12 record
Click Download / Print

👉 This is informational copy (not digitally signed)

🔹 2. Get Digitally Signed Satbara (Official Copy)

For legal use (loan, court, etc.):

Go to: https://cscservices.mahaonline.gov.in/Dashboard/Login.aspx

(Portal by MahaOnline)
Create/Login account
Search service: “Digitally Signed 7/12”
Enter:
District, Taluka, Village
Survey/Gat number
Pay fee (~₹15–₹30)
Download digitally signed PDF
🔹 3. Offline Method (Talathi Office)

If online not working:

Visit local Talathi office
Give:
Survey number OR owner name
Request 7/12 extract
Pay small fee
Get stamped copy
🔹 4. How to Update / Change Satbara (Important Process)

If you want to change ownership or details, you need mutation (Ferfar):

Steps:
Apply for mutation at Talathi office
Submit documents:
Sale deed / inheritance proof
ID proof
Application form
Entry created in record (Mutation Entry No.)
Verification by revenue officer
Public notice period (objections if any)
Final approval
Satbara gets updated with new owner/details
🔹 5. Track Mutation Status
Go to Mahabhulekh portal
Select “Mutation Status”
Enter mutation number
⏱️ Time Required
Online download → instant
Mutation update → 15–30 days (can vary)
⚠️ Important Points
7/12 is mainly for agricultural land
Always use digitally signed version for legal work
Check for loan entries (encumbrances) before buying land