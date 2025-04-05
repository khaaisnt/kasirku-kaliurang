"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { MenuItem } from "@/types"
import { formatRupiah } from "@/lib/utils"

interface MenuCardProps {
  item: MenuItem
  onClick: () => void
}

export function MenuCard({ item, onClick }: MenuCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border-primary/20"
      onClick={onClick}
    >
      <div className="relative h-36">
        <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-primary">{item.name}</h3>
        <p className="text-primary font-semibold">Rp{formatRupiah(item.price)}</p>
      </CardContent>
    </Card>
  )
}

