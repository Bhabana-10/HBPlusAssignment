# HB+ Employee Portal

A cross-platform employee portal built with React Native and Expo, supporting web, Android, and iOS. The application uses Google OAuth authentication through Supabase and restricts access to official HB+ company email accounts.

**Live Demo:** https://magical-hotteok-5c5dc8.netlify.app  
**GitHub Repository:** https://github.com/Bhabana-10/HBPlusAssignment

## Features

- Google Sign-In using Supabase Authentication.
- Restricts new account registration to `@hbplus.fit` email addresses.
- Protected dashboard for authenticated users.
- Session persistence and logout functionality.
- User profile storage using Supabase.
- Admin and User role support.
- Loading indicators and authentication error handling.
- Responsive interface for web and mobile layouts.
- Development-only dashboard preview.

## Technology Stack

| Category | Technologies |
|---|---|
| Framework | React Native, Expo |
| Web Support | React Native Web |
| Language | JavaScript |
| Authentication | Google OAuth 2.0, Supabase Auth |
| Database | Supabase (PostgreSQL) |
| Session Storage | AsyncStorage |
| Deployment | Netlify |

## Project Structure

```text
HBPlusAssignment/
├── App.js
├── app.json
├── package.json
├── package-lock.json
├── lib/
│   └── supabase.js
├── .env
└── README.md
```

The `.env` file is local configuration and is excluded from Git.

## Getting Started

### Prerequisites

- Node.js and npm
- Git
- A Supabase project
- A Google Cloud OAuth 2.0 Web Client

### 1. Clone the repository

```bash
git clone https://github.com/Bhabana-10/HBPlusAssignment.git
cd HBPlusAssignment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Replace the placeholders with your Supabase project URL and publishable key.

### 4. Start the application

For web:

```bash
npx expo start --web
```

For Android:

```bash
npx expo start --android
```

For iOS:

```bash
npx expo start --ios
```

## Authentication Configuration

1. Create a Supabase project.
2. Enable Google as an authentication provider.
3. Configure the Google OAuth Client ID and Client Secret in Supabase.
4. Add the Supabase callback URL to the Google Cloud OAuth client's authorized redirect URIs.
5. Add the local and deployed application URLs to Supabase's allowed redirect URLs.
6. Add the corresponding application origins to Google's authorized JavaScript origins.

Supabase callback URL format:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

## Company Email Restriction

The application restricts access to official `@hbplus.fit` email accounts.

A Supabase Before User Created Auth Hook validates the email domain before a new account is created. The application also checks the authenticated session and login result before allowing access to the dashboard.

The domain check is case-insensitive.

## User Profiles and Roles

The application uses a Supabase `profiles` table to store:

- User ID
- Full name
- Email address
- Avatar URL
- User role
- Account creation timestamp

The default role is `user`. The supported roles are `admin` and `user`.

Row Level Security (RLS) policies protect user profile records.

## Deployment

The web application is deployed on Netlify.

**Live Application:** https://magical-hotteok-5c5dc8.netlify.app

To generate a production web build:

```bash
npx expo export --platform web
```

The generated `dist` directory contains the files used for deployment.

## Security Notes

- Environment files are excluded from version control.
- Only the Supabase publishable key is used in the client application.
- Never expose Google OAuth Client Secrets or Supabase service-role keys in frontend code or public repositories.
- Supabase Row Level Security policies protect profile data.
- The Before User Created hook enforces the email-domain restriction during account creation.

**Note:** Successful authentication with an official `@hbplus.fit` account requires a valid company account. The live deployment was tested using a personal Gmail account to verify that unauthorized email domains are rejected.