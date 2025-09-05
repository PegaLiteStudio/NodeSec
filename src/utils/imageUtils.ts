import path from "path";
import fs from "fs";
import mime from "mime-types";
import { Request, Response } from "express";

export const getThemeIcon = (req: Request, res: Response) => {
    try {
        const imageName = req.params.name; // only name, no extension
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

        // Fixed upload path relative to project root
        const uploadPath = path.resolve(process.cwd(), "data/themes/icons");

        let foundImage: string | null = null;

        for (const ext of allowedExtensions) {
            const filePath = path.join(uploadPath, imageName + ext);
            if (fs.existsSync(filePath)) {
                foundImage = path.resolve(filePath);
                break;
            }
        }

        if (!foundImage) {
            return res.status(404).json({ error: "Image not found" });
        }

        // Prevent directory traversal
        if (!foundImage.startsWith(uploadPath)) {
            return res.status(400).json({ error: "Invalid image path" });
        }

        const mimeType = mime.lookup(foundImage) || "application/octet-stream";
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400"); // 1-day cache

        return res.sendFile(foundImage);
    } catch (error) {
        console.error("Error fetching image:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
