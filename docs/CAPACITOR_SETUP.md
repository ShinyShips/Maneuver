# Capacitor Setup Guide for Maneuver

This guide walks through converting Maneuver from a PWA to a native Android app using Capacitor.

## Prerequisites

### Required Software
1. **Node.js** - Already installed ✓
2. **Android Studio** - Download from https://developer.android.com/studio
   - Install Android SDK (API 33 or higher recommended)
   - Install Android SDK Build-Tools
   - Install Android Emulator (optional, for testing)
3. **Java JDK** - Version 11 or higher
   - Download from https://adoptium.net/

### Verify Prerequisites
```bash
node --version  # Should be v18+
java --version  # Should be 11+
```

## Step 1: Initialize Capacitor (5 minutes)

### 1.1 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
```

### 1.2 Initialize Configuration
```bash
npx cap init "Maneuver" "com.shinyships.maneuver"
```

This creates:
- `capacitor.config.ts` - Main configuration file
- Sets app name as "Maneuver"
- Sets package ID as "com.shinyships.maneuver"

### 1.3 Add Android Platform
```bash
npm install @capacitor/android
npx cap add android
```

This creates an `android/` folder with the native Android project.

## Step 2: Configure Capacitor (10 minutes)

### 2.1 Update capacitor.config.ts

The config file should look like this:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shinyships.maneuver',
  appName: 'Maneuver',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e293b",
      showSpinner: false
    }
  }
};

export default config;
```

Key points:
- `webDir: 'dist'` - Vite outputs to dist folder
- `androidScheme: 'https'` - Required for modern web APIs
- SplashScreen configured with your app's dark theme

### 2.2 Update package.json scripts

Add these scripts:
```json
{
  "scripts": {
    "cap:sync": "cap sync",
    "cap:open:android": "cap open android",
    "cap:run:android": "cap run android",
    "build:android": "npm run build && cap sync && cap open android"
  }
}
```

## Step 3: Build and Test (30 minutes)

### 3.1 Build Web Assets
```bash
npm run build
```

This creates the `dist/` folder with your compiled app.

### 3.2 Sync to Android
```bash
npx cap sync
```

This copies web assets to the Android project and updates native dependencies.

### 3.3 Open in Android Studio
```bash
npx cap open android
```

This launches Android Studio with your project.

### 3.4 First Build in Android Studio

1. **Wait for Gradle sync** - First time takes 5-10 minutes
2. **Connect device or start emulator**
   - Physical device: Enable USB debugging in Developer Options
   - Emulator: Create AVD (Android Virtual Device) in Device Manager
3. **Click "Run" (green play button)**
4. **App installs and launches!**

## Step 4: Test PWA Features Work

Your existing PWA features should work:
- ✅ Service Worker (offline functionality)
- ✅ IndexedDB (Dexie database)
- ✅ Local Storage
- ✅ All existing pages and features

Test checklist:
- [ ] App launches successfully
- [ ] Can scout a match
- [ ] Data persists after closing app
- [ ] QR code scanning works
- [ ] All navigation works

## Step 5: Add Splash Screen (Optional, 15 minutes)

### 5.1 Install Splash Screen Plugin
```bash
npm install @capacitor/splash-screen
```

### 5.2 Add Splash Screen Assets

Place splash screen images in `android/app/src/main/res/`:
- `drawable/splash.png` - Default
- `drawable-land/splash.png` - Landscape
- `drawable-port/splash.png` - Portrait

Use your Maneuver logo with the dark background (#1e293b).

### 5.3 Update Android Theme

Edit `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
    <item name="android:background">@drawable/splash</item>
</style>
```

## Step 6: Configure App Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Required permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
                 android:maxSdkVersion="32" />

<!-- For future Bluetooth LE -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Step 7: Build Release APK (30 minutes)

### 7.1 Generate Signing Key
```bash
cd android
./gradlew assembleRelease
```

### 7.2 Sign APK

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Choose APK
3. Create new keystore (save password!)
4. Build release APK

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Common Issues & Solutions

### Issue: Gradle Sync Failed
**Solution:** Update Android Gradle Plugin in `android/build.gradle`
```gradle
dependencies {
    classpath 'com.android.tools.build:gradle:8.1.0'
}
```

### Issue: App crashes on launch
**Solution:** Check logs in Android Studio Logcat. Usually missing permissions or incorrect webDir.

### Issue: White screen on launch
**Solution:** 
1. Verify `dist/` folder exists and has files
2. Run `npx cap sync` again
3. Clear app data and reinstall

### Issue: Camera/QR scanner doesn't work
**Solution:** 
1. Add CAMERA permission to AndroidManifest.xml
2. Request permission at runtime (Capacitor handles this)

## Development Workflow

### Daily development:
```bash
npm run dev  # Develop in browser as PWA
```

### Test on device:
```bash
npm run build
npx cap sync
npx cap run android  # Builds and runs on connected device
```

### Full rebuild:
```bash
npm run build:android  # Builds web + syncs + opens Android Studio
```

## Next Steps: Bluetooth LE

Once Capacitor is working, you can add Bluetooth LE:

1. Install plugin: `npm install @capacitor-community/bluetooth-le`
2. Create BluetoothContext (similar to WebRTCContext)
3. Implement BLE discovery and connection
4. Add data transfer protocol

See `BLUETOOTH_IMPLEMENTATION.md` for detailed guide.

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [Capacitor Community Plugins](https://github.com/capacitor-community)
- [Bluetooth LE Plugin](https://github.com/capacitor-community/bluetooth-le)

## Troubleshooting

For help:
1. Check Android Studio Logcat for errors
2. Run `npx cap doctor` to diagnose issues
3. Check Capacitor Discord: https://discord.gg/UPYYRhtyzp
