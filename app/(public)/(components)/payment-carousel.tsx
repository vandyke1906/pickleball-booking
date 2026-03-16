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
  interval?: number // ms
}

export function CarouselWrapper({
  items,
  className = "w-full max-w-[12rem] sm:max-w-xs",
  autoPlay = false,
  interval = 2000,
}: CarouselWrapperProps) {
  const nextButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!autoPlay) return
    const id = setInterval(() => {
      nextButtonRef.current?.click()
    }, interval)
    return () => clearInterval(id)
  }, [autoPlay, interval])

  return (
    <Carousel className={className}>
      <CarouselContent>
        {items.map((item, index) => (
          <CarouselItem key={index}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-1"
            >
              <Card className="border-none shadow-none">
                <CardContent className="flex flex-col aspect-square items-center justify-center p-4 space-y-2">
                  {item.image && (
                    <div className="relative w-full h-32 rounded-md overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.description ?? `carousel item ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  {item.description && (
                    <span className="text-sm text-gray-700 text-center">{item.description}</span>
                  )}
                  {item.children}
                </CardContent>
              </Card>
            </motion.div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext ref={nextButtonRef} />
    </Carousel>
  )
}
