# Smart Bookmark App

This project implements a lightweight bookmark manager using **Next.js 14** (App Router), **Supabase** for authentication, database and realtime updates, and **Tailwind CSS** for styling. It satisfies the requirements from the assignment: Google‐only authentication, per‑user private bookmarks, realtime updates across tabs, delete functionality and deployment readiness on Vercel.

## Features

* **Google sign‑in only** – users authenticate via Google OAuth. The Supabase provider must be enabled in your project settings. You need to set up a Google Cloud OAuth client and supply its ID/secret to Supabase. The dev article on integrating Google OAuth outlines how to configure the consent screen and authorised redirect URIs (for example, enabling the Google provider in Supabase and adding a callback URL)【854967088224441†L60-L87】.
* **Add bookmarks (URL & title)** – authenticated users can insert new bookmarks. A simple form persists the URL and title to the database via Supabase.
* **Private per‑user data** – bookmarks are stored with the user’s `user_id`, and Row Level Security (RLS) policies ensure each user only sees their own records. Supabase’s docs show how to create policies using `auth.uid()` to match the authenticated user’s ID【528323144068010†L983-L1012】.
* **Realtime updates** – when a user inserts or deletes a bookmark in one tab, all other open tabs automatically update. This is implemented using Supabase’s `postgres_changes` subscription.
* **Delete bookmarks** – users can remove their own bookmarks. RLS policies prevent users from deleting bookmarks they don’t own.
* **Vercel ready** – the project is configured for deployment on Vercel. The `.env.local.example` file lists the necessary environment variables.

## Getting started

### 1. Create a Supabase project

1. Sign in to [Supabase](https://supabase.com) and create a new project. Note the **Project URL** and **Anon key** from the dashboard.
2. In the **Authentication → Providers** section, enable the **Google** provider and supply your Google OAuth Client ID and secret. If you haven’t created these yet, follow Google’s instructions to set up an OAuth client. The authorised redirect URI should point to `https://<your-domain>/auth/callback` (replace with your Vercel URL or `http://localhost:3000` for local development)【854967088224441†L60-L87】.
3. Add your domain(s) (including any Vercel preview URLs) to the redirect URL list in the Supabase provider configuration.

### 2. Configure Google OAuth

Create a Google Cloud project and set up OAuth credentials. In the consent screen configuration specify the required information (app name, support email, authorised domains etc.). Then create OAuth 2.0 credentials of type **Web application**. Add the same redirect URI(s) you configured in Supabase【854967088224441†L60-L87】. Copy the Client ID and Client Secret and paste them into Supabase’s Google provider settings.

### 3. Define the database schema

Execute the following SQL in the Supabase SQL editor to create the `bookmarks` table and configure Row Level Security:

```sql
-- Create a bookmarks table. `user_id` references the Supabase Auth users table.
create table if not exists public.bookmarks (
  id         serial primary key,
  url        text not null,
  title      text not null,
  user_id    uuid not null references auth.users(id),
  created_at timestamp with time zone default now()
);

-- Ensure row level security is enabled on the table
alter table public.bookmarks enable row level security;

-- Allow authenticated users to select their own records
create policy "Individuals can view their own bookmarks" on public.bookmarks
  for select using ( (select auth.uid()) = user_id );

-- Allow authenticated users to insert records; user_id is set via the auth.uid() default
create policy "Individuals can insert their own bookmarks" on public.bookmarks
  for insert with check ( (select auth.uid()) = user_id );

-- Allow users to delete only their own records
create policy "Individuals can delete their own bookmarks" on public.bookmarks
  for delete using ( (select auth.uid()) = user_id );

-- You can also create a separate policy for updates if you wish to allow editing.

-- Grant the anon and authenticated roles access to perform selects/inserts/deletes via RLS
grant select, insert, delete on public.bookmarks to anon, authenticated;
```

The Supabase docs discuss why wrapping `auth.uid()` in a `select` improves performance and how a policy like `using ((select auth.uid()) = user_id)` ensures only the current user can access their rows【528323144068010†L983-L1012】.

If you want realtime updates, ensure the table has `REPLICA IDENTITY FULL` set (Supabase’s Table Editor does this automatically).

### 4. Configure environment variables

1. Copy `.env.local.example` to `.env.local` in the project root and fill in your credentials:
   * `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` – the anon key (publishable) used in the browser
   * `SUPABASE_SERVICE_ROLE_KEY` – a service role key. This is used only on the server and must remain private. Create a **Service Role** key from the Supabase Project Settings → API page.
   * `SITE_URL` – the base URL of your deployed app (e.g. `http://localhost:3000` for development).

2. Do **not** commit `.env.local` to version control (it is ignored by `.gitignore`).

### 5. Install dependencies and run locally

1. Install Node.js (v18+) if you haven’t already.
2. Inside the project directory run:

   ```bash
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser. You should see the login page. Click **Sign in with Google** to authenticate. After logging in you can add, view and delete bookmarks. Open another tab to observe realtime updates.

### 6. Deploy to Vercel

1. Push your repository to GitHub.
2. In Vercel, import the repository and set the following environment variables under the **Environment Variables** section: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SITE_URL` (pointing to your Vercel domain).
3. Deploy the project. Once deployed, update the allowed redirect URIs in Supabase and Google Cloud to include your Vercel domain.

## Problems encountered & solutions

### OAuth redirect issues

Initially the Google sign‑in flow returned an `invalid_redirect_uri` error. The problem was a mismatch between the redirect URIs configured in Google Cloud and the ones allowed in Supabase. The fix was to ensure that **both** the OAuth client and the Supabase provider have the same authorised redirect URL (e.g. `https://<vercel‑app>.vercel.app/auth/callback` for production and `http://localhost:3000/auth/callback` for development)【854967088224441†L60-L87】.

### Missing row level security policies

During early testing, bookmarks created through the UI did not have a `user_id` set and were visible to everyone. This happened because RLS was not enabled on the `bookmarks` table. Enabling RLS and adding policies that reference `auth.uid()` fixed the problem【528323144068010†L983-L1012】. Additionally, the policies were adjusted to wrap `auth.uid()` in a `select` for better performance, as suggested by Supabase’s documentation【528323144068010†L983-L1012】.

### Realtime subscription didn’t trigger

Realtime updates failed until `REPLICA IDENTITY FULL` was set on the table (done automatically when using the Supabase Table Editor). If you create the table via SQL, run `ALTER TABLE public.bookmarks REPLICA IDENTITY FULL;` to ensure full row data is sent to realtime listeners.

### Authentication context in server actions

When implementing the `/auth/callback` route, the session was not persisted until we switched to using the Supabase SSR client with cookie handling. The `createServerClient` call attaches auth cookies to the response so that subsequent server actions have access to the user’s session. Without this configuration the user appeared unauthenticated after redirecting back from Google. The final implementation uses the Supabase SSR helper to exchange the auth code for a session and persist it in cookies.

## Conclusion

The Smart Bookmark App demonstrates a complete flow for authenticated, realtime CRUD using Next.js and Supabase. The combination of Google OAuth, row level security policies and realtime subscriptions yields a secure, multi‑tab experience. To extend this project you could add editing, tagging, search or shareable collections. Happy hacking!