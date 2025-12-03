export type CommentDoc = {
  userId: string
  userDisplayName: string
  userAvatar: string
  rating: number
  comment: string
  photoUrl?: string
  createdAt: any // Firestore Timestamp
  likes?: number
  dislikes?: number
  userReactions?: { [userId: string]: 'like' | 'dislike' }
  parentCommentId?: string | null
  mentions?: string[]
}

export type CommentWithId = { id: string } & CommentDoc

export type User = {
  id: string
  displayName: string
}

