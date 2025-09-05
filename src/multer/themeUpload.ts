import multer from "multer";
import path from "path";
import fs from "fs";

// Upload a path for theme icons
const uploadPath = path.join(__dirname, "../../data/themes/icons");

// Ensure folder exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {

        let tempFilename = file.originalname;
        let type = tempFilename.substring(tempFilename.lastIndexOf(".") + 1);
        let fileName = req.body.themeID.replaceAll("\"", "") + "." + type;

        let counter = 1;

        // Check until a free filename is found
        while (fs.existsSync(path.join(uploadPath, fileName))) {
            fileName = req.body.themeID.replaceAll("\"", "") + "-" + counter + "." + type;
            req.body.isError = true;
            req.body.errorFilePath = path.join(uploadPath, fileName);
            counter++;
        }
        cb(null, fileName);
    }
});

// Export ready-to-use multer instance
export const themeUpload = multer({storage});
