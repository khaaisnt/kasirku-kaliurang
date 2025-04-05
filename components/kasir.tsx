"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Printer,
  Trash2,
  Plus,
  Minus,
  History,
  Receipt,
  Save,
  ShoppingBag,
  Search,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { MenuCard } from "@/components/menu-card";
import type { OrderItem, Order, MenuItem } from "@/types";
import { menuItems } from "@/data/menu-items";
import { ReceiptView } from "@/components/receipt-view";
import { DatePickerWithRange } from "@/components/date-range-picker";
import type { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Kasir() {
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Order | null>(null);

  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filteredHistory, setFilteredHistory] = useState<Order[]>([]);

  // Load order history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("orderHistory");
    if (savedHistory) {
      setOrderHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save order history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("orderHistory", JSON.stringify(orderHistory));
  }, [orderHistory]);

  // Apply filters to order history
  useEffect(() => {
    let filtered = [...orderHistory];

    // Apply name filter
    if (nameFilter) {
      filtered = filtered.filter((order) =>
        order.customerName.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter((order) => {
        const orderDate = parseISO(order.timestamp);

        if (dateRange.to) {
          return isWithinInterval(orderDate, {
            start: dateRange.from,
            end: dateRange.to,
          });
        } else {
          // If only "from" date is selected, match orders from that date onwards
          return orderDate >= dateRange.from;
        }
      });
    }

    setFilteredHistory(filtered);
  }, [orderHistory, nameFilter, dateRange]);

  const addToOrder = (item: MenuItem) => {
    const existingItem = currentOrder.find(
      (orderItem) => orderItem.item.id === item.id
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.item.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrder([...currentOrder, { item, quantity: 1 }]);
    }
  };

  const removeFromOrder = (itemId: string) => {
    const existingItem = currentOrder.find(
      (orderItem) => orderItem.item.id === itemId
    );

    if (existingItem && existingItem.quantity > 1) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.item.id === itemId
            ? { ...orderItem, quantity: orderItem.quantity - 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrder(
        currentOrder.filter((orderItem) => orderItem.item.id !== itemId)
      );
    }
  };

  const deleteFromOrder = (itemId: string) => {
    setCurrentOrder(
      currentOrder.filter((orderItem) => orderItem.item.id !== itemId)
    );
  };

  const calculateTotal = () => {
    return currentOrder.reduce((total, orderItem) => {
      return total + orderItem.item.price * orderItem.quantity;
    }, 0);
  };

  const saveOrder = () => {
    if (currentOrder.length === 0) return;

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customerName: customerName || "Pelanggan",
      items: [...currentOrder],
      total: calculateTotal(),
      notes: notes,
      timestamp: new Date().toISOString(),
    };

    setOrderHistory([newOrder, ...orderHistory]);
    setCurrentReceipt(newOrder);
    setIsReceiptOpen(true);

    // Reset current order
    setCurrentOrder([]);
    setCustomerName("");
    setNotes("");
  };

  const deleteOrder = (orderId: string) => {
    setOrderHistory(orderHistory.filter((order) => order.id !== orderId));
  };

  const clearAllHistory = () => {
    setOrderHistory([]);
    setFilteredHistory([]);
  };

  const resetFilters = () => {
    setNameFilter("");
    setDateRange(undefined);
  };

  const printReceipt = async (order: Order) => {
    try {
      // Check if Web Bluetooth API is available
      if (!navigator.bluetooth) {
        alert(
          "Web Bluetooth API tidak didukung di browser ini. Silakan gunakan Chrome, Edge, atau browser lain yang mendukung Web Bluetooth API."
        );
        return;
      }

      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Common printer service UUID
          { namePrefix: "Printer" },
        ],
        optionalServices: ["battery_service"],
      });

      console.log("Bluetooth device selected:", device.name);

      // Connect to the device
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Failed to connect to GATT server");
      }

      // Get the primary service
      const service = await server.getPrimaryService(
        "000018f0-0000-1000-8000-00805f9b34fb"
      );

      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic(
        "00002af1-0000-1000-8000-00805f9b34fb"
      );

      // Generate receipt content
      const receiptContent = generateReceiptContent(order);

      // Convert text to ArrayBuffer and send to printer
      const encoder = new TextEncoder();
      const data = encoder.encode(receiptContent);
      await characteristic.writeValue(data);

      console.log("Receipt sent to printer");
    } catch (error) {
      console.error("Error connecting to Bluetooth printer:", error);
      alert(
        "Gagal terhubung ke printer Bluetooth. Pastikan printer menyala dan terhubung."
      );
    }
  };

  const generateReceiptContent = (order: Order) => {
    // This would generate the ESC/POS commands for the printer
    // For demonstration purposes, we're just returning a string
    let receipt = `
GADO-GADO KALIURANG
Jl. Melati No. 44 - Malang
Telp. 082337572700

Karyawan: Admin
POS: POS 1

Makan di tempat
--------------------------------
`;

    order.items.forEach((item) => {
      receipt += `${item.item.name}        Rp${formatRupiah(
        item.item.price
      )}\n`;
      receipt += `${item.quantity} x Rp${formatRupiah(item.item.price)}\n\n`;
    });

    receipt += `--------------------------------
Total           Rp${formatRupiah(order.total)}

Tunai           Rp${formatRupiah(order.total)}
--------------------------------
Terimakasih - Selamat Menikmati
${new Date().toLocaleString("id-ID")}



\n\n\n\n\n\n\n\n
`;

    return receipt;
  };

  return (
    <div className="container px-4 sm:px-6 py-6">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Gado-Gado Kaliurang
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <History className="h-4 w-4" />
              Riwayat Pesanan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Riwayat Pesanan</DialogTitle>
              <DialogDescription>
                Lihat dan kelola riwayat pesanan
              </DialogDescription>
            </DialogHeader>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama pelanggan..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="pl-8"
                  />
                  {nameFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6"
                      onClick={() => setNameFilter("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="whitespace-nowrap"
                >
                  Reset Filter
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="whitespace-nowrap"
                      disabled={orderHistory.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Semua
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Semua Riwayat?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Semua riwayat
                        pesanan akan dihapus secara permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllHistory}>
                        Hapus Semua
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Filter summary */}
            {(nameFilter || dateRange?.from) && (
              <div className="bg-muted p-2 rounded-md mb-4 text-sm flex items-center">
                <span className="mr-2">Filter aktif:</span>
                {nameFilter && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs mr-2">
                    Nama: {nameFilter}
                  </span>
                )}
                {dateRange?.from && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">
                    Tanggal:{" "}
                    {format(dateRange.from, "dd/MM/yyyy", { locale: id })}
                    {dateRange.to
                      ? ` - ${format(dateRange.to, "dd/MM/yyyy", {
                          locale: id,
                        })}`
                      : ""}
                  </span>
                )}
              </div>
            )}

            {orderHistory.length > 0 ? (
              <>
                {filteredHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Pesanan</TableHead>
                        <TableHead>Nama Pelanggan</TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>
                            {new Date(order.timestamp).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>Rp{formatRupiah(order.total)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentReceipt(order);
                                  setIsReceiptOpen(true);
                                }}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                Struk
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Hapus
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Riwayat Pesanan?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tindakan ini tidak dapat dibatalkan.
                                      Riwayat pesanan ini akan dihapus secara
                                      permanen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOrder(order.id)}
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 text-muted-foreground/60" />
                    <p>Tidak ada pesanan yang sesuai dengan filter</p>
                    <Button
                      variant="link"
                      onClick={resetFilters}
                      className="mt-2"
                    >
                      Reset filter
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 flex flex-col items-center justify-center text-muted-foreground">
                <History className="h-8 w-8 mb-2 text-muted-foreground/60" />
                <p>Belum ada riwayat pesanan</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Order Section - Moved to top on mobile */}
        <div className="order-1 lg:order-2">
          <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4 text-primary">
                Pesanan Saat Ini
              </h2>

              <div className="mb-4">
                <Input
                  placeholder="Nama Pelanggan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-2"
                />
                <Textarea
                  placeholder="Catatan Pesanan"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-3 max-h-[200px] sm:max-h-[400px] overflow-y-auto mb-4 pr-1">
                {currentOrder.length > 0 ? (
                  currentOrder.map((orderItem) => (
                    <div
                      key={orderItem.item.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between p-2 sm:p-3 bg-accent rounded-md"
                    >
                      <div className="w-full sm:w-auto mb-2 sm:mb-0">
                        <h3 className="font-medium">{orderItem.item.name}</h3>
                        <p className="text-sm text-primary">
                          Rp{formatRupiah(orderItem.item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFromOrder(orderItem.item.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">
                          {orderItem.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => addToOrder(orderItem.item)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteFromOrder(orderItem.item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 sm:py-8 text-muted-foreground">
                    Belum ada item dalam pesanan
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total:</span>
                  <span>Rp{formatRupiah(calculateTotal())}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={saveOrder}
                    disabled={currentOrder.length === 0}
                  >
                    <Save className="h-4 w-4 hidden xs:inline" />
                    Simpan Pesanan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Section - Moved below order on mobile */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="bg-white/80 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="makanan">
                <TabsList className="mb-4 sm:mb-6 bg-accent w-full">
                  <TabsTrigger
                    value="makanan"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Makanan
                  </TabsTrigger>
                  <TabsTrigger
                    value="minuman"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Minuman
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="makanan" className="mt-0">
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {menuItems
                      .filter((item) => item.category === "makanan")
                      .map((item) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          onClick={() => addToOrder(item)}
                        />
                      ))}
                  </div>
                </TabsContent>
                <TabsContent value="minuman" className="mt-0">
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {menuItems
                      .filter((item) => item.category === "minuman")
                      .map((item) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          onClick={() => addToOrder(item)}
                        />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Struk Pesanan</DialogTitle>
          </DialogHeader>

          {currentReceipt && <ReceiptView order={currentReceipt} />}

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => currentReceipt && printReceipt(currentReceipt)}
            >
              <Printer className="h-4 w-4" />
              Cetak Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
