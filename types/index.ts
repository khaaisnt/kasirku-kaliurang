export interface MenuItem {
  id: string
  name: string
  price: number
  category: "makanan" | "minuman"
  image: string
}

export interface OrderItem {
  item: MenuItem
  quantity: number
}

export interface Order {
  id: string
  customerName: string
  items: OrderItem[]
  total: number
  notes: string
  timestamp: string
}

