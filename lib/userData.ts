import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface UserComment {
  id: string
  userId: string
  placeId: string
  placeName: string
  rating: number
  text: string
  userName: string
  createdAt: any // Firestore Timestamp
  photoUrl?: string | null
  // Backward compatibility
  comment?: string
}

export interface FavoritePlace {
  id: string
  placeId: string
  addedAt: any // Firestore Timestamp
}

/**
 * Toggle favorite - Add or remove placeId from favorites subcollection
 */
export async function toggleFavorite(uid: string, placeId: string): Promise<boolean> {
  try {
    const favoriteRef = doc(db, 'users', uid, 'favorites', placeId)
    const favoriteSnap = await getDoc(favoriteRef)

    if (favoriteSnap.exists()) {
      // Remove from favorites
      await deleteDoc(favoriteRef)
      return false
    } else {
      // Add to favorites
      await setDoc(favoriteRef, {
        placeId,
        addedAt: serverTimestamp()
      })
      return true
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    throw error
  }
}

/**
 * Add comment to user's comments subcollection and update history
 */
export async function addComment(
  uid: string,
  placeId: string,
  placeName: string,
  text: string,
  rating: number,
  userName: string,
  createdAt?: any // Firestore Timestamp
): Promise<string> {
  try {
    // Add comment to comments subcollection
    const commentsRef = collection(db, 'users', uid, 'comments')
    const newCommentRef = doc(commentsRef)
    
    await setDoc(newCommentRef, {
      userId: uid,
      placeId,
      placeName,
      text,
      rating,
      userName,
      createdAt: createdAt || serverTimestamp()
    })

    // Also add to history if not already there
    await updateHistory(uid, placeId)

    return newCommentRef.id
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Update history - Add placeId to visitedPlaces subcollection if not already present
 */
export async function updateHistory(uid: string, placeId: string): Promise<void> {
  try {
    const visitedPlaceRef = doc(db, 'users', uid, 'visitedPlaces', placeId)
    const visitedPlaceSnap = await getDoc(visitedPlaceRef)

    // Only add if not already in visitedPlaces
    if (!visitedPlaceSnap.exists()) {
      await setDoc(visitedPlaceRef, {
        placeId,
        visitedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error updating history:', error)
    throw error
  }
}

/**
 * Get user favorites from subcollection
 */
export async function getUserFavorites(uid: string): Promise<FavoritePlace[]> {
  try {
    const favoritesRef = collection(db, 'users', uid, 'favorites')
    const favoritesSnap = await getDocs(favoritesRef)
    
    return favoritesSnap.docs.map(doc => ({
      id: doc.id,
      placeId: doc.data().placeId,
      addedAt: doc.data().addedAt
    }))
  } catch (error) {
    console.error('Error getting user favorites:', error)
    return []
  }
}

/**
 * Get user comments from subcollection
 */
export async function getUserComments(uid: string): Promise<UserComment[]> {
  try {
    const commentsRef = collection(db, 'users', uid, 'comments')
    const commentsSnap = await getDocs(commentsRef)
    
    return commentsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId || uid,
        placeId: data.placeId,
        placeName: data.placeName || '',
        rating: data.rating || 0,
        text: data.text || data.comment || '', // Support both 'text' and 'comment' for backward compatibility
        userName: data.userName || data.userDisplayName || '',
        createdAt: data.createdAt || data.date || serverTimestamp(), // Support both 'createdAt' and 'date'
        photoUrl: data.photoUrl || null,
        // Backward compatibility
        comment: data.text || data.comment || ''
      }
    })
  } catch (error) {
    console.error('Error getting user comments:', error)
    return []
  }
}

/**
 * Get user visited places from subcollection
 */
export async function getUserHistory(uid: string): Promise<string[]> {
  try {
    const visitedPlacesRef = collection(db, 'users', uid, 'visitedPlaces')
    const visitedPlacesSnap = await getDocs(visitedPlacesRef)
    
    return visitedPlacesSnap.docs.map(doc => {
      const data = doc.data()
      return data.placeId || doc.id // Support both placeId field and doc.id
    })
  } catch (error) {
    console.error('Error getting user visited places:', error)
    return []
  }
}

/**
 * Remove comment from user's comments subcollection
 */
export async function removeComment(uid: string, commentId: string): Promise<void> {
  try {
    const commentRef = doc(db, 'users', uid, 'comments', commentId)
    await deleteDoc(commentRef)
  } catch (error) {
    console.error('Error removing comment:', error)
    throw error
  }
}

/**
 * Update comment in user's comments subcollection
 */
export async function updateComment(
  uid: string,
  commentId: string,
  comment: string,
  rating?: number
): Promise<void> {
  try {
    const commentRef = doc(db, 'users', uid, 'comments', commentId)
    await setDoc(commentRef, {
      comment,
      rating: rating || 0,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error updating comment:', error)
    throw error
  }
}

