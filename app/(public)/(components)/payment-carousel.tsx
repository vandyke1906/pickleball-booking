"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"

type CarouselItemData = {
  image?: string
  description?: string
  children?: React.ReactNode
}

type CarouselWrapperProps = {
  items: CarouselItemData[]
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function CarouselWrapper({
  items,
  className = "w-full",
  autoPlay = false,
  interval = 3500,
}: CarouselWrapperProps) {
  const nextButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!autoPlay || items.length <= 1) return

    const id = setInterval(() => {
      nextButtonRef.current?.click()
    }, interval)

    return () => clearInterval(id)
  }, [autoPlay, interval, items.length])

  return (
    <Carousel
      className="w-full max-w-[220px] mx-auto"
      opts={{ loop: true, align: "center", duration: 25 }}
    >
      <CarouselContent>
        {items.map((item, index) => (
          <CarouselItem key={index} className="mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-1"
            >
              <div className="shadow-none flex flex-col gap-2">
                {item.image && (
                  <div className="relative w-full aspect-square mx-auto rounded-xl overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.description ?? `carousel item ${index + 1}`}
                      fill
                      sizes="(max-width: 480px) 80vw, 140px"
                      className="object-contain p-4"
                      priority={index === 0}
                      quality={90}
                    />
                  </div>
                )}

                {item.description && (
                  <span className="text-sm text-gray-700 font-medium px-3 leading-snug flex justify-center">
                    {item.description}
                  </span>
                )}
                {item.children}
              </div>
            </motion.div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselPrevious className="-left-2" />
      <CarouselNext ref={nextButtonRef} className="-right-2" />
    </Carousel>
  )
}
