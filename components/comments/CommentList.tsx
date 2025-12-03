'use client'

import { memo } from 'react'
import type { CommentWithId, User } from './types'
import CommentItem from './CommentItem'

type CommentListProps = {
  comments: CommentWithId[]
  allUsers: User[]
  placeId: number | string
  parentId: string | null
  replyFor: string | null
  toggling: string | null
  onToggleReply: (commentId: string) => void
  onLikeDislike: (commentId: string, target: 'like' | 'dislike') => void
  onDelete: (commentId: string, photoUrl?: string) => void
  onTypingStart: () => void
  onReplySubmitted: () => void
}

function CommentList({
  comments,
  allUsers,
  placeId,
  parentId,
  replyFor,
  toggling,
  onToggleReply,
  onLikeDislike,
  onDelete,
  onTypingStart,
  onReplySubmitted
}: CommentListProps) {
  const filteredComments = comments.filter((c) => 
    parentId === null ? !c.parentCommentId : c.parentCommentId === parentId
  )

  return (
    <>
      {filteredComments.map((comment) => (
        <div key={comment.id} className={parentId ? "ml-8 border-l-2 border-gray-200 pl-4 mt-2" : "mt-4"}>
          <CommentItem
            comment={comment}
            allUsers={allUsers}
            placeId={placeId}
            isChild={Boolean(parentId)}
            replyFor={replyFor}
            toggling={toggling}
            onToggleReply={onToggleReply}
            onLikeDislike={onLikeDislike}
            onDelete={onDelete}
            onTypingStart={onTypingStart}
            onReplySubmitted={onReplySubmitted}
          />
          <CommentList
            comments={comments}
            allUsers={allUsers}
            placeId={placeId}
            parentId={comment.id}
            replyFor={replyFor}
            toggling={toggling}
            onToggleReply={onToggleReply}
            onLikeDislike={onLikeDislike}
            onDelete={onDelete}
            onTypingStart={onTypingStart}
            onReplySubmitted={onReplySubmitted}
          />
        </div>
      ))}
    </>
  )
}

export default memo(CommentList)

