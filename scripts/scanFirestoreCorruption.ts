import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

// All Firestore collection paths found in the project
const COLLECTION_PATHS = [
  { path: 'places', type: 'collection' },
  { path: 'users', type: 'collection' },
  { path: 'places/{placeId}/comments', type: 'subcollection', parent: 'places' },
  { path: 'users/{userId}/favorites', type: 'subcollection', parent: 'users' },
  { path: 'users/{userId}/visitedPlaces', type: 'subcollection', parent: 'users' },
] as const;

interface ValidationResult {
  path: string;
  issues: string[];
  document: any;
}

const corruptedDocuments: ValidationResult[] = [];

// Check if value is undefined
function hasUndefined(obj: any, path: string = ''): string[] {
  const issues: string[] = [];
  if (obj === undefined) {
    issues.push(`Undefined value at ${path}`);
    return issues;
  }
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value === undefined) {
          issues.push(`Undefined field: ${path ? `${path}.` : ''}${key}`);
        } else if (typeof value === 'object' && value !== null) {
          issues.push(...hasUndefined(value, path ? `${path}.${key}` : key));
        }
      }
    }
  }
  return issues;
}

// Check for null values (except allowed ones)
function hasInvalidNull(obj: any, path: string = ''): string[] {
  const issues: string[] = [];
  const allowedNullFields = ['photoUrl', 'description', 'website', 'phone', 'googleMapsUri'];
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value === null && !allowedNullFields.includes(key)) {
          const fieldPath = path ? `${path}.${key}` : key;
          issues.push(`Unexpected null value at ${fieldPath}`);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...hasInvalidNull(value, path ? `${path}.${key}` : key));
        }
      }
    }
  }
  return issues;
}

// Check timestamp format
function hasInvalidTimestamp(obj: any, path: string = ''): string[] {
  const issues: string[] = [];
  const timestampFields = ['createdAt', 'addedAt', 'timestamp', 'updatedAt'];
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (timestampFields.includes(key)) {
          if (value !== null && !(value instanceof admin.firestore.Timestamp) && !(value instanceof Date)) {
            issues.push(`Invalid timestamp format at ${fieldPath}: ${typeof value}`);
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...hasInvalidTimestamp(value, fieldPath));
        }
      }
    }
  }
  return issues;
}

// Check for mixed data types in arrays
function hasMixedArrayTypes(obj: any, path: string = ''): string[] {
  const issues: string[] = [];
  
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const firstType = typeof obj[0];
      const hasMixed = obj.some((item, index) => {
        const itemType = typeof item;
        if (itemType !== firstType) return true;
        if (item === null && obj[0] !== null) return true;
        if (item !== null && obj[0] === null) return true;
        return false;
      });
      if (hasMixed) {
        issues.push(`Mixed data types in array at ${path}`);
      }
    }
  } else if (typeof obj === 'object' && obj !== null && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (Array.isArray(value)) {
          issues.push(...hasMixedArrayTypes(value, path ? `${path}.${key}` : key));
        } else if (typeof value === 'object' && value !== null) {
          issues.push(...hasMixedArrayTypes(value, path ? `${path}.${key}` : key));
        }
      }
    }
  }
  return issues;
}

// Check for missing required fields based on collection
function hasMissingRequiredFields(docData: any, docPath: string): string[] {
  const issues: string[] = [];
  
  if (docPath.startsWith('places/')) {
    const required = ['name', 'address'];
    for (const field of required) {
      if (!(field in docData) || docData[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    }
  } else if (docPath.includes('/favorites/')) {
    const required = ['placeId', 'placeData'];
    for (const field of required) {
      if (!(field in docData) || docData[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    }
  } else if (docPath.includes('/comments/')) {
    const required = ['userId', 'userDisplayName', 'comment', 'rating'];
    for (const field of required) {
      if (!(field in docData) || docData[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    }
  } else if (docPath.includes('/visitedPlaces/')) {
    const required = ['placeId', 'placeName'];
    for (const field of required) {
      if (!(field in docData) || docData[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    }
  }
  
  return issues;
}

// Validate a single document
function validateDocument(docData: any, docPath: string): string[] {
  const issues: string[] = [];
  
  issues.push(...hasUndefined(docData));
  issues.push(...hasInvalidNull(docData));
  issues.push(...hasInvalidTimestamp(docData));
  issues.push(...hasMixedArrayTypes(docData));
  issues.push(...hasMissingRequiredFields(docData, docPath));
  
  return issues;
}

// Scan a collection
async function scanCollection(collectionPath: string) {
  console.log(`\n🔍 Scanning collection: ${collectionPath}`);
  try {
    const snapshot = await db.collection(collectionPath).get();
    console.log(`   Found ${snapshot.size} documents`);
    
    for (const doc of snapshot.docs) {
      const docPath = `${collectionPath}/${doc.id}`;
      const docData = doc.data();
      const issues = validateDocument(docData, docPath);
      
      if (issues.length > 0) {
        corruptedDocuments.push({
          path: docPath,
          issues,
          document: docData
        });
        console.log(`\n⚠️  POSSIBLE CORRUPTED DOCUMENT FOUND: ${docPath}`);
        console.log(`   Issues:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
    }
  } catch (error) {
    console.error(`   Error scanning ${collectionPath}:`, error);
  }
}

// Scan subcollections recursively
async function scanSubcollections(parentPath: string, subcollectionName: string) {
  console.log(`\n🔍 Scanning subcollection: ${parentPath}/*/${subcollectionName}`);
  try {
    const parentSnapshot = await db.collection(parentPath).get();
    console.log(`   Found ${parentSnapshot.size} parent documents`);
    
    for (const parentDoc of parentSnapshot.docs) {
      const subcollectionPath = `${parentPath}/${parentDoc.id}/${subcollectionName}`;
      try {
        const subSnapshot = await db.collection(subcollectionPath).get();
        console.log(`   Scanning ${subcollectionPath}: ${subSnapshot.size} documents`);
        
        for (const subDoc of subSnapshot.docs) {
          const docPath = `${subcollectionPath}/${subDoc.id}`;
          const docData = subDoc.data();
          const issues = validateDocument(docData, docPath);
          
          if (issues.length > 0) {
            corruptedDocuments.push({
              path: docPath,
              issues,
              document: docData
            });
            console.log(`\n⚠️  POSSIBLE CORRUPTED DOCUMENT FOUND: ${docPath}`);
            console.log(`   Issues:`);
            issues.forEach(issue => console.log(`   - ${issue}`));
          }
        }
      } catch (error) {
        console.error(`   Error scanning ${subcollectionPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`   Error scanning subcollections of ${parentPath}:`, error);
  }
}

// Main scanning function
async function scanAll() {
  console.log("🚀 Starting Firestore corruption scan...\n");
  console.log("📋 Collections to scan:");
  COLLECTION_PATHS.forEach(cp => console.log(`   - ${cp.path}`));
  
  for (const collectionPath of COLLECTION_PATHS) {
    if (collectionPath.type === 'collection') {
      await scanCollection(collectionPath.path);
    } else if (collectionPath.type === 'subcollection' && collectionPath.parent) {
      const subcollectionName = collectionPath.path.split('/').pop() || '';
      await scanSubcollections(collectionPath.parent, subcollectionName);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 SCAN SUMMARY`);
  console.log(`   Total corrupted documents found: ${corruptedDocuments.length}`);
  
  if (corruptedDocuments.length > 0) {
    console.log("\n📝 Corrupted Documents List:");
    corruptedDocuments.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.path}`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    });
  } else {
    console.log("\n✅ No corrupted documents found!");
  }
  
  console.log("\n" + "=".repeat(60));
}

// Run the scan
scanAll()
  .then(() => {
    console.log("\n✅ Scan completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scan failed:", error);
    process.exit(1);
  });

