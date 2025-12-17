# 📝 Idea Inbox PWA

A high-performance, mobile-first Progressive Web App to capture ideas and sync them to **Obsidian** using Gemini AI.

## 🚀 Step 1: Push to GitHub (For Mac/Linux)

If you already created the repo and are getting errors, follow these steps exactly:

1. **Open Terminal** and `cd` into your project folder.
2. **Remove old remote (if needed)**:
   ```bash
   git remote remove origin
   ```
3. **Add your real GitHub URL** (Replace `USERNAME` and `REPO` with yours):
   ```bash
   git remote add origin https://github.com/USERNAME/REPO.git
   ```
4. **Final Push (Force)**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main --force
   ```
   *Note: Using `--force` solves the "failed to push some refs" error by making your local files the master copy.*

## 🚀 Step 2: Go Live (GitHub Pages)

1. Go to your repository on GitHub.com.
2. Click **Settings** (top tab).
3. Click **Pages** (left sidebar).
4. Under **Branch**, select `main` and `/ (root)`.
5. Click **Save**.
6. Wait 1-2 minutes, then refresh that page to see your live URL!

## 🧪 Local Testing on Mac

1. Open Terminal in your folder.
2. Run: `npx serve .`
3. It will show a **Network URL** (e.g., `http://192.168.1.5:3000`).
4. Open that URL on your Android phone's Chrome browser.

## 📱 Installation

1. Open your Live URL in Chrome on Android.
2. Tap the **three dots (⋮)** -> **Install app**.
3. It now works like a real app on your home screen!

## 🛠 Configuration
- Open the app, tap the **Gear icon**.
- Enter your **Obsidian Vault Name** (e.g., `MyVault`).
- Now, when you tap "Open in Obsidian", it will jump straight into your notes.
