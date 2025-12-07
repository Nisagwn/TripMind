import admin from 'firebase-admin';
import axios from 'axios';
import mime from 'mime-types';

/**
 * Upload image from URL to Firebase Storage
 * @returns Public download URL or null if failed
 */
export async function uploadImageToFirebase(
    imageUrl: string,
    fileName: string
): Promise<string | null> {
    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(`places/${fileName}`);

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

        // Determine extension if needed, but we'll try to keep original name or use jpg
        // Ideally we should detect extension from content-type
        let extension = mime.extension(contentType) || 'jpg';
        if (extension === 'jpeg') extension = 'jpg';

        const fullFileName = `places/${fileName}.${extension}`;
        const firebaseFile = bucket.file(fullFileName);

        await firebaseFile.save(buffer, {
            metadata: {
                contentType: contentType,
            },
            public: true, // Make public for easy access
        });

        // Generate public URL
        // Method 1: Signed URL (expires) - NOT IDEAL for this use case
        // Method 2: Public Download URL (persistent)
        // Format: https://storage.googleapis.com/BUCKET_NAME/PATH
        // OR: https://firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o/PATH?alt=media

        // For public files via save({ public: true }), we can use the publicUrl() method or construct it.
        // publicUrl() returns https://storage.googleapis.com/BUCKET_NAME/KEY

        const publicUrl = firebaseFile.publicUrl();

        console.log(`✅ Uploaded to Firebase: ${fullFileName}`);
        return publicUrl;

    } catch (error: any) {
        console.error(`❌ Firebase Storage upload failed for ${fileName}:`, error.message);
        return null;
    }
}

/**
 * Upload multiple images and return array of URLs
 */
export async function uploadImagesToFirebase(
    imageUrls: string[],
    placeId: string
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    // Ensure bucket exists/is configured
    try {
        if (!admin.storage().bucket().name) {
            console.error("❌ Firebase Storage bucket not configured!");
            return [];
        }
    } catch (e) {
        console.error("❌ Error accessing storage bucket:", e);
        return [];
    }

    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const fileName = `${placeId}_${i}`;

        const uploadedUrl = await uploadImageToFirebase(url, fileName);
        if (uploadedUrl) {
            uploadedUrls.push(uploadedUrl);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return uploadedUrls;
}
