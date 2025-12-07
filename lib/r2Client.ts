import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tripmind-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Download image from URL and upload to R2
 * @returns R2 public URL or null if failed
 */
export async function uploadImageToR2(
    imageUrl: string,
    fileName: string
): Promise<string | null> {
    try {
        // Download image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'TripMind/1.0'
            }
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // Determine file extension
        let extension = 'jpg';
        if (contentType.includes('png')) extension = 'png';
        else if (contentType.includes('webp')) extension = 'webp';
        else if (contentType.includes('gif')) extension = 'gif';

        const fullFileName = `places/${fileName}.${extension}`;

        // Upload to R2
        await r2Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fullFileName,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000', // 1 year cache
        }));

        // Return public URL
        const publicUrl = `${PUBLIC_URL}/${fullFileName}`;
        console.log(`✅ Uploaded: ${fullFileName}`);
        return publicUrl;

    } catch (error: any) {
        console.error(`❌ R2 upload failed for ${fileName}:`, error.message);
        return null;
    }
}

/**
 * Upload multiple images and return array of URLs
 */
export async function uploadImagesToR2(
    imageUrls: string[],
    placeId: string
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const fileName = `${placeId}_${i}`;

        const uploadedUrl = await uploadImageToR2(url, fileName);
        if (uploadedUrl) {
            uploadedUrls.push(uploadedUrl);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return uploadedUrls;
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
    return !!(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME &&
        process.env.R2_PUBLIC_URL
    );
}
