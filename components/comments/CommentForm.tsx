'use client'

import { useState, useRef, useCallback } from 'react'
import { Star, Send, Camera } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import type { User } from './types'

type CommentFormProps = {
  placeId: number | string
  allUsers: User[]
  onCommentSubmitted: () => void
  onTypingStart: () => void
}

export default function CommentForm({ placeId, allUsers, onCommentSubmitted, onTypingStart }: CommentFormProps) {
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [commentRating, setCommentRating] = useState(5)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [showMentionList, setShowMentionList] = useState(false)
  const submitDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const extractMentions = useCallback((text: string): string[] => {
    const names = allUsers.map(u => u.displayName).filter(Boolean)
    const found = new Set<string>()
    names.forEach(name => {
      const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?=\\s|$)`, 'g')
      if (pattern.test(text)) found.add(name)
    })
    return Array.from(found)
  }, [allUsers])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && typeof window !== 'undefined') {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }, [])

  const handleUploadIfAny = useCallback(async (): Promise<string | undefined> => {
    if (!selectedFile || !user) return undefined
    setUploading(true)
    try {
      const storageRef = ref(storage, `places/${placeId}/${Date.now()}_${selectedFile.name}`)
      const snapshot = await uploadBytes(storageRef, selectedFile)
      const downloadURL = await getDownloadURL(snapshot.ref)
      return downloadURL
    } finally {
      setUploading(false)
    }
  }, [selectedFile, user, placeId])

  const submitComment = useCallback(async () => {
    if (!user) return
    if (!newComment.trim()) return

    if (submitDebounceRef.current) clearTimeout(submitDebounceRef.current)
    submitDebounceRef.current = setTimeout(async () => {
      const loadingToast = toast.loading('Yorum gönderiliyor...')
      try {
        const photoUrl = await handleUploadIfAny()
        const mentions = extractMentions(newComment)
        await addDoc(collection(db, 'places', String(placeId), 'comments'), {
          userId: user.uid,
          userDisplayName: user?.displayName || user?.email || "Anonim Kullanıcı",
          userAvatar: user.photoURL || "",
          rating: commentRating,
          comment: newComment.trim(),
          photoUrl: photoUrl ? photoUrl : null,
          createdAt: new Date(),
          likes: 0,
          dislikes: 0,
          userReactions: {},
          parentCommentId: null,
          mentions
        })

        try {
          const placeRef = doc(db, 'places', String(placeId))
          const placeSnap = await getDoc(placeRef)
          
          if (placeSnap.exists()) {
            const placeData = placeSnap.data()
            const visitedPlaceRef = doc(db, 'users', user.uid, 'visitedPlaces', String(placeId))
            
            await setDoc(visitedPlaceRef, {
              placeId: String(placeId),
              placeName: placeData.name || 'Bilinmeyen',
              city: placeData.city || placeData.address?.split(',')[0] || 'Bilinmeyen',
              rating: commentRating,
              photoUrl: photoUrl || placeData.imageUrl || placeData.image || null,
              latitude: placeData.latitude || 0,
              longitude: placeData.longitude || 0,
              category: placeData.category || '',
              timestamp: serverTimestamp()
            }, { merge: true })
          }
        } catch (error) {
          console.error('Error tracking visited place:', error)
        }
        toast.success('Yorum başarıyla eklendi! ✅', { id: loadingToast })
        setNewComment('')
        setCommentRating(5)
        setSelectedFile(null)
        setPreviewUrl(null)
        onCommentSubmitted()
      } catch (e) {
        console.error(e)
        toast.error('Bir şeyler ters gitti ❌', { id: loadingToast })
        onCommentSubmitted()
      }
    }, 500)
  }, [user, newComment, commentRating, placeId, handleUploadIfAny, extractMentions, onCommentSubmitted])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTypingStart()
    const value = e.target.value
    setNewComment(value)
    const atIndex = value.lastIndexOf('@')
    if (atIndex >= 0) {
      const after = value.slice(atIndex + 1)
      if (/^[^\s@]{1,30}$/.test(after)) {
        setMentionQuery(after)
        setShowMentionList(true)
      } else {
        setShowMentionList(false)
        setMentionQuery(null)
      }
    } else {
      setShowMentionList(false)
      setMentionQuery(null)
    }
  }, [onTypingStart])

  const handleMentionSelect = useCallback((displayName: string) => {
    const at = newComment.lastIndexOf('@')
    if (at >= 0) {
      const newVal = newComment.slice(0, at) + `@${displayName}` + ' ' + newComment.slice(at + 1 + (mentionQuery?.length || 0))
      setNewComment(newVal)
      setShowMentionList(false)
      setMentionQuery(null)
    }
  }, [newComment, mentionQuery])

  const filteredMentions = allUsers.filter(u => mentionQuery ? u.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase()) : false).slice(0, 8)

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 mb-8 text-center border border-teal-100">
        <p className="text-gray-700 font-inter mb-4">Yorum yapmak için giriş yapmanız gerekiyor</p>
        <a href="/auth/signin" className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg">Giriş Yap</a>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-teal-100">
      <h4 className="font-poppins font-semibold text-teal-900 mb-4">Deneyiminizi Paylaşın</h4>

      <div className="mb-4">
        <label className="block text-sm font-medium font-inter text-gray-700 mb-2">Puanlama</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setCommentRating(star)}
              className="text-2xl transition-colors duration-200"
            >
              <Star className={`w-6 h-6 ${star <= commentRating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={newComment}
        onChange={handleTextChange}
        placeholder="Deneyiminizi anlatın..."
        className="w-full p-4 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-inter bg-white/80"
        rows={4}
      />
      {showMentionList && filteredMentions.length > 0 && (
        <div className="mt-2 bg-white border border-teal-100 rounded-xl shadow-lg p-2 max-h-56 overflow-auto">
          {filteredMentions.map(u => (
            <button
              key={u.id}
              onClick={() => handleMentionSelect(u.displayName)}
              className="w-full text-left px-3 py-2 hover:bg-teal-50 rounded-lg text-sm"
            >
              @{u.displayName}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs font-inter text-gray-500 mt-2">Yorumun herkese açık olarak paylaşılacaktır.</p>

      <div className="flex items-center gap-4 mt-4">
        <input id="photo-upload" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        <label
          htmlFor="photo-upload"
          className="flex items-center gap-2 px-4 py-2 border border-teal-200 rounded-xl hover:bg-teal-50 cursor-pointer transition-colors duration-300 font-inter font-medium"
        >
          <Camera className="w-4 h-4" />
          Fotoğraf Seç
        </label>
        {previewUrl && typeof window !== 'undefined' && (
          <div className="flex items-center gap-3">
            <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-teal-200" />
            <span className="text-xs font-inter text-gray-500">{uploading ? 'Yükleniyor...' : 'Hazır'}</span>
          </div>
        )}
        <div className="flex-1" />
        <button onClick={submitComment} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={uploading || !newComment.trim()}>
          <Send className="w-4 h-4 mr-2" />
          {uploading ? 'Gönderiliyor...' : 'Yorum Gönder'}
        </button>
      </div>
    </div>
  )
}

