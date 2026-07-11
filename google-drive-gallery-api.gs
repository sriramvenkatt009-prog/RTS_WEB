const PARENT_FOLDER_ID = "PASTE_GOOGLE_DRIVE_PARENT_FOLDER_ID_HERE";

function doGet() {
  const parent = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const folders = parent.getFolders();
  const galleries = [];

  while (folders.hasNext()) {
    const folder = folders.next();
    const images = getImagesFromFolder(folder);

    if (images.length) {
      galleries.push({
        name: folder.getName(),
        folderId: folder.getId(),
        images,
      });
    }
  }

  galleries.sort((a, b) => a.name.localeCompare(b.name));

  return ContentService
    .createTextOutput(JSON.stringify(galleries))
    .setMimeType(ContentService.MimeType.JSON);
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
