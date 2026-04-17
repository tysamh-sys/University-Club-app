const crypto = require("crypto");
const fs = require("fs");

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = process.env.AES_SECRET_KEY || crypto.randomBytes(32); // In prod, keep in .env

// Helper to ensure key is exactly 32 bytes
const getKey = () => {
    if (typeof SECRET_KEY === 'string') {
        const hash = crypto.createHash('sha256');
        hash.update(SECRET_KEY);
        return hash.digest();
    }
    return SECRET_KEY;
};

const encryptFileStream = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);

        input.pipe(cipher).pipe(output);

        output.on('finish', () => {
            const authTag = cipher.getAuthTag();
            resolve({
                iv: iv.toString("hex"),
                authTag: authTag.toString("hex")
            });
        });

        output.on('error', reject);
        input.on('error', reject);
        cipher.on('error', reject);
    });
};

const decryptFileStream = (inputPath, res, ivHex, authTagHex) => {
    return new Promise((resolve, reject) => {
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(authTag);

        const input = fs.createReadStream(inputPath);

        input.pipe(decipher).pipe(res);

        res.on('finish', resolve);
        res.on('error', reject);
        input.on('error', reject);
        decipher.on('error', reject);
    });
};

module.exports = {
    encryptFileStream,
    decryptFileStream
};
