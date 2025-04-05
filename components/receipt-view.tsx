import type { Order } from "@/types"
import { formatRupiah } from "@/lib/utils"

interface ReceiptViewProps {
  order: Order
}

export function ReceiptView({ order }: ReceiptViewProps) {
  return (
    <div className="bg-white p-4 font-mono text-sm">
      <div className="text-center mb-4">
        <h3 className="font-bold text-lg">GADO-GADO KALIURANG</h3>
        <p>Jl. Melati No. 44 - Malang</p>
        <p>Telp. 082337572700</p>
      </div>

      <div className="mb-2">
        <p>Karyawan: Admin</p>
        <p>POS: POS 1</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-300 my-2 py-2">
        <p>Makan di tempat</p>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between">
              <span>{item.item.name}</span>
              <span>Rp{formatRupiah(item.item.price * item.quantity)}</span>
            </div>
            <div>
              <span>
                {item.quantity} x Rp{formatRupiah(item.item.price)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mb-4">
          <p className="font-bold">Catatan:</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="border-t border-dashed border-gray-300 pt-2">
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>Rp{formatRupiah(order.total)}</span>
        </div>

        <div className="flex justify-between">
          <span>Tunai</span>
          <span>Rp{formatRupiah(order.total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 mt-2 pt-2 text-center">
        <p>Terimakasih - Selamat Menikmati</p>
        <p>{new Date(order.timestamp).toLocaleString("id-ID")}</p>
        <div className="h-16"></div> {/* Extra space to simulate the print margin */}
      </div>
    </div>
  )
}

