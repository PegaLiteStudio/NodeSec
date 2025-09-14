import multer from "multer";
import path from "path";
import fs from "fs";

// Upload a path for theme icons
const uploadPath = path.join(__dirname, "../../data/agents/");

// Ensure folder exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        let tempFilename = file.originalname;
        let type = tempFilename.substring(tempFilename.lastIndexOf(".") + 1);
        let fileName = req.body.username + "." + type;
        cb(null, fileName);
    }
});

export const agentAppUpload = multer({storage});
