import multer from "multer";
import path from "path";
import fs from "fs";

// Upload a path for theme icons
const uploadPath = path.join(__dirname, "../../data/themes/");

// Ensure folder exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        let upPath;
        if (file.fieldname === "themeIcon") {
            upPath = uploadPath + "icons";
        } else if (file.fieldname === "screenshots") {
            upPath = uploadPath + "screenshots";
        } else {
            upPath = uploadPath + "resources";
        }
        cb(null, upPath);
    },
    filename: (req, file, cb) => {
        let upPath;
        if (file.fieldname === "screenshots") {
            cb(null, file.originalname);
            return;
        } else if (file.fieldname === "themeIcon") {
            upPath = uploadPath + "icons";
        } else {
            upPath = uploadPath + "resources";
        }
        let tempFilename = file.originalname;
        let type = tempFilename.substring(tempFilename.lastIndexOf(".") + 1);
        let fileName = req.body.themeID + "." + type;

        let counter = 1;

        // Check until a free filename is found
        while (fs.existsSync(path.join(upPath, fileName))) {
            fileName = req.body.themeID + "-" + counter + "." + type;
            req.body.isError = true;
            req.body.errorFilePath = path.join(upPath, fileName);
            counter++;
        }
        cb(null, fileName);
    }
});

// Export ready-to-use multer instance
export const themeUpload = multer({storage});
