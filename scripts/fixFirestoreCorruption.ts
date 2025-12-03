import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

interface CorruptionIssue {
  type: string;
  message: string;
  field?: string;
}

interface CorruptedDocument {
  path: string;
  issues: CorruptionIssue[];
  document: any;
  docRef: admin.firestore.DocumentReference;
}

const corruptedDocs: CorruptedDocument[] = [];

// Required fields for each collection type
const REQUIRED_FIELDS: { [path: string]: string[] } = {
  'places': ['name', 'latitude', 'longitude', 'imageUrl'],
  'places/*/comments': ['userId', 'userDisplayName', 'comment', 'rating'],
  'users/*/favorites': ['placeId', 'placeData'],
  'users/*/visitedPlaces': ['placeId', 'placeName'],
};

// Fields that are allowed to be null
const ALLOWED_NULL_FIELDS: { [path: string]: string[] } = {
  'places': ['description', 'phone', 'website', 'googleMapsUri', 'photoUrl'],
  'places/*/comments': ['photoUrl', 'parentCommentId', 'mentions'],
  'users/*/favorites': [],
  'users/*/visitedPlaces': [],
};

// Timestamp fields that should be Firestore Timestamps
const TIMESTAMP_FIELDS = ['createdAt', 'addedAt', 'timestamp', 'updatedAt', 'visitedAt'];

// Check if document is empty
function isEmptyDocument(docData: any): boolean {
  return !docData || Object.keys(docData).length === 0;
}

// Check for undefined values recursively
function findUndefinedValues(obj: any, path: string = ''): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  
  if (obj === undefined) {
    issues.push({
      type: 'undefined_value',
      message: `Undefined value at root level`,
      field: path || 'root'
    });
    return issues;
  }
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (value === undefined) {
          issues.push({
            type: 'undefined_field',
            message: `Undefined field: ${fieldPath}`,
            field: fieldPath
          });
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...findUndefinedValues(value, fieldPath));
        }
      }
    }
  }
  
  return issues;
}

// Check for invalid null values
function findInvalidNulls(obj: any, collectionPath: string, path: string = ''): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  const allowedNulls = ALLOWED_NULL_FIELDS[collectionPath] || [];
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (value === null && !allowedNulls.includes(key)) {
          issues.push({
            type: 'invalid_null',
            message: `Unexpected null value at ${fieldPath}`,
            field: fieldPath
          });
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...findInvalidNulls(value, collectionPath, fieldPath));
        }
      }
    }
  }
  
  return issues;
}

// Check for invalid timestamps
function findInvalidTimestamps(obj: any, path: string = ''): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (TIMESTAMP_FIELDS.includes(key)) {
          if (value !== null && value !== undefined) {
            if (!(value instanceof admin.firestore.Timestamp) && !(value instanceof Date)) {
              // Check if it's a valid timestamp-like object
              if (typeof value !== 'object' || !('seconds' in value && 'nanoseconds' in value)) {
                issues.push({
                  type: 'invalid_timestamp',
                  message: `Invalid timestamp format at ${fieldPath}: ${typeof value}`,
                  field: fieldPath
                });
              }
            }
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...findInvalidTimestamps(value, fieldPath));
        }
      }
    }
  }
  
  return issues;
}

// Check for wrong data types
function findWrongDataTypes(obj: any, collectionPath: string, path: string = ''): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  
  // Expected types for specific fields
  const expectedTypes: { [key: string]: string } = {
    'latitude': 'number',
    'longitude': 'number',
    'rating': 'number',
    'userRatingCount': 'number',
    'likes': 'number',
    'dislikes': 'number',
  };
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof admin.firestore.Timestamp)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = path ? `${path}.${key}` : key;
        const expectedType = expectedTypes[key];
        
        if (expectedType && value !== null && value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== expectedType) {
            issues.push({
              type: 'wrong_data_type',
              message: `Expected ${expectedType} but got ${actualType} at ${fieldPath}`,
              field: fieldPath
            });
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
          issues.push(...findWrongDataTypes(value, collectionPath, fieldPath));
        }
      }
    }
  }
  
  return issues;
}

// Check for missing required fields
function findMissingRequiredFields(docData: any, collectionPath: string): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  
  // Determine which required fields to check based on path pattern
  let requiredFields: string[] = [];
  
  if (collectionPath.startsWith('places/') && collectionPath.includes('/comments/')) {
    requiredFields = REQUIRED_FIELDS['places/*/comments'];
  } else if (collectionPath.startsWith('users/') && collectionPath.includes('/favorites/')) {
    requiredFields = REQUIRED_FIELDS['users/*/favorites'];
  } else if (collectionPath.startsWith('users/') && collectionPath.includes('/visitedPlaces/')) {
    requiredFields = REQUIRED_FIELDS['users/*/visitedPlaces'];
  } else if (collectionPath.startsWith('places/') && !collectionPath.includes('/comments/')) {
    requiredFields = REQUIRED_FIELDS['places'];
  }
  
  for (const field of requiredFields) {
    if (!(field in docData) || docData[field] === undefined || docData[field] === null) {
      issues.push({
        type: 'missing_required_field',
        message: `Missing required field: ${field}`,
        field: field
      });
    }
  }
  
  return issues;
}

// Validate a single document
function validateDocument(docData: any, docPath: string): CorruptionIssue[] {
  const issues: CorruptionIssue[] = [];
  
  // Check if document is empty
  if (isEmptyDocument(docData)) {
    issues.push({
      type: 'empty_document',
      message: 'Document is empty {}',
      field: 'root'
    });
    return issues; // Return early for empty docs
  }
  
  // Determine collection path pattern for field validation
  let collectionPath = '';
  if (docPath.startsWith('places/')) {
    if (docPath.includes('/comments/')) {
      collectionPath = 'places/*/comments';
    } else {
      collectionPath = 'places';
    }
  } else if (docPath.startsWith('users/')) {
    if (docPath.includes('/favorites/')) {
      collectionPath = 'users/*/favorites';
    } else if (docPath.includes('/visitedPlaces/')) {
      collectionPath = 'users/*/visitedPlaces';
    }
  }
  
  issues.push(...findUndefinedValues(docData));
  issues.push(...findInvalidNulls(docData, collectionPath));
  issues.push(...findInvalidTimestamps(docData));
  issues.push(...findWrongDataTypes(docData, collectionPath));
  issues.push(...findMissingRequiredFields(docData, collectionPath));
  
  return issues;
}

// Scan places collection
async function scanPlaces() {
  console.log('\n🔍 Scanning collection: places');
  try {
    const snapshot = await db.collection('places').get();
    console.log(`   Found ${snapshot.size} documents`);
    
    for (const doc of snapshot.docs) {
      const docPath = `places/${doc.id}`;
      const docData = doc.data();
      const issues = validateDocument(docData, docPath);
      
      if (issues.length > 0) {
        corruptedDocs.push({
          path: docPath,
          issues: issues,
          document: docData,
          docRef: doc.ref
        });
        console.log(`\n⚠️  CORRUPTED DOCUMENT FOUND → PATH: ${docPath}`);
        issues.forEach(issue => {
          console.log(`   - [${issue.type}] ${issue.message}`);
        });
      }
    }
  } catch (error) {
    console.error(`   Error scanning places:`, error);
  }
}

// Scan comments subcollection
async function scanComments() {
  console.log('\n🔍 Scanning subcollection: places/*/comments');
  try {
    const placesSnapshot = await db.collection('places').get();
    console.log(`   Found ${placesSnapshot.size} parent documents`);
    
    for (const placeDoc of placesSnapshot.docs) {
      const commentsRef = db.collection(`places/${placeDoc.id}/comments`);
      try {
        const commentsSnapshot = await commentsRef.get();
        
        for (const commentDoc of commentsSnapshot.docs) {
          const docPath = `places/${placeDoc.id}/comments/${commentDoc.id}`;
          const docData = commentDoc.data();
          const issues = validateDocument(docData, docPath);
          
          if (issues.length > 0) {
            corruptedDocs.push({
              path: docPath,
              issues: issues,
              document: docData,
              docRef: commentDoc.ref
            });
            console.log(`\n⚠️  CORRUPTED DOCUMENT FOUND → PATH: ${docPath}`);
            issues.forEach(issue => {
              console.log(`   - [${issue.type}] ${issue.message}`);
            });
          }
        }
      } catch (error) {
        console.error(`   Error scanning comments for place ${placeDoc.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`   Error scanning comments:`, error);
  }
}

// Scan user favorites
async function scanFavorites() {
  console.log('\n🔍 Scanning subcollection: users/*/favorites');
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`   Found ${usersSnapshot.size} user documents`);
    
    for (const userDoc of usersSnapshot.docs) {
      const favoritesRef = db.collection(`users/${userDoc.id}/favorites`);
      try {
        const favoritesSnapshot = await favoritesRef.get();
        
        for (const favoriteDoc of favoritesSnapshot.docs) {
          const docPath = `users/${userDoc.id}/favorites/${favoriteDoc.id}`;
          const docData = favoriteDoc.data();
          const issues = validateDocument(docData, docPath);
          
          if (issues.length > 0) {
            corruptedDocs.push({
              path: docPath,
              issues: issues,
              document: docData,
              docRef: favoriteDoc.ref
            });
            console.log(`\n⚠️  CORRUPTED DOCUMENT FOUND → PATH: ${docPath}`);
            issues.forEach(issue => {
              console.log(`   - [${issue.type}] ${issue.message}`);
            });
          }
        }
      } catch (error) {
        console.error(`   Error scanning favorites for user ${userDoc.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`   Error scanning favorites:`, error);
  }
}

// Scan visited places
async function scanVisitedPlaces() {
  console.log('\n🔍 Scanning subcollection: users/*/visitedPlaces');
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`   Found ${usersSnapshot.size} user documents`);
    
    for (const userDoc of usersSnapshot.docs) {
      const visitedRef = db.collection(`users/${userDoc.id}/visitedPlaces`);
      try {
        const visitedSnapshot = await visitedRef.get();
        
        for (const visitedDoc of visitedSnapshot.docs) {
          const docPath = `users/${userDoc.id}/visitedPlaces/${visitedDoc.id}`;
          const docData = visitedDoc.data();
          const issues = validateDocument(docData, docPath);
          
          if (issues.length > 0) {
            corruptedDocs.push({
              path: docPath,
              issues: issues,
              document: docData,
              docRef: visitedDoc.ref
            });
            console.log(`\n⚠️  CORRUPTED DOCUMENT FOUND → PATH: ${docPath}`);
            issues.forEach(issue => {
              console.log(`   - [${issue.type}] ${issue.message}`);
            });
          }
        }
      } catch (error) {
        console.error(`   Error scanning visitedPlaces for user ${userDoc.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`   Error scanning visitedPlaces:`, error);
  }
}

// Delete corrupted documents safely
async function deleteCorruptedDocuments() {
  console.log('\n🗑️  Starting safe deletion of corrupted documents...\n');
  
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const result of corruptedDocs) {
    try {
      // Verify document still exists before deletion
      const docSnapshot = await result.docRef.get();
      if (!docSnapshot.exists) {
        console.log(`⚠️  Document already deleted: ${result.path}`);
        continue;
      }
      
      await result.docRef.delete();
      console.log(`✅ Deleted: ${result.path}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to delete ${result.path}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 DELETION SUMMARY');
  console.log(`   Total corrupted documents: ${corruptedDocs.length}`);
  console.log(`   Successfully deleted: ${deletedCount}`);
  console.log(`   Failed to delete: ${errorCount}`);
  console.log('\n' + '='.repeat(60));
}

// Main scanning and fixing function
async function scanAndFix() {
  console.log('🚀 Starting Firestore corruption scan and fix...\n');
  console.log('⚠️  WARNING: This script will DELETE corrupted documents!');
  console.log('📋 Collections to scan:');
  console.log('   - places');
  console.log('   - places/*/comments');
  console.log('   - users/*/favorites');
  console.log('   - users/*/visitedPlaces');
  
  await scanPlaces();
  await scanComments();
  await scanFavorites();
  await scanVisitedPlaces();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SCAN SUMMARY');
  console.log(`   Total corrupted documents found: ${corruptedDocs.length}`);
  
  if (corruptedDocs.length > 0) {
    console.log('\n📝 Corrupted Documents List:');
    corruptedDocs.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.path}`);
      result.issues.forEach(issue => {
        console.log(`   - [${issue.type}] ${issue.message}`);
      });
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n⚠️  Proceeding to delete corrupted documents...');
    await deleteCorruptedDocuments();
  } else {
    console.log('\n✅ No corrupted documents found!');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the scan and fix
scanAndFix()
  .then(() => {
    console.log('\n✅ Process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });
