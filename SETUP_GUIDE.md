# Setup Guide — Team Attendance Tracker (Google Sheets Backend)

## How it works
- **index.html** is hosted on GitHub Pages (your public URL)
- **Code.gs** runs inside Google Apps Script — it reads/writes your Google Sheet
- The dashboard calls the Apps Script URL via `fetch()` — works from anywhere

---

## Step 1 — Prepare your Google Sheet

Open your existing Google Sheet and make sure it has these 4 tabs with exact headers:

| Tab name | Headers (row 1) |
|----------|----------------|
| **Members** | `Name` `Team` |
| **Attendance** | `Date` `Name` `Team` `Status` `Mode` `Time` |
| **Requests** | `ID` `Name` `Team` `Type` `Subtype` `From` `To` `Date` `Hours` `Reason` `Status` `SubmittedOn` |
| **Config** | `Key` `Value` |

**Shortcut:** Paste `Code.gs` into Apps Script first and run `setupSheets()` — it creates all tabs and headers automatically.

Add your team to the **Members** tab:
- Column A: Full name (e.g. `Priya Sharma`)
- Column B: Team (`VQC` or `Enrichment`)

Add this row to the **Config** tab:
- A2: `admin_password`
- B2: `admin123` (change to your own password)

---

## Step 2 — Set up Google Apps Script

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Delete all existing code in `Code.gs`
4. Copy the entire contents of `Code.gs` from this repo and paste it
5. Click **Save** (Ctrl+S)

---

## Step 3 — Run setupSheets (optional but recommended)

1. In Apps Script, select function `setupSheets` from the dropdown
2. Click **Run**
3. Approve permissions when prompted
4. You'll see an alert: "Sheets setup complete!"

---

## Step 4 — Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Type" → select **Web app**
3. Fill in:
   - Description: `Attendance Tracker v1`
   - **Execute as: Me**
   - **Who has access: Anyone** ← this is important
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. **Copy the Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycby.../exec`

---

## Step 5 — Add the URL to index.html

1. Open `index.html` from this repo in any text editor
2. Find this line near the top (around line 5 of the `<script>` block):
   ```javascript
   var SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `PASTE_YOUR_APPS_SCRIPT_URL_HERE` with your Web app URL:
   ```javascript
   var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
4. Save the file

---

## Step 6 — Push updated index.html to GitHub

1. Go to **https://github.com/roshanraj-sys/attendance-tracker**
2. Click `index.html` → click the **pencil icon ✏️**
3. Select all → Delete → Paste your updated `index.html`
4. Click **Commit changes**

GitHub Pages updates within ~1 minute.

---

## Step 7 — Test it

Open: **https://roshanraj-sys.github.io/attendance-tracker**

- The yellow banner should be gone
- Your team members should appear in the dropdown
- Select a name → click "Mark Me Present" → check your Google Sheet — a new row should appear in the Attendance tab

---

## Updating the deployment (when you change Code.gs)

Whenever you modify `Code.gs`, you must create a **new deployment**:

1. Apps Script → **Deploy → Manage deployments**
2. Click **Edit (pencil)** on your active deployment
3. Change version to **"New version"**
4. Click **Deploy**
5. The URL stays the same — no need to update `index.html`

---

## Admin password

Default: `admin123`

To change: edit the Config tab in your Google Sheet → change the value in row 2, column B.

---

## URLs

| | URL |
|--|--|
| **Live dashboard** | https://roshanraj-sys.github.io/attendance-tracker |
| **GitHub repo** | https://github.com/roshanraj-sys/attendance-tracker |
| **Google Sheet** | (your existing sheet) |
| **Apps Script** | Extensions → Apps Script from the sheet |
