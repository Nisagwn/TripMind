import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const location = 'Antalya'
  const type = 'tourist_attraction|restaurant|cafe|museum|park'

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(type + ' in ' + location)}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  return NextResponse.json(data)
}
