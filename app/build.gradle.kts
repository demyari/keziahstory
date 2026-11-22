plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "nz.storystars.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "nz.storystars.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1"
    }

    // A fixed key so every build can install over the last one.
    // It is only for sideloading; it is not a Play Store key.
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
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("sideload")
        }
        debug {
            signingConfig = signingConfigs.getByName("sideload")
        }
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

// No libraries: the app uses only what Android already ships.
