const PARENT_FOLDER_ID = "PASTE_GOOGLE_DRIVE_PARENT_FOLDER_ID_HERE";

function doGet(event) {
  const parent = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const galleries = [];
  collectGalleries(parent, galleries, "");

  galleries.sort((a, b) => a.name.localeCompare(b.name));
  const output = JSON.stringify(galleries);
  const callback = event && event.parameter && String(event.parameter.callback || "").replace(/[^\w.$]/g, "");

  return ContentService.createTextOutput(callback ? `${callback}(${output});` : output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

// Reads all nested subfolders, not just the first level below the parent folder.
function collectGalleries(parentFolder, galleries, parentPath) {
  const folders = parentFolder.getFolders();

  while (folders.hasNext()) {
    const folder = folders.next();
    const folderPath = parentPath ? `${parentPath} / ${folder.getName()}` : folder.getName();
    const images = getImagesFromFolder(folder);

    if (images.length) {
      galleries.push({
        name: folderPath,
        folderId: folder.getId(),
        images,
      });
    }

    collectGalleries(folder, galleries, folderPath);
  }
}

function getImagesFromFolder(folder) {
  const files = folder.getFiles();
  const images = [];

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();

    if (mimeType.startsWith("image/")) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      images.push(`https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1600`);
    }
  }

  return images;
}
