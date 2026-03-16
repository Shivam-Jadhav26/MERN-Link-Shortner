# 🔗 LinkMint
A full-stack URL shortener with secure auth, OAuth login, and click analytics.

---

## 📖 What Is This?

Ever sent a URL that looked like this?
`https://some-random-site.com/articles/2024/how-to-do-something-very-specific?ref=newsletter&utm_source=email`

Yeah. Nobody's clicking that.

**LinkMint** turns it into something clean, short, and shareable — and tells you exactly how many people actually opened it.

---

## What It Does

- 🔗 **Shorten URLs** — Paste long link, get short link. Done.

**Track clicks** — Know if people actually clicked your link.

**Email + password auth** — Classic signup and login.

**OAuth login** — One click with Google or GitHub. No new password needed.

**HTTP-only cookies** — Tokens stored safely, away from JavaScript.

**Auto token refresh** — You stay logged in. Securely.

**Real logout** — Token gets blacklisted. None of that fake client-side clear stuff.

**Link dashboard** — See, manage, and delete all your links in one place.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (HTTP-only cookies) + Passport.js (Google & GitHub OAuth) |
| **Email** | Brevo Transactional API |
| **Hosting** | Netlify (frontend) · Render (backend) · MongoDB Atlas (DB) |


## 🏗️ Why Built This Way?

A few deliberate choices worth knowing:

- **Decoupled frontend & backend** — They're independent. Scale or update one without touching the other.

- **HTTP-only cookies over localStorage** — So JavaScript can never touch your token.

- **Refresh token rotation** — Sessions stay alive without weakening security.

- **MongoDB token blacklist** — Logout is real. The token is dead the moment you sign out.

- **OAuth** — Because nobody wants yet another password to remember.



## 📁 Project Structure

```
linkmint/
├── client/   → React frontend
└── server/   → Express backend + auth + DB

## ⚙️ Setup — Run Locally

**1. Clone the repo**
```bash
git clone https://github.com/your-username/linkmint.git
cd linkmint
```

**2. Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend (new terminal)
cd ../client
npm install
```

**3. Set up environment variables**
```bash
# Backend
cd server
cp .env.example .env    # then open .env and fill in your values

# Frontend
cd ../client
cp .env.example .env    # set VITE_API_URL=http://localhost:5000
```

**4. Start the backend**
```bash
cd server
npm run dev
# → running at http://localhost:5000
```

**5. Start the frontend** *(new terminal)*
```bash
cd client
npm run dev
# → running at http://localhost:5173
```

**6. Verify**
```
http://localhost:5000/api/health  →  { "status": "ok" }
http://localhost:5173             →  App loads
```

> See the [Production Notes](#-production-notes) section for which variables to set in Render/Netlify dashboards for deployment.

---
## 🌐 Deployment

- Frontend lives on **Netlify**.
- Backend lives on **Render**.
- Set all env variables in your host's dashboard — HTTPS is required for cookies and OAuth to work.

---

## 👤 Who's This For?

- Devs who want to see how a real full-stack auth system is built.
- Learners exploring JWT, OAuth, and cookies in a working project.
- Anyone tired of sharing ugly, untracked links.

---

## 📦 Dependencies & Libraries Used

### 🖥️ Backend

| Library | Purpose |
|---|---|
| `express` | Core web framework — handles routing, middleware, and HTTP requests |
| `mongoose` | ODM for MongoDB — defines schemas and talks to the database |
| `nanoid` | Generates unique short IDs for each shortened URL |
| `dotenv` | Loads environment variables from `.env` into `process.env` |
| `cookie-parser` | Parses HTTP cookies — needed to read JWT tokens from incoming requests |
| `cors` | Controls which origins can talk to the API — essential for cross-origin frontend/backend setup |
| `axios` | Makes HTTP requests from the server (e.g. OAuth token exchange) |

---

### 🎨 Frontend

| Library | Purpose |
|---|---|
| `react` | Core UI library — builds the component-based interface |
| `react-router-dom` | Handles client-side routing between pages (home, login, dashboard, etc.) |
| `axios` | Makes API calls from the browser to the backend |
| `react-confetti` | Renders a confetti animation — used on success screens for a fun UX touch |

---

### 🔐 Authentication & Security

| Library | Purpose |
|---|---|
| `jsonwebtoken` | Signs and verifies JWT access and refresh tokens |
| `bcrypt` | Hashes passwords before storing them — never stored as plain text |
| `helmet` | Sets secure HTTP headers to protect against common web vulnerabilities |
| `express-rate-limit` | Limits repeated requests to sensitive routes (login, register, etc.) to prevent brute force |
| `passport` | Authentication middleware — manages OAuth strategies and session flow |
| `passport-google-oauth20` | Google OAuth 2.0 strategy for Passport — handles Google login |
| `passport-github2` | GitHub OAuth strategy for Passport — handles GitHub login |

---

### 📧 Email & External Services

| Service | Purpose |
|---|---|


---

## 🔐 Authentication Flow (JWT + HTTP-Only Cookies)

LinkMint uses a robust JWT-based authentication system with refresh token rotation and HTTP-only cookies, designed to prevent common vulnerabilities like XSS and CSRF while providing a seamless user experience.

### 1. User Registration Flow
* **Token Generation:** User submits their email address. The backend generates a secure, random verification token.
* **Email Dispatch:** The Brevo API sends an email containing a targeted verification link.
* **Flow:** `User -> Submits Email -> Backend Generates Token -> Email Sent -> User clicks link`

### 2. Email Verification
* **Validation:** When the user clicks the emailed link, the backend intercepts the request and validates the token against the database, checking for tampering or expiration.
* **Activation:** If valid, the user's account is flagged as verified. Unverified accounts cannot log in.

### 3. Password Setup
* **Completion:** Once verified, the user is redirected to a setup screen to create their password.
* **Hashing:** The assigned password is never saved in plain text. It is securely hashed and salted using `bcrypt` before being persisted to MongoDB.

### 4. Login Flow
* **Credential Check:** User submits email and password. The backend retrieves the user and uses `bcrypt.compare` to validate the password hash.
* **Token Generation:** Upon success, the server creates two separate JSON Web Tokens (JWTs):
  * **Access Token:** Short-lived token used for authorizing immediate API requests.
  * **Refresh Token:** Long-lived token used strictly to get new Access Tokens.

### 5. Token Storage Strategy
* **Access Token Delivery:** Returned in the JSON response payload and stored in memory by the React frontend.
* **Refresh Token Delivery:** Attached to the response as a **Secure, HTTP-only Cookie**.
* **Security Consideration:** Storing tokens in `localStorage` makes them highly vulnerable to Cross-Site Scripting (XSS). HTTP-only cookies cannot be read by JavaScript, completely mitigating XSS token theft.

### 6. Refresh Token Rotation
* **Silent Renewal:** When the Access Token expires, the frontend's Axios interceptor automatically hits the `/refresh` endpoint, sending the HTTP-only cookie.
* **Rotation:** The backend verifies the old Refresh Token, then issues a *new* Access Token and a *new* Refresh Token. 
* **Security Consideration:** The old Refresh Token is immediately invalidated. If a malicious actor manages to steal and use a Refresh Token, the rotation system detects the reuse anomaly and can revoke all sessions for that user.

### 7. Logout Flow
* **Cookie Clearing:** The backend instructs the browser to clear the HTTP-only cookie.
* **Token Blacklisting:** To ensure the token is genuinely invalidated on the server (and not just deleted from the browser), the Refresh Token is added to a MongoDB-backed **Token Blacklist**. Any future attempt to use that token will be automatically blocked.

### 8. OAuth Login Flow (Google & GitHub)
* **Initiation:** User clicks the Google or GitHub login button.
* **Redirection:** Passport.js redirects the user to the provider for consent.
* **Database Sync:** The provider sends back the user's profile profile. The backend checks if they exist by provider ID or email. If they are new, an account is created (without a password).
* **Token Issuance:** The system bypasses the password check, issues the standard Access Token and HTTP-only Refresh Token cookie, and redirects the user into their dashboard.

---

## 📡 API Endpoints Documentation

The backend API is designed around RESTful principles. All responses return a consistent JSON structure.

### 🔐 Authentication

| Method | Endpoint | Purpose | Body | Response |
|---|---|---|---|---|
| `POST` | `/api/auth/request-verification` | Send verification email | `{ "email": "user@example.com" }` | `{ "message": "Verification email sent." }` |
| `GET` | `/api/auth/verify/:token` | Verify email via token | *None* | Redirects to password setup |
| `POST` | `/api/auth/set-password` | Set password after verification | `{ "token": "...", "password": "..." }` | `{ "message": "Password set. You can now log in." }` |
| `POST` | `/api/auth/login` | Log in user | `{ "email": "...", "password": "..." }` | `{ "accessToken": "...", "user": { ... } }` *(Sets Refresh Cookie)* |
| `POST` | `/api/auth/logout` | Log out user | *None* | `{ "message": "Logged out" }` *(Clears Cookie, Blacklists Token)* |
| `POST` | `/api/auth/refresh` | Get new Access Token | *None* (Uses Cookie) | `{ "accessToken": "..." }` *(Sets new Refresh Cookie)* |
| `GET` | `/api/auth/me` | Get current user profile | *None* (Requires Bearer token) | `{ "user": { "id": "...", "email": "..." } }` |

### 🔗 URL Shortener

| Method | Endpoint | Purpose | Body | Response |
|---|---|---|---|---|
| `POST` | `/api/shorten` | Create a new short URL | `{ "originalUrl": "https://long-url.com" }` | `{ "shortUrl": "linkmint.com/xyz123", "shortCode": "xyz123" }` |
| `GET` | `/:shortCode` | Redirect to original URL | *None* | `302 Redirect` to Original URL *(Increments click count)* |
| `GET` | `/api/stats/:shortCode` | Get analytics for a link | *None* (Requires Bearer token) | `{ "originalUrl": "...", "clicks": 42, "createdAt": "..." }` |

---

## 🚀 Deployment

The LinkMint application is fully deployed and accessible online. The architecture is split to ensure independent scaling and management of the frontend and backend.

- **Frontend Hosting:** Deployed securely on **Netlify**. It serves the optimized React (Vite) static build.
- **Backend Hosting:** Hosted on **Render** as a Node.js web service.
- **Database:** Managed via **MongoDB Atlas**, providing a reliable, cloud-hosted database cluster.
- **Connection Logic:** The frontend application connects to the backend API via a configured `VITE_API_URL` environment variable. 
- **Environment Variables:** Both Netlify and Render environments are configured with their respective secure credentials (OAuth keys, JWT secrets, database URIs, and Brevo API keys) preventing sensitive data from being exposed in the codebase. 

---

## 🎯 Conclusion

LinkMint is more than just a URL shortener; it serves as a comprehensive demonstration of **modern full-stack web development**. 

Throughout this project, key technical concepts were successfully implemented, including:
- **RESTful API Design** with clean separation of concerns.
- **Advanced Authentication** utilizing JWTs alongside HTTP-only cookies to neutralize XSS vectors.
- **OAuth Integration** for frictionless social logins via Google and GitHub.
- **Security Best Practices** such as refresh token rotation and database-level token blacklisting to ensure robust logout functionality.

Building this application provided immense learning value in taking a decoupled architecture from local development all the way through to production deployment, tackling real-world challenges in secure session management and environment configuration.
