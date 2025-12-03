'use client'

export function StatCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-md border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      </div>
      <div className="h-8 w-20 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-32 bg-gray-100 rounded"></div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white/90 rounded-2xl shadow-md overflow-hidden border border-gray-200 animate-pulse">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
  )
}

export function PhotoSkeleton() {
  return (
    <div className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 3, type = 'card' }: { count?: number; type?: 'card' | 'photo' | 'review' }) {
  const SkeletonComponent = type === 'card' ? CardSkeleton : type === 'photo' ? PhotoSkeleton : ReviewSkeleton
  
  return (
    <div className={`grid ${
      type === 'photo' 
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4' 
        : type === 'review'
        ? 'grid-cols-1 gap-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    }`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  )
}

