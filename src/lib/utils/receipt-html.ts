/** Browser print-friendly receipt (Arabic / RTL-friendly; avoids jsPDF). */

export interface ReceiptHtmlData {
  saleNumber: number;
  date: string;
  cashierName: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discountPct?: number;
  }[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  changeGiven: number;
}

export interface ReceiptHtmlStore {
  name: string;
  address: string;
  phone: string;
  taxId?: string;
}

export function openReceiptHtmlPrint(data: ReceiptHtmlData, store: ReceiptHtmlStore): void {
  const w = window.open("", "_blank");
  if (!w) return;

  const rows = data.items
    .map(
      (i) => `
    <tr>
      <td>${escapeHtml(i.name)}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:end">${i.unitPrice.toFixed(2)}</td>
      <td style="text-align:end">${i.discountPct && i.discountPct > 0 ? `<span style="color:rgb(220,38,38)">(−${i.discountPct}%)</span>` : ""}</td>
      <td style="text-align:end">${i.lineTotal.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const discountBlock =
    data.discountAmount > 0
      ? `<div class="tot" style="color:rgb(220,38,38)"><span>Remise</span><span>−${data.discountAmount.toFixed(2)}</span></div>`
      : "";

  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>Receipt #${data.saleNumber}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 12px; max-width: 320px; margin: 0 auto; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 4px 2px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { text-align: start; font-weight: 600; }
  .tot { display:flex; justify-content: space-between; margin: 4px 0; }
  .muted { color: #666; font-size: 11px; text-align: center; margin-top: 12px; }
</style>
</head>
<body>
  <h1>${escapeHtml(store.name)}</h1>
  <div style="text-align:center;font-size:11px;margin-bottom:8px">${escapeHtml(store.address)}<br/>${escapeHtml(store.phone)}</div>
  <div style="font-size:11px;margin-bottom:8px">
    <div>إيصال #${data.saleNumber}</div>
    <div>${escapeHtml(data.date)}</div>
    <div>الكاشير: ${escapeHtml(data.cashierName)}</div>
    ${data.customerName ? `<div>العميل: ${escapeHtml(data.customerName)}</div>` : ""}
  </div>
  <table>
    <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th></th><th>المجموع</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:8px;font-size:12px">
    <div class="tot"><span>المجموع الفرعي</span><span>${data.subtotal.toFixed(2)}</span></div>
    ${data.taxTotal > 0 ? `<div class="tot"><span>الضريبة</span><span>${data.taxTotal.toFixed(2)}</span></div>` : ""}
    ${discountBlock}
    <div class="tot" style="font-weight:700;font-size:14px"><span>الإجمالي</span><span>${data.total.toFixed(2)}</span></div>
    <div class="tot"><span>المدفوع (${escapeHtml(data.paymentMethod)})</span><span>${data.amountPaid.toFixed(2)}</span></div>
    ${data.changeGiven > 0 ? `<div class="tot"><span>الباقي</span><span>${data.changeGiven.toFixed(2)}</span></div>` : ""}
  </div>
  <p class="muted">شكراً لزيارتكم</p>
</body>
</html>`);
  w.document.close();
  w.onload = () => {
    w.print();
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
