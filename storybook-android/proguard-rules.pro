# The storybook page calls these methods by name.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
