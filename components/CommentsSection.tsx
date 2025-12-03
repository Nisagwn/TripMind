'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot, orderBy, query, getDocs, doc, deleteDoc, runTransaction } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import CommentForm from './comments/CommentForm'
import CommentList from './comments/CommentList'
import type { CommentWithId, User } from './comments/types'

export default function CommentsSection({ placeId }: { placeId: number | string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentWithId[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [toggling, setToggling] = useState<string | null>(null)
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [shouldListen, setShouldListen] = useState(true)
  const likeDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!shouldListen) return

    const qRef = query(
      collection(db, 'places', String(placeId), 'comments'),
      orderBy('createdAt', 'desc')
    )
    let unsubscribe: (() => void) | null = null
    try {
      unsubscribe = onSnapshot(
        qRef,
        (snap) => {
          try {
            const list = snap.docs.map((d) => ({ ...(d.data() as CommentWithId), id: d.id }))
      setComments(list)
          } catch (error) {
            console.error('Error processing comments snapshot:', error)
          }
        },
        (error) => {
          console.error('Comments snapshot error:', error)
        }
      )
    } catch (error) {
      console.error('Error setting up comments listener:', error)
    }
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from comments:', error)
        }
      }
    }
  }, [placeId, shouldListen])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const users = snap.docs.map(d => {
          const data = d.data() as any
          return { id: d.id, displayName: data.displayName || data.name || data.email || 'Kullanıcı' }
        })
        setAllUsers(users)
    } catch (e) {
        console.error('loadUsers', e)
      }
    }
    loadUsers()
  }, [])

  const handleTypingStart = useCallback(() => {
    setShouldListen(false)
  }, [])

  const handleCommentSubmitted = useCallback(() => {
    setShouldListen(true)
  }, [])

  const handleReplySubmitted = useCallback(() => {
    setReplyFor(null)
    setShouldListen(true)
  }, [])

  const handleToggleReply = useCallback((commentId: string) => {
    const willClose = replyFor === commentId
    setReplyFor(willClose ? null : commentId)
    if (willClose) {
      setShouldListen(true)
    }
  }, [replyFor])

  const handleLikeDislike = useCallback(async (commentId: string, target: 'like' | 'dislike') => {
    if (!user) return
    
    if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current)
    setToggling(`${commentId}:${target}`)
    
    // Store previous state for potential rollback
    const previousComment = comments.find(c => c.id === commentId)
    if (!previousComment) return
    
    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const data = { ...c }
      const userReactions = { ...(data.userReactions || {}) }
      const prevReaction = userReactions[user?.uid || '']
      let likes = data.likes || 0
      let dislikes = data.dislikes || 0
      if (prevReaction !== target) {
        if (prevReaction === 'like') likes = Math.max(0, likes - 1)
        if (prevReaction === 'dislike') dislikes = Math.max(0, dislikes - 1)
        if (target === 'like') likes += 1; else dislikes += 1
        userReactions[user.uid] = target
      }
      return { ...data, likes, dislikes, userReactions }
    }))

    likeDebounceRef.current = setTimeout(async () => {
      try {
      const commentRef = doc(db, 'places', String(placeId), 'comments', commentId)
        await runTransaction(db, async (trx) => {
          const snap = await trx.get(commentRef)
          if (!snap.exists()) {
            throw new Error('Comment not found')
          }
          const data = snap.data() as CommentWithId
          const userReactions = { ...(data.userReactions || {}) }
          const prev = userReactions[user.uid]
          let likes = data.likes || 0
          let dislikes = data.dislikes || 0
          if (prev === target) return
          if (prev === 'like') likes = Math.max(0, likes - 1)
          else if (prev === 'dislike') dislikes = Math.max(0, dislikes - 1)
          if (target === 'like') likes += 1
          else dislikes += 1
          userReactions[user.uid] = target
          trx.update(commentRef, { likes, dislikes, userReactions })
      })
    } catch (e) {
        console.error('toggleLikeDislike', e)
        // Revert optimistic update on error
        if (previousComment) {
          setComments(prev => prev.map(c => 
            c.id === commentId ? previousComment : c
          ))
        }
    } finally {
      setToggling(null)
    }
    }, 500)
  }, [placeId, user, comments])

  const handleDelete = useCallback(async (commentId: string, photoUrl?: string) => {
    if (!user) return
    
    if (typeof window !== 'undefined' && !window.confirm('Yorumu silmek istediğine emin misin?')) {
      return
    }
    
    const loadingToast = toast.loading('Yorum siliniyor...')
    
    try {
      if (photoUrl) {
        const photoRef = ref(storage, photoUrl)
        await deleteObject(photoRef)
      }
      
      const commentRef = doc(db, 'places', String(placeId), 'comments', commentId)
      await deleteDoc(commentRef)
      
      toast.success('Yorum başarıyla silindi ✅', { id: loadingToast })
    } catch (e) {
      console.error('deleteComment', e)
      toast.error('Yorum silinirken bir hata oluştu ❌', { id: loadingToast })
    }
  }, [placeId, user])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100"
    >
      <h3 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
        <span>Yorumlar ve Değerlendirmeler</span>
      </h3>

      <CommentForm
        placeId={placeId}
        allUsers={allUsers}
        onCommentSubmitted={handleCommentSubmitted}
        onTypingStart={handleTypingStart}
      />

      <div className="space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Henüz yorum yapılmamış. <span className="font-semibold">İlk yorumu siz yapın!</span></div>
        ) : (
          <CommentList
            comments={comments}
            allUsers={allUsers}
            placeId={placeId}
            parentId={null}
            replyFor={replyFor}
            toggling={toggling}
            onToggleReply={handleToggleReply}
            onLikeDislike={handleLikeDislike}
            onDelete={handleDelete}
            onTypingStart={handleTypingStart}
            onReplySubmitted={handleReplySubmitted}
          />
        )}
      </div>
    </motion.div>
  )
}
