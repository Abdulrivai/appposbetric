'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

const BANNERS = [
  {
    src: '/bannerquick1.png',
    alt: 'Promo Banner 1',
  },
  {
    src: '/quickbanner2.png',
    alt: 'Promo Banner 2',
  },
  {
    src: '/quickbanner3.png',
    alt: 'Promo Banner 3',
  },
]

export function BannerCarousel() {
  const [current, setCurrent] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const diffX = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const goTo = useCallback((index: number) => {
    setCurrent((index + BANNERS.length) % BANNERS.length)
  }, [])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Auto-play setiap 4 detik
  const startAutoPlay = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % BANNERS.length)
    }, 4000)
  }, [])

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    startAutoPlay()
    return () => stopAutoPlay()
  }, [startAutoPlay, stopAutoPlay])

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    stopAutoPlay()
    setIsDragging(true)
    startX.current = e.clientX
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    diffX.current = e.clientX - startX.current
  }
  const onMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (diffX.current < -50) next()
    else if (diffX.current > 50) prev()
    diffX.current = 0
    startAutoPlay()
  }

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    stopAutoPlay()
    startX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - startX.current
    if (diff < -50) next()
    else if (diff > 50) prev()
    startAutoPlay()
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {BANNERS.map((banner, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 w-full"
            style={{ aspectRatio: '1920/1000' }}
          >
            <Image
              src={banner.src}
              alt={banner.alt}
              fill
              sizes="100vw"
              className="object-cover"
              draggable={false}
              priority
            />
          </div>
        ))}
      </div>

      {/* Arrow kiri */}
      <button
        onClick={(e) => { e.stopPropagation(); stopAutoPlay(); prev(); startAutoPlay() }}
        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-lg font-bold"
        aria-label="Previous"
      >
        ‹
      </button>

      {/* Arrow kanan */}
      <button
        onClick={(e) => { e.stopPropagation(); stopAutoPlay(); next(); startAutoPlay() }}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-lg font-bold"
        aria-label="Next"
      >
        ›
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => { stopAutoPlay(); goTo(i); startAutoPlay() }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            aria-label={`Go to banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
