"use client"

import { useState } from "react"
import type { Order } from "@/types"
import { formatRupiah } from "@/lib/utils"

export function useBluetoothPrinter() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReceiptContent = (order: Order) => {
    let receipt = `
GADO-GADO KALIURANG
Jl. Melati No. 44 - Malang
Telp. 082337572700

Karyawan: Admin
POS: POS 1

Makan di tempat
--------------------------------
`

    order.items.forEach((item) => {
      receipt += `${item.item.name}        Rp${formatRupiah(item.item.price)}\n`
      receipt += `${item.quantity} x Rp${formatRupiah(item.item.price)}\n\n`
    })

    if (order.notes) {
      receipt += `Catatan: ${order.notes}\n`
    }

    receipt += `--------------------------------
Total           Rp${formatRupiah(order.total)}

Tunai           Rp${formatRupiah(order.total)}
--------------------------------
Terimakasih - Selamat Menikmati
${new Date(order.timestamp).toLocaleString("id-ID")}
`

    return receipt
  }

  const printReceipt = async (order: Order) => {
    if (!navigator.bluetooth) {
      setError("Bluetooth tidak didukung di perangkat ini")
      return
    }

    try {
      setIsConnecting(true)
      setError(null)

      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Common printer service UUID
          { namePrefix: "Printer" },
        ],
        optionalServices: ["battery_service"],
      })

      console.log("Bluetooth device selected:", device.name)

      // Connect to the device
      const server = await device.gatt?.connect()
      if (!server) {
        throw new Error("Failed to connect to GATT server")
      }

      setIsConnecting(false)
      setIsPrinting(true)

      // Get the primary service
      const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb")

      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb")

      // Generate receipt content
      const receiptContent = generateReceiptContent(order)

      // Convert text to ArrayBuffer and send to printer
      const encoder = new TextEncoder()
      const data = encoder.encode(receiptContent)
      await characteristic.writeValue(data)

      console.log("Receipt sent to printer")
      setIsPrinting(false)
    } catch (error) {
      console.error("Error connecting to Bluetooth printer:", error)
      setError("Gagal terhubung ke printer Bluetooth. Pastikan printer menyala dan terhubung.")
      setIsConnecting(false)
      setIsPrinting(false)
    }
  }

  return {
    printReceipt,
    isConnecting,
    isPrinting,
    error,
  }
}

