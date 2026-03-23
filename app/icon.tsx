'use client'

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/jpeg'
export const size = {
  width: 192,
  height: 192,
}
export const alt = 'KIFSHOP Pastry'
export const revalidate = 86400 // 24 hours

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: 'linear-gradient(135deg, #c6a55f 0%, #8b6f47 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        🥐
      </div>
    ),
    {
      ...size,
    }
  )
}
