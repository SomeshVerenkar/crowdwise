# Email Setup Instructions for Feedback Notifications

## Current Status
✅ Backend server is running on port 3002
✅ Email configuration is set to: SAMVERENKAR@GMAIL.COM
⚠️ **You need to add your Gmail App Password**

## How to Get Gmail App Password

### Step 1: Enable 2-Factor Authentication (if not already enabled)
1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google", click on "2-Step Verification"
3. Follow the steps to enable it

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Type "CrowdWise India"
4. Click **Generate**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update .env File
1. Open `backend/.env` file
2. Replace `your_app_password_here` with your generated app password (remove spaces)
   ```
   EMAIL_PASS=abcdefghijklmnop
   ```
3. Save the file

### Step 4: Restart Backend Server
1. Stop the current backend server (Ctrl+C in the terminal)
2. Run: `node server-v2.js`
3. You should see: `✅ Email transporter initialized`

## Testing
1. Go to http://localhost:8000
2. Click the feedback button (💬 bottom-right)
3. Fill in description and rating
4. Click Submit
5. Check your email: SAMVERENKAR@GMAIL.COM

## Troubleshooting

### "Email credentials not configured"
- Make sure EMAIL_USER and EMAIL_PASS are set in `.env` file
- Restart the backend server after changes

### "Invalid login"
- Make sure you're using an **App Password**, not your regular Gmail password
- Remove any spaces from the app password
- Make sure 2-Factor Authentication is enabled

### Not receiving emails
- Check spam/junk folder
- Verify the email address is correct: SAMVERENKAR@GMAIL.COM
- Check backend terminal logs for email sending status

## Current Configuration
```
Email Host: smtp.gmail.com
Port: 587
From: CrowdWise India <noreply@crowdwise.in>
To: SAMVERENKAR@GMAIL.COM
```
