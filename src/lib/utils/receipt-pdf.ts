import jsPDF from "jspdf";

interface ReceiptData {
  saleNumber: number;
  date: string;
  cashierName: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  changeGiven: number;
}

interface StoreConfig {
  name: string;
  address: string;
  phone: string;
  taxId?: string;
}

export function generateReceiptPDF(
  data: ReceiptData,
  store: StoreConfig
): jsPDF {
  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  const estimatedHeight = 30 + data.items.length * 6 + 60 + 20;
  const doc = new jsPDF({
    unit: "mm",
    format: [pageWidth, Math.max(estimatedHeight, 100)],
  });

  let y = 8;
  const fontSize = {
    title: 12,
    normal: 8,
    small: 7,
  };

  // Store header
  doc.setFontSize(fontSize.title);
  doc.text(store.name, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(fontSize.small);
  doc.text(store.address, pageWidth / 2, y, { align: "center" });
  y += 4;
  if (store.phone) {
    doc.text(`Tel: ${store.phone}`, pageWidth / 2, y, { align: "center" });
    y += 4;
  }
  if (store.taxId) {
    doc.text(`Tax ID: ${store.taxId}`, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  // Separator
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Sale info
  doc.setFontSize(fontSize.normal);
  doc.text(`Receipt #${data.saleNumber}`, margin, y);
  y += 4;
  doc.text(`Date: ${data.date}`, margin, y);
  y += 4;
  doc.text(`Cashier: ${data.cashierName}`, margin, y);
  if (data.customerName) {
    y += 4;
    doc.text(`Customer: ${data.customerName}`, margin, y);
  }

  // Separator
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Column headers
  doc.setFontSize(fontSize.small);
  doc.text("Item", margin, y);
  doc.text("Qty", margin + contentWidth * 0.55, y, { align: "right" });
  doc.text("Price", margin + contentWidth * 0.75, y, { align: "right" });
  doc.text("Total", margin + contentWidth, y, { align: "right" });
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items
  data.items.forEach((item) => {
    const name =
      item.name.length > 22 ? item.name.substring(0, 22) + ".." : item.name;
    doc.text(name, margin, y);
    doc.text(String(item.quantity), margin + contentWidth * 0.55, y, {
      align: "right",
    });
    doc.text(item.unitPrice.toFixed(2), margin + contentWidth * 0.75, y, {
      align: "right",
    });
    doc.text(item.lineTotal.toFixed(2), margin + contentWidth, y, {
      align: "right",
    });
    y += 5;
  });

  // Separator
  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Totals
  doc.setFontSize(fontSize.normal);
  const printTotal = (label: string, value: number) => {
    doc.text(label, margin, y);
    doc.text(value.toFixed(2), margin + contentWidth, y, { align: "right" });
    y += 4;
  };

  printTotal("Subtotal:", data.subtotal);
  if (data.taxTotal > 0) printTotal("Tax:", data.taxTotal);
  if (data.discountAmount > 0) printTotal("Discount:", -data.discountAmount);

  // Grand total
  doc.setFontSize(fontSize.title);
  printTotal("TOTAL:", data.total);
  doc.setFontSize(fontSize.normal);

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Payment info
  printTotal(`Paid (${data.paymentMethod}):`, data.amountPaid);
  if (data.changeGiven > 0) printTotal("Change:", data.changeGiven);

  // Footer
  y += 4;
  doc.setFontSize(fontSize.small);
  doc.text("Thank you for your purchase!", pageWidth / 2, y, {
    align: "center",
  });
  y += 4;
  doc.text("Goods sold are not returnable", pageWidth / 2, y, {
    align: "center",
  });

  return doc;
}
