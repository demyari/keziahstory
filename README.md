# Keziah's stories

This repository holds two Android apps for a young child:

- **The Magical Storybook** (`storybook/`, `storybook-android/`): an offline, interactive
  choose-your-own-adventure picture book with six worlds, recurring friends who remember past
  stories, letters A–Z, counting to 20 and a Discovery Book. No internet, accounts or API key.
  Download `MagicalStorybook.apk` from the **"The Magical Storybook (latest build)"**
  pre-release on the Releases page. See `storybook/README.md`.
- **Story Stars** (`app/`): the earlier app, where Claude writes stories live (needs an API key). Described below.

---

# Story Stars

A small Android app that makes up picture stories with a young child. Claude writes each page and draws the picture, the phone reads it aloud, and the child picks what happens next by saying it or tapping it.

## Getting the APK

Pushing to `main` on GitHub runs the **Build APK** workflow. When it finishes, open the repo's **Releases** page on the phone, download `StoryStars.apk` and open it to install (Android will ask you to allow installs from your browser).

To build on a computer instead: open the folder in Android Studio, or run `./gradlew assembleRelease` with JDK 17 and the Android SDK installed.

## First run

1. Create an API key at console.anthropic.com. API use is billed separately from a Claude subscription.
2. Open the app, paste the key, tap **Test key**, then **Save**.
3. Allow the microphone when asked.

To get back to the settings later, press and hold the cog on the home screen and answer the sum.

## How it stays child-safe

- The story screen is bundled in the app and cannot load web pages, links or ads. The only internet address the app talks to is `api.anthropic.com`.
- Claude is given fixed rules for a four-year-old audience: gentle, cosy, nothing scary or unsafe, and no questions about personal details.
- What the child says is treated only as a story idea. Anything unsuitable is quietly swapped for something nice.
- Each page is checked on the phone against a word list before it is shown, and asked for again if it fails.
- Drawings are accepted only if they are made of plain shapes. Anything containing scripts, links, text or outside images is thrown away and a placeholder is shown.
- Stories have a fixed length and a calm ending, and there is a stories-per-day limit.
- Settings sit behind a press-and-hold plus a sum.
- The API key is encrypted with the phone's keystore. Nothing is saved from the microphone; speech is turned into text by the phone's own speech service.

For extra lock-down, use Android's **app pinning** so she cannot leave the app.

## Layout

- `app/src/main/assets/index.html`: the whole story screen (look, flow, voice matching).
- `StoryEngine.kt`: the rules given to Claude, the API call, and the safety checks.
- `Voice.kt`: reading aloud and listening.
- `MainActivity.kt`: the app shell and settings storage.
- `KeyVault.kt`: encrypted storage for the API key.

The app has no third-party libraries.
