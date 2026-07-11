# Google Drive Gallery Setup

This website can automatically create scrolling sections from Google Drive folder names.

## 1. Create Drive Folders

Create one parent folder in Google Drive, for example:

`Robotic Tech Website Images`

Inside that parent folder, create any folders you want:

- Collaborations
- Projects
- Candidates
- Events
- Workshops

Each subfolder becomes one scrolling website section automatically.

## 2. Add Images

Upload image files into each subfolder. Supported formats:

- JPG / JPEG
- PNG
- GIF
- WEBP

## 3. Create Apps Script API

Open:

`https://script.google.com/`

Create a new project and paste the contents of:

`google-drive-gallery-api.gs`

Replace:

`PASTE_GOOGLE_DRIVE_PARENT_FOLDER_ID_HERE`

with your Google Drive parent folder ID.

Example Drive folder URL:

`https://drive.google.com/drive/folders/ABC123XYZ`

Folder ID:

`ABC123XYZ`

## 4. Deploy Apps Script

In Apps Script:

1. Click `Deploy`
2. Click `New deployment`
3. Select type: `Web app`
4. Execute as: `Me`
5. Who has access: `Anyone`
6. Deploy
7. Copy the Web App URL

## 5. Connect Website

Open `script.js` and paste your Web App URL here:

```js
const driveConfig = {
  apiUrl: "PASTE_WEB_APP_URL_HERE",
};
```

After that, the website will load sections from Google Drive. If the URL is empty, it uses the local test folders.
