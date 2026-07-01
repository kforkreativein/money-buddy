# Supabase setup for Money Buddy

Follow these steps once. After that, login and data sync across your phone, browser, and home-screen app.

## 1. Create a free Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**.
3. Name it e.g. `money-buddy`.
4. Set a **database password** and save it somewhere safe.
5. Wait ~2 minutes for the project to finish creating.

## 2. Run the database schema

1. In Supabase, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this repo.
3. Copy all of it, paste into the SQL editor, click **Run**.
4. You should see “Success” with no errors.

**Already set up before?** Also run `supabase/migrations/add_category_wallet_id.sql` once (adds wallet linking for categories).

## 3. Turn off email confirmation (important)

So you can sign up with username + password instantly:

1. Supabase → **Authentication** → **Providers** → **Email**.
2. Turn **OFF** “Confirm email”.
3. Save.

## 4. Get your API keys

1. Supabase → **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

Do **not** use the `service_role` secret key in the app.

## 5. Add keys to Vercel (production)

1. Vercel → your Money Buddy project → **Settings** → **Environment Variables**.
2. Add:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon public key |

3. Apply to **Production** (and Preview if you want).
4. **Redeploy** the app.

## 6. Local development (optional)

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart `npm run dev`.

## How login works with Supabase

- You still use **username + password** in the app.
- Behind the scenes we use `username@moneybuddy.app` with Supabase Auth.
- You never see that email — only your username.

## Will the free project pause after 7 days?

**If you use Money Buddy most days**, it almost certainly **will not pause**. Each sync counts as database activity.

If it ever pauses (e.g. you don’t open the app for 2+ weeks):

- Your data is **not deleted**.
- Open Supabase dashboard → **Restore project** (one click).
- Log in again in the app — data comes back.

## After setup

1. Open Money Buddy (home-screen app or browser).
2. **Sign up** with a new username (or sign in if you already have a cloud account).
3. Add an entry — it saves locally and syncs to the cloud.
4. Open the app on another device with the **same username + password** — your data should appear.

## Without Supabase keys

The app still works **local-only** on that device (same as before). Cloud sync activates automatically when the env vars are set.
