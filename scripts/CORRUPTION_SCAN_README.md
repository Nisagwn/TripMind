# Firestore Corruption Scanner Scripts

Two scripts for detecting and fixing corrupted documents in Firestore.

## Scripts

### 1. `scanFirestoreCorruption.ts` - Scanner Only (Read-Only)

**Purpose:** Scans all Firestore collections and reports corrupted documents without making any changes.

**Usage:**
```bash
npx tsx scripts/scanFirestoreCorruption.ts
```

**What it checks:**
- ✅ Documents with `undefined` values
- ✅ Documents with unexpected `null` values (except allowed fields like `photoUrl`, `description`)
- ✅ Documents with invalid timestamp formats
- ✅ Documents with mixed data types in arrays
- ✅ Documents with missing required fields:
  - `places/*`: requires `name`, `address`
  - `users/*/favorites/*`: requires `placeId`, `placeData`
  - `places/*/comments/*`: requires `userId`, `userDisplayName`, `comment`, `rating`
  - `users/*/visitedPlaces/*`: requires `placeId`, `placeName`

**Output:**
- Lists all corrupted documents with their paths
- Shows specific issues for each document
- Provides a summary count

### 2. `fixFirestoreCorruption.ts` - Scanner + Auto-Fix (Deletes Corrupted Documents)

**Purpose:** Scans all Firestore collections and automatically deletes corrupted documents.

**⚠️ WARNING:** This script will DELETE corrupted documents permanently!

**Usage:**
```bash
npx tsx scripts/fixFirestoreCorruption.ts
```

**What it does:**
1. Scans all collections (same as scanner)
2. Identifies corrupted documents
3. **Automatically deletes** all corrupted documents found
4. Reports deletion results

## Collections Scanned

The scripts scan the following Firestore paths:

1. `places` - Main places collection
2. `users` - Users collection
3. `places/{placeId}/comments` - Comments subcollection
4. `users/{userId}/favorites` - User favorites subcollection
5. `users/{userId}/visitedPlaces` - User visited places subcollection

## Recommended Workflow

1. **First, run the scanner:**
   ```bash
   npx tsx scripts/scanFirestoreCorruption.ts
   ```

2. **Review the output** to see what would be deleted

3. **If you want to proceed with deletion, run the fixer:**
   ```bash
   npx tsx scripts/fixFirestoreCorruption.ts
   ```

## Requirements

- Node.js environment
- Firebase Admin SDK initialized
- `serviceAccountKey.json` file in project root
- TypeScript support (`tsx` package)

## Example Output

```
🚀 Starting Firestore corruption scan...

🔍 Scanning collection: places
   Found 150 documents

⚠️  POSSIBLE CORRUPTED DOCUMENT FOUND: places/abc123
   Issues:
   - Undefined field: description
   - Missing required field: address

📊 SCAN SUMMARY
   Total corrupted documents found: 3
```

