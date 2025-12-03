# Firestore Debug Scripts

Two specialized scripts for detecting and fixing corrupted documents in your Firestore database.

## Scripts

### 1. `debugFirestore.ts` - Scanner Only (Read-Only)

**Purpose:** Scans Firestore collections and reports corrupted documents without making any changes.

**Usage:**
```bash
npx tsx scripts/debugFirestore.ts
```

**Collections Scanned:**
- `places` - Main places collection
- `places/*/comments` - Comments subcollection under each place
- `users/*/favorites` - User favorites subcollection
- `users/*/visitedPlaces` - User visited places subcollection

**What it Detects:**
- ✅ **Missing Required Fields:**
  - `places`: `name`, `latitude`, `longitude`, `imageUrl`
  - `places/*/comments`: `userId`, `userDisplayName`, `comment`, `rating`
  - `users/*/favorites`: `placeId`, `placeData`
  - `users/*/visitedPlaces`: `placeId`, `placeName`
- ✅ **Undefined Values** - Any field with `undefined` value
- ✅ **Invalid Null Values** - Null values in fields that shouldn't be null
- ✅ **Invalid Timestamps** - Timestamp fields with wrong format
- ✅ **Wrong Data Types** - Fields with incorrect data types (e.g., string instead of number)
- ✅ **Empty Documents** - Documents that are empty `{}`
- ✅ **Partially Deleted Subdocuments** - Subcollections with missing parent data

**Output Format:**
```
⚠️  CORRUPTED DOCUMENT FOUND → PATH: places/abc123
   - [missing_required_field] Missing required field: latitude
   - [undefined_field] Undefined field: description
   - [invalid_timestamp] Invalid timestamp format at createdAt: string
```

### 2. `fixFirestoreCorruption.ts` - Scanner + Auto-Fix (Deletes Corrupted Documents)

**Purpose:** Scans all Firestore collections and automatically deletes corrupted documents.

**⚠️ WARNING:** This script will DELETE corrupted documents permanently!

**Usage:**
```bash
npx tsx scripts/fixFirestoreCorruption.ts
```

**What it does:**
1. Scans all collections (same as debug script)
2. Identifies corrupted documents
3. **Automatically deletes** all corrupted documents found
4. Verifies document exists before deletion
5. Reports deletion results

**Safety Features:**
- Verifies document exists before deletion
- Handles errors gracefully
- Reports success/failure for each deletion
- Provides summary statistics

## Required Fields by Collection

### Places (`places`)
- `name` (string)
- `latitude` (number)
- `longitude` (number)
- `imageUrl` (string)

### Comments (`places/*/comments`)
- `userId` (string)
- `userDisplayName` (string)
- `comment` (string)
- `rating` (number)

### Favorites (`users/*/favorites`)
- `placeId` (string)
- `placeData` (object)

### Visited Places (`users/*/visitedPlaces`)
- `placeId` (string)
- `placeName` (string)

## Allowed Null Fields

Some fields are allowed to be `null`:
- **Places**: `description`, `phone`, `website`, `googleMapsUri`, `photoUrl`
- **Comments**: `photoUrl`, `parentCommentId`, `mentions`
- **Favorites**: None (all fields required)
- **Visited Places**: None (all fields required)

## Timestamp Fields

These fields should be Firestore Timestamps:
- `createdAt`
- `addedAt`
- `timestamp`
- `updatedAt`
- `visitedAt`

## Recommended Workflow

1. **First, run the debug scanner:**
   ```bash
   npx tsx scripts/debugFirestore.ts
   ```

2. **Review the output** to see what would be deleted

3. **If you want to proceed with deletion, run the fixer:**
   ```bash
   npx tsx scripts/fixFirestoreCorruption.ts
   ```

## Example Output

### Scanner Output:
```
🚀 Starting Firestore corruption debug scan...

🔍 Scanning collection: places
   Found 150 documents

⚠️  CORRUPTED DOCUMENT FOUND → PATH: places/abc123
   - [missing_required_field] Missing required field: latitude
   - [undefined_field] Undefined field: description

📊 SCAN SUMMARY
   Total corrupted documents found: 3
```

### Fixer Output:
```
🚀 Starting Firestore corruption scan and fix...

⚠️  WARNING: This script will DELETE corrupted documents!

🔍 Scanning collection: places
   Found 150 documents

⚠️  CORRUPTED DOCUMENT FOUND → PATH: places/abc123
   - [missing_required_field] Missing required field: latitude

📊 SCAN SUMMARY
   Total corrupted documents found: 3

⚠️  Proceeding to delete corrupted documents...

✅ Deleted: places/abc123
✅ Deleted: places/def456
❌ Failed to delete: places/ghi789: Document not found

📊 DELETION SUMMARY
   Total corrupted documents: 3
   Successfully deleted: 2
   Failed to delete: 1
```

## Requirements

- Node.js environment
- Firebase Admin SDK initialized
- `serviceAccountKey.json` file in project root
- TypeScript support (`tsx` package)

## Notes

- The scripts use Firebase Admin SDK, which bypasses security rules
- Documents are deleted permanently - there's no undo
- Always backup your database before running the fixer script
- The scanner is safe to run multiple times
- The fixer verifies document existence before deletion to prevent errors

