# Portfolio Mobile App (Expo)

An Android and iOS app for your portfolio. It talks to the website's REST API (in the parent folder), which stores everything in **MongoDB Atlas**. The app never holds database credentials.

**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · Expo Router · NativeWind (Tailwind) · REST API → MongoDB Atlas · TanStack Query (offline cache) · TenTap (Tiptap) rich-text editor · Expo Notifications

## What's inside

**Public view (bottom tabs)**
- **Home**: hero, Hire Me / Resume, social links, featured projects, featured certificates, resume card
- **About**: bio, skill bars, experience and education timelines
- **Projects**: category filter and detail screens (rich-text content, live and GitHub links, share)
- **Certificates**: issuer filter, credential details and "Verify credential" links
- **Resume** (from Home/About): summary, experience, education, skills, certifications, selected projects, Download PDF
- **Contact**: validated form that saves to `messages`, plus contact details and socials

Every list supports pull-to-refresh and shows skeletons, empty and error states. An offline banner appears when there's no connection.

**Admin mode** (lock icon in the header → admin email + password → the 6-digit code emailed to you)
- Dashboard with stats (projects, posts, messages, unread, site visits), navigation, a notifications toggle, appearance setting and sign-out
- Full CRUD for **profile, projects, certificates, skills, experience, education, settings**. Tap to edit; long-press or use the trash icon to delete.
- Image upload from the **camera or gallery** (automatically resized, stored in MongoDB GridFS), plus CV upload with the document picker
- Project details in a full-screen **rich-text editor** that produces the same HTML as the website's editor, with inline image upload
- **Messages inbox**: unread filter, mark read/unread, mark all read, reply by email, delete
- **Push notifications** when a new contact message arrives. Tapping one opens that message.
- Zod validation identical to the website (`src/lib/resources.ts` mirrors the website's registry), toasts for success and errors, and a warning before leaving a form with unsaved changes

**Theme:** same palette as the website, with the accent colour **#6C63FF** by default. If you change the accent in Admin → Settings, the app updates too. It supports light, dark and system modes.

**Offline-friendly:** the query cache is saved to device storage for 7 days, so the app opens with your content without a network connection. Images are cached on disk with `expo-image`. Edits are blocked while offline with a clear message, instead of being silently queued.

## Project structure

```
mobile/
  app.json  eas.json  tailwind.config.js  global.css  babel.config.js  metro.config.js
  src/
    app/                    Expo Router routes
      (tabs)/               Home, About, Projects, Certificates, Contact
      resume.tsx            Resume screen
      project/[slug].tsx    Project detail
      login.tsx             Admin sign-in (modal)
      admin/                Guarded admin stack
        index.tsx           Dashboard
        [resource]/         Generic list + edit screens for every collection
        profile.tsx settings.tsx
        messages/           Inbox + message detail
        editor.tsx          Full-screen rich-text editor
    components/             UI kit, cards, HTML renderer, admin form engine
    hooks/                  Data hooks (public + admin), notification routing
    lib/                    API client (api.ts), query cache, resources registry, uploads, notifications, theme
    providers/              Auth + theme providers
```

---

## 1. Backend setup (once)

Nothing extra is needed: the app uses the website's API. Set up the website first (see [../README.md](../README.md): MongoDB Atlas, `npm run db:setup`, then create the admin account once at `/admin/register` on the website).

Push notifications are handled by the website too. When a contact message is saved, the server sends an Expo push to every admin device registered in MongoDB `push_tokens`. A failed push never blocks the visitor's message, and devices that uninstalled the app are removed automatically.

## 2. Run locally

```bash
cd mobile
npm install
cp .env.example .env.local     # set EXPO_PUBLIC_API_URL (see below)
npx expo start
```

`EXPO_PUBLIC_API_URL` is the website's address:
- **Local development:** start the website with `npm run dev` in the parent folder, then use your computer's **LAN IP**, e.g. `http://192.168.0.173:3000`. `localhost` won't work, because on a phone it means the phone itself. Phone and computer must be on the same Wi-Fi. Find your IP with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS).
- **Production:** your deployed site, e.g. `https://your-site.vercel.app`. It must be **https** for store builds.

- **Expo Go** (fastest way to try it): scan the QR code. The public view and admin CRUD work. Push notifications do **not** work in Expo Go.
- **Development build** (full features, including push): build once, then `npx expo start` reloads instantly.
  ```bash
  npx eas-cli@latest build --profile development --platform android   # or ios
  ```
  You can also build locally with `npx expo run:android` / `npx expo run:ios` (requires Android Studio / Xcode).

Checks: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

---

## 3. Before your first build

1. **Pick your app IDs**. In `app.json`, replace `com.yourname.portfolio` (both `ios.bundleIdentifier` and `android.package`) with something unique, e.g. `com.janedoe.portfolio`. You can't change these after publishing.
2. **App name, icon and splash**: edit `expo.name` in `app.json` and replace the images in `assets/`:
   - `icon.png`: 1024×1024, no transparency (iOS)
   - `adaptive-icon.png`: 1024×1024 foreground on transparent background (Android). The background colour is set in `app.json` (`#6C63FF`).
   - `splash-icon.png`: your logo
3. **Create an Expo account** at [expo.dev](https://expo.dev) and link the project:
   ```bash
   npm install -g eas-cli      # or use npx eas-cli@latest
   eas login
   eas init                    # adds extra.eas.projectId to app.json (required for push tokens)
   ```
4. **Add environment variables to EAS** (build profiles read these through `"environment"` in `eas.json`):
   ```bash
   for env in development preview production; do
     eas env:create --environment $env --name EXPO_PUBLIC_API_URL --value https://your-site.vercel.app --visibility plaintext
   done
   ```
   The site URL is public, so "plaintext" is fine. Never put your `MONGODB_URI` in the app; it stays on the server.

### Push notification credentials
- **iOS**: EAS creates the APNs key for you during `eas build` (answer "yes" when asked to set up Push Notifications). This needs a paid Apple Developer account.
- **Android**: push goes through Firebase Cloud Messaging (FCM v1):
  1. Create a Firebase project and add an Android app with your package name. Download `google-services.json` into `mobile/`, and add `"googleServicesFile": "./google-services.json"` under `android` in `app.json`.
  2. In Firebase, go to Project settings → Service accounts → **Generate new private key**.
  3. Run `eas credentials`, choose Android → production → **Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1)**, and upload that JSON.

Then sign in to the app as admin, open the Dashboard and turn on **New message alerts**. Send yourself a message from the website's contact form to test.

---

## 4. Build with EAS

| Profile | Use | Command |
|---|---|---|
| `development` | Dev client for local development | `eas build --profile development --platform android` |
| `preview` | Installable test build (Android APK, iOS ad-hoc) | `eas build --profile preview --platform all` |
| `production` | Store builds (Android AAB, iOS IPA) | `eas build --profile production --platform all` |

`production` uses remote version numbers with `autoIncrement`, so each build gets a new `versionCode` / `buildNumber` automatically. When you release a new version, bump `expo.version` in `app.json` (e.g. `1.0.0` → `1.1.0`).

---

## 5. Publish to Google Play

1. Create a [Google Play Console](https://play.google.com/console) developer account (one-time $25 fee).
2. **Create app**: enter the name and default language, choose App/Free, and accept the declarations.
3. Build: `eas build --profile production --platform android` (produces an `.aab`).
4. **The first upload must be manual**: Play Console → your app → Testing → Internal testing → Create release → upload the `.aab` from the EAS build page. Google requires this once before the API can upload.
5. Set up automated submissions:
   - In Google Cloud Console, create a **service account** for your Play Console project and download its JSON key.
   - In Play Console → Users and permissions, invite the service account email and grant **Release** permissions for the app.
   - Save the key as `mobile/google-service-account.json` (it's gitignored). It's referenced in `eas.json` → `submit.production.android`.
6. Future releases: `eas submit --platform android --latest`. This uploads to the **internal** track as a draft (change `track` to `production` in `eas.json` when ready).
7. Complete the store listing: short and full description, at least 2 phone screenshots, a 512×512 icon, a 1024×500 feature graphic, a privacy policy URL, the Data safety form (the app collects name and email via the contact form), content rating and target audience. Then **promote** the release to Production and submit for review.

> New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before production access is granted.

## 6. Publish to the Apple App Store

1. Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Build: `eas build --profile production --platform ios`. EAS signs in to your Apple account and creates the certificates, provisioning profile and push key for you.
3. Submit: `eas submit --platform ios --latest`. On first run EAS can create the app in **App Store Connect** for you. Afterwards, put the numeric **Apple ID** of the app (App Store Connect → App Information) in `eas.json` → `submit.production.ios.ascAppId` so later submissions run non-interactively.
4. The build appears in **TestFlight** after processing (about 5–30 minutes). Test it on your device.
5. In App Store Connect, complete:
   - Screenshots (6.9" and 6.5" iPhone; iPad too because `supportsTablet` is on, or set it to `false`), description, keywords, support URL and privacy policy URL
   - **App Privacy**: declare contact info (name, email) collected via the contact form, not linked to tracking
   - **App Review information**: provide a demo admin login, or explain that admin mode is for the owner only. Reviewers often ask about login-gated features.
6. Choose the build, then **Add for Review**, then **Submit**.

---

## 7. Over-the-air updates

JavaScript-only changes (screens, styles, text) can ship without store review:

```bash
eas update --channel production --message "Fix typo on About"
```

Native changes (new native packages, `app.json` permissions or plugins, icons) need a new `eas build` and store submission. To use OTA updates, first run `npx expo install expo-updates` and rebuild, so the store binary includes the updater.

## Notes

- Public screens filter on `published` / `status = 'published'`, so when you're signed in as admin the public tabs still look exactly like the live site.
- The website caches pages for 60 seconds (ISR), so changes made in the app appear on the website within a minute. Changes made on the website appear in the app on the next pull-to-refresh.
- Security is enforced by the API on the server, not the app. Every admin request is checked against the session stored in MongoDB, so a modified app can't read messages or change content without a valid admin login. The session token is kept in the device's secure keychain (iOS Keychain / Android Keystore) and is revoked on sign-out.
- Uploads are limited to 4 MB. Photos are resized to at most 2000 px and converted to JPEG before upload, so camera photos always fit.
