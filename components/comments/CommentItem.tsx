'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Star, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { CommentWithId, User } from './types'
import CommentReplyBox from './CommentReplyBox'

type CommentItemProps = {
  comment: CommentWithId
  allUsers: User[]
  placeId: number | string
  isChild: boolean
  replyFor: string | null
  toggling: string | null
  onToggleReply: (commentId: string) => void
  onLikeDislike: (commentId: string, target: 'like' | 'dislike') => void
  onDelete: (commentId: string, photoUrl?: string) => void
  onTypingStart: () => void
  onReplySubmitted: () => void
}

function CommentItem({
  comment,
  allUsers,
  placeId,
  isChild,
  replyFor,
  toggling,
  onToggleReply,
  onLikeDislike,
  onDelete,
  onTypingStart,
  onReplySubmitted
}: CommentItemProps) {
  const { user } = useAuth()

  const highlightMentions = useCallback((text: string): string => {
    const names = allUsers.map(u => u.displayName).filter(Boolean)
    let highlighted = text || ''
    names.forEach(name => {
      try {
        const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g')
        highlighted = highlighted.replace(pattern, (m) => `<span class="text-blue-600 font-bold">${m}</span>`)
      } catch {}
    })
    return highlighted
  }, [allUsers])

  const dateStr = (() => {
    try {
      const d: any = comment.createdAt
      const date = d?.toDate ? d.toDate() : new Date(d)
      if (isNaN(date.getTime())) return null
      return date
        .toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        .replace(/\d{4}/, (match: string) => match + ' yılı')
    } catch { return null }
  })()

  const isLikedByUser = user && comment.userReactions && comment.userReactions[user.uid] === 'like'
  const isDislikedByUser = user && comment.userReactions && comment.userReactions[user.uid] === 'dislike'

  const handleLike = useCallback(() => {
    onLikeDislike(comment.id, 'like')
  }, [comment.id, onLikeDislike])

  const handleDislike = useCallback(() => {
    onLikeDislike(comment.id, 'dislike')
  }, [comment.id, onLikeDislike])

  const handleDelete = useCallback(() => {
    onDelete(comment.id, comment.photoUrl)
  }, [comment.id, comment.photoUrl, onDelete])

  const handleToggleReply = useCallback(() => {
    onToggleReply(comment.id)
  }, [comment.id, onToggleReply])

  const handleCancel = useCallback(() => {
    onToggleReply(comment.id)
  }, [comment.id, onToggleReply])

  return (
    <div className={`${isChild ? 'bg-[#f8fffa]' : 'bg-white'} rounded-xl shadow-sm p-3 hover:shadow-md transition-all duration-200`}>
      <div className="flex gap-4">
        <img src={comment.userAvatar || '/default-avatar.svg'} alt={comment.userDisplayName} className="w-10 h-10 rounded-full object-cover border-2 border-teal-200" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-medium font-inter text-gray-900">{comment.userDisplayName}</h5>
            {!isChild && (
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= (comment.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
            )}
            <span className="text-sm font-inter text-gray-500">{dateStr}</span>
            {user && comment.userId === user.uid && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                className="ml-auto text-red-500 hover:text-red-700 transition-colors duration-300"
                title="Yorumu sil"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          {isChild && (
            <p className="text-xs text-gray-600 mb-1">{comment.userDisplayName} ↳ (yanıtladı)</p>
          )}
          <p className="text-gray-700 font-inter mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightMentions(comment.comment) || '(Bu yorum silinmiş)' }} />
          {comment.photoUrl && (
            <img src={comment.photoUrl} alt="Comment Photo" className="w-full max-w-md rounded-xl mb-3 border-2 border-teal-100" />
          )}
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              disabled={toggling !== null}
              className={`flex items-center gap-1 text-sm font-inter transition transform ${isLikedByUser ? 'text-green-600 font-bold scale-110' : 'text-gray-600'} hover:scale-110`}
            >
              <ThumbsUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">{comment.likes || 0}</span>
            </button>
            <button
              onClick={handleDislike}
              disabled={toggling !== null}
              className={`flex items-center gap-1 text-sm font-inter transition transform ${isDislikedByUser ? 'text-red-600 font-bold scale-110' : 'text-gray-600'} hover:scale-110`}
            >
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <span className="text-gray-700">{comment.dislikes || 0}</span>
            </button>
          </div>
          {!isChild && (
            <div className="mt-3">
              <button
                onClick={handleToggleReply}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Cevapla
              </button>
              {replyFor === comment.id && (
                <CommentReplyBox
                  placeId={placeId}
                  parentId={comment.id}
                  allUsers={allUsers}
                  onReplySubmitted={onReplySubmitted}
                  onTypingStart={onTypingStart}
                  onCancel={handleCancel}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(CommentItem)

