# 📸 Bardi Camera Screenshot - Manual Steps Guide

## 🎯 Your Exact Workflow

Since the browser automation is now running, here's the step-by-step process:

### ✅ **Step 1: Login (Automated)**
- The browser should already be logged in with your session cookies
- If not, manually enter your credentials

### 🔍 **Step 2: Open "All Devices" Toggle**
1. Look for a toggle/button that says "All Devices" or similar
2. It might be:
   - A dropdown arrow (▼)
   - A toggle switch
   - A button with "All Devices" text
   - An expandable section

### 📹 **Step 3: Click Your Camera Device**
1. After opening "All Devices", you should see your camera listed
2. Look for your camera device (probably named something like "BARDI Smart IP Camera PTZ Indoor Syno")
3. Click on the camera device

### 📺 **Step 4: CCTV Feed Appears**
1. The camera feed should now appear in the main dashboard area
2. You should see the live video feed from your camera

### 📸 **Step 5: Take Screenshot**
1. Look for the camera/screenshot button in the bottom bar
2. Click the camera icon (📷) to take a screenshot
3. The screenshot should download automatically

## 🔍 **Finding the API Endpoint (Important!)**

While following these steps, open DevTools to find the real screenshot API:

1. **Press F12** to open DevTools
2. **Go to Network tab**
3. **Follow the steps above**
4. **When you click the screenshot button**, watch the Network tab for:
   - **New API calls** that appear
   - **Response type**: Look for `image/jpeg`, `image/png`, or `blob`
   - **Response size**: Should be larger (actual image data)
   - **Endpoint URL**: Note the exact URL (e.g., `/api/camera/snapshot`)

## 📋 **What to Look For in Network Tab**

When you click the screenshot button, you should see something like:
```
Request URL: https://ipc.bardi.co.id/api/camera/snapshot
Method: POST (or GET)
Response Type: image/jpeg
Response Size: ~50KB (or larger)
```

## 💡 **If Automation Fails**

The automation script will pause and ask you to:
1. Press ENTER after completing each manual step
2. It will take screenshots automatically
3. Continue to the next step

## 🎉 **Expected Result**

You should end up with:
- ✅ Live camera feed displayed
- ✅ Screenshot downloaded to your computer
- ✅ API endpoint URL noted from DevTools
- ✅ Multiple screenshots saved in `backend/screenshots/` folder

## 📁 **Screenshots Saved**

The automation saves these screenshots:
- `01_after_login.png` - After login
- `02_after_all_devices_click.png` - After opening All Devices
- `03_after_camera_click.png` - After clicking camera
- `04_after_screenshot_click.png` - After taking screenshot

---

**🎊 Once you find the API endpoint URL, we can update the service to call it directly and automate the entire process!**
