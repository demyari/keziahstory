plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The book itself is the web app in ../storybook. It is copied into the APK's
// assets at build time, so the APK works fully offline.
val copyStorybook by tasks.registering(Sync::class) {
    from(rootProject.file("storybook")) {
        include("index.html", "manifest.webmanifest", "asset-list.json", "css/**", "js/**", "assets/**")
        exclude("assets/**/manifest.json", "**/*.txt")
    }
    into(layout.buildDirectory.dir("webassets/storybook"))
}

android {
    namespace = "nz.storystars.storybook"
    compileSdk = 35

    defaultConfig {
        applicationId = "nz.storystars.storybook"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    // Same sideloading key as the other app, so updates install over the last build.
    signingConfigs {
        create("sideload") {
            storeFile = rootProject.file("sideload.keystore")
            storePassword = "storystars"
            keyAlias = "storystars"
            keyPassword = "storystars"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("sideload")
        }
        debug {
            signingConfig = signingConfigs.getByName("sideload")
        }
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("webassets"))

    androidResources {
        // keep Ogg clips and WebP pictures uncompressed-friendly
        noCompress += listOf("ogg", "webp", "woff2")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}

kotlin {
    jvmToolchain(17)
}

tasks.named("preBuild") { dependsOn(copyStorybook) }
