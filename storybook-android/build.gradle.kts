plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The game itself is the web game in ../game. It is copied into the APK's
// assets at build time, so the APK works fully offline.
val copyGame by tasks.registering(Sync::class) {
    from(rootProject.file("game")) {
        include("index.html", "js/**", "assets/**", "vendor/**", "script/**")
        exclude("**/*.txt", "**/*.md")
    }
    into(layout.buildDirectory.dir("webassets/game"))
}

android {
    namespace = "nz.storystars.storybook"
    compileSdk = 35

    defaultConfig {
        applicationId = "nz.storystars.storybook"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "2.0-sample"
    }

    // A fixed sideloading key, so each build installs over the last one.
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
        noCompress += listOf("ogg", "png", "woff2")
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

tasks.named("preBuild") { dependsOn(copyGame) }
