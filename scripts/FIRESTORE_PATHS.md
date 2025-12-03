# Firestore Collection Paths in Project

This document lists all Firestore collection paths found in the project.

## Main Collections

1. **`places`** - Main places collection
   - Used in: `app/places/page.tsx`, `lib/savePlacesToFirestore.ts`, `scripts/deleteAllPlaces.ts`, `scripts/deleteDuplicates.ts`, `app/places/[id]/page.tsx`, `components/profile/ReviewsHistoryTab.tsx`, `components/profile/OverviewTab.tsx`, `components/profile/FavoritesGalleryTab.tsx`, `app/gallery/page.tsx`

2. **`users`** - Users collection
   - Used in: `components/CommentsSection.tsx`, `components/comments/CommentForm.tsx`

## Subcollections

3. **`places/{placeId}/comments`** - Comments under places
   - Used in: `components/CommentsSection.tsx`, `components/comments/CommentForm.tsx`, `components/comments/CommentReplyBox.tsx`, `components/PlaceCard.tsx`, `app/places/page.tsx`, `app/places/[id]/page.tsx`, `components/profile/ReviewsHistoryTab.tsx`, `components/profile/FavoritesGalleryTab.tsx`, `app/gallery/page.tsx`

4. **`users/{userId}/favorites`** - User favorites
   - Used in: `hooks/useFavorites.ts`, `components/profile/FavoritesGalleryTab.tsx`, `components/profile/OverviewTab.tsx`

5. **`users/{userId}/visitedPlaces`** - User visited places
   - Used in: `components/comments/CommentForm.tsx`, `components/profile/ReviewsHistoryTab.tsx`, `components/profile/OverviewTab.tsx`

## onSnapshot Listeners Found

1. **`hooks/useFavorites.ts`** - Listens to `users/{userId}/favorites`
   - ✅ Protected with user check

2. **`components/CommentsSection.tsx`** - Listens to `places/{placeId}/comments`
   - ✅ Protected with shouldListen state

3. **`components/PlaceCard.tsx`** - Listens to `places/{placeId}/comments` (comment count)
   - ✅ Public collection, no user check needed

4. **`app/places/page.tsx`** - Listens to `places/{placeId}/comments` (comment count)
   - ✅ Public collection, no user check needed

## Focus Areas for Corruption Scan

Based on the error reports, focus on:
- `places/*` - Main places collection
- `users/*/favorites/*` - User favorites
- `users/*/visitedPlaces/*` - User visited places  
- `places/*/comments/*` - Comments under places

