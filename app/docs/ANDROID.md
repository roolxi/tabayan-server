# Android and iOS

Both platforms use the same Expo project, routes, components and server client.

## Run the app

```sh
npm ci
npx expo start
```

Expo Go can preview the UI, searches, camera and media selection. Android share
receiving requires an installed native APK because it adds an Android activity.

## Build an Android APK locally

Install Android Studio, its Android SDK and Java 17, then run:

```sh
npx expo prebuild --platform android
npx expo run:android --variant release
```

Or use the Android workflow in GitHub Actions. The APK is in the
Tabayyan-Android-APK artifact. The generated Expo release configuration uses
the development signing key for preview distribution. Configure your own
release keystore before publishing to Google Play.

## Sharing

In YouTube, TikTok or Instagram, share a link and choose تبيّن from the Android
system share sheet. A small native activity converts text sharing into
`tabayyan://handle-share` and launches the existing verification screen.
Text without a link opens text search. File sharing is not registered; images
and videos can be selected using the app's media controls.

Android uses translucent green surfaces and gradients to resemble the iOS
design. Native Apple Liquid Glass remains exclusive to supported Apple devices.
The Android background avoids the continuous full-screen shader. Motion and
result transitions are shared, with existing reduced-motion handling.

## Server

The default API is `https://tabayyan.duckdns.org`. Override it using
`EXPO_PUBLIC_API_BASE_URL` in `.env` or your build environment.
Use HTTPS for a physical Android device. No backend API key belongs in the app.

The existing iOS workflow and shortcut are retained. Build each platform from
this project; no separate copy of the application code is needed.
