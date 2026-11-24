# The Magical Storybook

An offline, interactive choose-your-own-adventure picture book for a four-year-old: six worlds,
recurring friends who remember past stories, letters A–Z, counting to 20, a Discovery Book,
narration, and no internet, accounts, adverts or tracking.

- `storybook/`: the book itself (an offline web app). Start with `storybook/README.md`.
- `storybook-android/`: the Android app that bundles the book and adds the phone's own voice.
- `.github/workflows/storybook.yml`: tests the book, builds `MagicalStorybook.apk` and publishes
  it as the **"The Magical Storybook (latest build)"** pre-release on the Releases page.

## Install on an Android phone

Open the Releases page on the phone, download `MagicalStorybook.apk` from
"The Magical Storybook (latest build)", and open it to install.

## Build locally

`./gradlew :storybook-android:assembleRelease` (JDK 17 and the Android SDK), or run the web
version with `cd storybook && npm start`.

The earlier API-based "Story Stars" app was removed from the tree. It is still in the git
history (commit 979bb62) if it is ever wanted again.
