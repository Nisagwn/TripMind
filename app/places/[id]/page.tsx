'use client'
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CommentsSection from "@/components/CommentsSection";
import { motion } from "framer-motion";
import { MapPin, Star, Phone, Globe, ExternalLink, ArrowLeft, Map, Heart, Camera, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import Link from "next/link";

export default function PlaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const { user } = useAuth();
  const { isFavorite, addToFavorites, removeFromFavorites, getFavoriteId } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const placeRef = doc(db, "places", id as string);
        const placeSnap = await getDoc(placeRef);
        if (placeSnap.exists()) {
          setPlace({ id: placeSnap.id, ...placeSnap.data() });
        }
      } catch (err) {
        console.error("Mekan bilgisi alınamadı:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPlace();
  }, [id]);

  // Fetch user photos from comments
  useEffect(() => {
    const fetchUserPhotos = async () => {
      if (!id) return;
      try {
        const commentsRef = collection(db, "places", id as string, "comments");
        const commentsSnap = await getDocs(commentsRef);
        const photos: any[] = [];
        commentsSnap.docs.forEach((doc) => {
          const comment = doc.data();
          if (comment.photoUrl) {
            photos.push({
              id: doc.id,
              photoUrl: comment.photoUrl,
              userName: comment.userDisplayName || "Anonim",
              userAvatar: comment.userAvatar || "/default-avatar.svg",
            });
          }
        });
        setUserPhotos(photos);
      } catch (err) {
        console.error("Fotoğraflar alınamadı:", err);
      }
    };
    if (id) fetchUserPhotos();
  }, [id]);

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch nearby places
  useEffect(() => {
    const fetchNearbyPlaces = async () => {
      if (!place || !(place as any).latitude || !(place as any).longitude) return;
      
      try {
        const placesRef = collection(db, "places");
        const placesSnap = await getDocs(placesRef);
        
        const allPlaces = placesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => p.id !== place.id && p.latitude && p.longitude); // Exclude current place
        
        // Calculate distances and sort
        const placesWithDistance = allPlaces.map((p: any) => ({
          ...p,
          distance: calculateDistance(
            (place as any).latitude,
            (place as any).longitude,
            p.latitude,
            p.longitude
          )
        }));
        
        // Sort by distance and take top 5
        const nearest = placesWithDistance
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);
        
        setNearbyPlaces(nearest);
      } catch (err) {
        console.error("Yakındaki mekanlar alınamadı:", err);
      }
    };
    
    if (place) fetchNearbyPlaces();
  }, [place]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mekan bulunamadı</h2>
          <button onClick={() => router.push('/places')} className="btn-primary">
            Mekanlara Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const photos = place.photos && place.photos.length > 0 ? place.photos : [place.imageUrl || '/default-place.jpg'];
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-5 h-5 ${i < Math.round(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
    ));
  };

  const handleToggleFavorite = async () => {
    if (!user || isToggling) return;

    setIsToggling(true);
    try {
      if (isFavorite(place.id)) {
        const favoriteId = getFavoriteId(place.id);
        if (favoriteId) {
          await removeFromFavorites(favoriteId);
        }
      } else {
        await addToFavorites(place.id, {
          id: place.id,
          name: place.name,
          image: place.imageUrl,
          category: place.category,
          price: place.priceLevel,
          rating: place.rating,
          address: place.address,
          coordinates: {
            lat: place.latitude,
            lng: place.longitude
          }
        });
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 pb-12">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => router.push('/places')}
          className="flex items-center gap-2 text-gray-700 hover:text-teal-600 transition-colors duration-300 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md hover:shadow-lg font-inter"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Mekanlara Geri Dön</span>
        </motion.button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Büyük Fotoğraf */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-8 border border-teal-100"
        >
          <div className="relative h-[500px] w-full overflow-hidden">
            <img 
              src={photos[selectedPhoto]} 
              alt={place.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Favorite Heart Icon */}
            {user && (
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFavorite}
                className="absolute top-6 right-6 p-3 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-10"
                disabled={isToggling}
              >
                {isFavorite(place.id) ? (
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                ) : (
                  <Heart className="w-6 h-6 text-gray-400 hover:text-rose-500 transition-colors" />
                )}
              </motion.button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h1 className="text-4xl md:text-5xl font-poppins font-bold mb-3">{place.name}</h1>
              <div className="flex items-center gap-6 flex-wrap">
                {place.address && (
                  <div className="flex items-center gap-2 font-inter">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">{place.address}</span>
                  </div>
                )}
                {place.rating > 0 && (
                  <div className="flex items-center gap-2 bg-white/30 backdrop-blur-md px-5 py-2 rounded-full shadow-lg font-inter">
                    <div className="flex">
                      {renderStars(place.rating)}
                    </div>
                    <span className="text-lg font-semibold">{place.rating.toFixed(1)}</span>
                    {place.userRatingCount > 0 && (
                      <span className="text-sm">({place.userRatingCount} değerlendirme)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fotoğraf Galerisi */}
          {photos.length > 1 && (
            <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50">
              <h3 className="text-lg font-poppins font-semibold text-teal-900 mb-4">📸 Fotoğraf Galerisi</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photos.map((photo: string, index: number) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPhoto(index)}
                    className={`relative h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                      selectedPhoto === index ? 'ring-4 ring-teal-500 shadow-lg' : 'ring-2 ring-teal-200'
                    }`}
                  >
                    <img 
                      src={photo} 
                      alt={`${place.name} - ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* İki Kolon Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Bilgiler ve Harita */}
          <div className="lg:col-span-2 space-y-8">
            {/* Konum Bilgileri */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100"
            >
              <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
                <span>📍</span>
                <span>Konum Bilgileri</span>
              </h2>
              
              {place.latitude && place.longitude && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-700 bg-teal-50 px-4 py-3 rounded-xl">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <span className="text-sm font-inter">
                      <span className="font-semibold">Koordinatlar:</span> {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                    </span>
                  </div>
                  
                  {/* Google Maps Embed */}
                  <div className="rounded-2xl overflow-hidden shadow-md h-[400px] mt-4">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${place.latitude},${place.longitude}&zoom=15`}
                    ></iframe>
                  </div>

                  {place.googleMapsUri && (
                    <a
                      href={place.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg font-inter font-medium"
                    >
                      <Map className="w-5 h-5" />
                      <span>Google Maps'te Aç</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>

            {/* Yorumlar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-8"
            >
              <CommentsSection placeId={place.id} />
            </motion.div>

            {/* Galeri - User Photos */}
            {userPhotos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="bg-gradient-to-br from-teal-50/50 via-cyan-50/50 to-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8 border border-teal-100 mt-8"
              >
                <h3 className="text-2xl font-poppins font-bold text-teal-900 mb-8 flex items-center gap-3">
                  <span className="text-3xl">🖼️</span>
                  <span>Galeri</span>
                  <span className="text-base font-inter font-normal text-gray-500">({userPhotos.length} fotoğraf)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {userPhotos.map((photo, index) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      className="relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-100"
                    >
                      <img
                        src={photo.photoUrl}
                        alt={`Photo by ${photo.userName}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl">
                            <img
                              src={photo.userAvatar}
                              alt={photo.userName}
                              className="w-6 h-6 rounded-full border-2 border-white"
                            />
                            <p className="text-sm font-inter font-semibold line-clamp-1">
                              {photo.userName}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sağ Kolon - İletişim ve Detaylar */}
          <div className="lg:col-span-1 space-y-6">
            {/* İletişim Bilgileri */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-lg p-6 sticky top-8 border border-teal-100"
            >
              <h3 className="text-xl font-poppins font-bold text-teal-900 mb-6">📞 İletişim & Bilgiler</h3>
              
              <div className="space-y-4">
                {place.category && (
                  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3 rounded-xl">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">🏷️</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-inter">Kategori</p>
                      <p className="font-medium font-inter text-gray-900">{place.category}</p>
                    </div>
                  </div>
                )}

                {place.phone && (
                  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-inter">Telefon</p>
                      <a href={`tel:${place.phone}`} className="font-medium font-inter text-gray-900 hover:text-teal-600 transition-colors">
                        {place.phone}
                      </a>
                    </div>
                  </div>
                )}

                {place.website && (
                  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-3 rounded-xl">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <Globe className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-inter">Website</p>
                      <a 
                        href={place.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium font-inter text-gray-900 hover:text-teal-600 transition-colors truncate block"
                      >
                        {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  </div>
                )}

                {place.description && (
                  <div className="pt-4 border-t border-teal-200 bg-white/70 backdrop-blur-sm p-3 rounded-xl">
                    <p className="text-sm font-inter text-gray-700 leading-relaxed">{place.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Yakındaki Mekanlar */}
        {nearbyPlaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-8 pt-8"
          >
            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-8 flex items-center gap-3">
              <span className="text-3xl">📍</span>
              <span>Yakındaki Mekanlar</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {nearbyPlaces.map((nearbyPlace, index) => (
                <NearbyPlaceCard key={nearbyPlace.id} place={nearbyPlace} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Nearby Place Card Component
function NearbyPlaceCard({ place, index }: { place: any; index: number }) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group"
    >
      <Link href={`/places/${place.id}`}>
        <div className="bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/30 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-2 border-teal-100 h-full">
          <div className="relative h-48 overflow-hidden">
            <img 
              src={place.imageUrl || '/default-place.jpg'} 
              alt={place.name} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {place.category && (
              <div className="absolute top-3 left-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-2.5 py-1 rounded-full shadow-lg">
                <span className="text-xs font-semibold font-inter">{place.category}</span>
              </div>
            )}
            {place.distance && (
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Navigation className="w-3 h-3 text-teal-600" />
                <span className="text-xs font-semibold font-inter">
                  {place.distance < 1 
                    ? `${(place.distance * 1000).toFixed(0)}m` 
                    : `${place.distance.toFixed(1)}km`}
                </span>
              </div>
            )}
          </div>
          
          <div className="p-5">
            <h3 className="text-base font-poppins font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors duration-300 line-clamp-1">
              {place.name}
            </h3>
            
            {place.address && (
              <div className="flex items-center text-gray-600 mb-3">
                <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-teal-500" />
                <span className="text-sm font-inter line-clamp-1">{place.address}</span>
              </div>
            )}
            
            {place.rating > 0 && (
              <div className="flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 rounded-full w-fit">
                <div className="flex gap-0.5">
                  {renderStars(place.rating || 0)}
                </div>
                <span className="text-sm font-semibold font-inter text-gray-900 ml-1.5">
                  {place.rating.toFixed(1)}
                </span>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-teal-100">
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 font-semibold text-sm font-inter group-hover:translate-x-1 transition-transform duration-300 inline-block">
                Detaya Git →
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}


