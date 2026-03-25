"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

export function CarouselWrapper({ items, className = "w-full" }: CarouselWrapperProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % items.length)
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + items.length) % items.length)

  return (
    <div className="relative">
      <Carousel className={className}>
        <CarouselContent>
          <AnimatePresence mode="wait">
            <CarouselItem key={activeIndex} className="w-full flex-shrink-0">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full h-full"
              >
                <Card className="border-none shadow-none w-full h-full">
                  <CardContent className="flex flex-col w-full h-full items-center justify-center gap-2 p-0">
                    {items[activeIndex].image && (
                      <div className="relative w-full h-64 rounded-md overflow-hidden">
                        <Image
                          src={items[activeIndex].image!}
                          alt={items[activeIndex].description ?? `carousel item ${activeIndex + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    {items[activeIndex].description && (
                      <span className="text-sm text-gray-700 text-center">
                        {items[activeIndex].description}
                      </span>
                    )}
                    {items[activeIndex].children}
                  </CardContent>
                </Card>
              </motion.div>
            </CarouselItem>
          </AnimatePresence>
        </CarouselContent>
      </Carousel>

      <Button
        variant="outline"
        size="icon"
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow bg-white/70 hover:bg-white"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow bg-white/70 hover:bg-white"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
