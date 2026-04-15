import { useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';

import type { Order, OrderProduct } from '@/types/order';

type OrderExportRow = {
  orderId: number;
  createdAt: string;
  status: string;
  paymentMethod: string;
  referenceCode?: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  cedula?: string;
  address: string;
  city: string;
  department?: string;
  postalCode?: string;
  sellerName?: string;
  sellerCode?: string;
  promoCodeApplied?: string;
  total: number;
};

/**
 * jsPDF con la fuente default no soporta bien algunos caracteres Unicode.
 * Normalizamos a ASCII (sin tildes) para que el PDF sea estable.
 */
const sanitizeForPdf = (text: string | null | undefined): string => {
  if (!text) return '';
  const asciiOnly = text.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑ]/g, ' ').trim();
  return asciiOnly.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const formatMoneyCOP = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;

const translateOrderStatus = (status: string | null | undefined) => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'APPROVED':
      return 'Aprobada';
    case 'DECLINED':
      return 'Rechazada';
    case 'SHIPPED':
      return 'Enviada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status || '';
  }
};

const translatePaymentMethod = (method: string | null | undefined) => {
  switch (method) {
    case 'PAYU':
      return 'PayU';
    case 'CONTRAENTREGA':
      return 'Contraentrega';
    default:
      return method || '';
  }
};

const buildOrderExportRow = (order: Order): OrderExportRow => ({
  orderId: order.id,
  createdAt: order.createdAt,
  status: translateOrderStatus(order.status),
  paymentMethod: translatePaymentMethod(order.paymentMethod),
  referenceCode: order.referenceCode,
  customerName: order.customerName || 'Sin nombre',
  customerEmail: order.customerEmail || 'Sin email',
  phone: order.phone || 'Sin teléfono',
  cedula: order.cedula || undefined,
  address: order.address || 'Sin dirección',
  city: order.city || 'Sin ciudad',
  department: order.department || undefined,
  postalCode: order.postalCode || undefined,
  sellerName: order.seller?.name || undefined,
  sellerCode: order.seller?.code || undefined,
  promoCodeApplied: order.promoCodeApplied || undefined,
  total: order.total ?? 0,
});

const getOrderItemsTotals = (items: OrderProduct[]) => {
  const subtotal = (items || []).reduce((sum, item) => {
    const unit = item.product?.price ?? 0;
    const qty = item.quantity ?? 0;
    return sum + unit * qty;
  }, 0);
  return { subtotal };
};

export const useOrderExporter = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async (format: 'excel' | 'pdf', ordersToExport: Order[]) => {
    if (ordersToExport.length === 0) {
      message.warning('No hay órdenes para exportar.');
      return;
    }

    setIsDownloading(true);

    try {
      const orders = [...ordersToExport].sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
      );

      if (format === 'excel') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();

        workbook.creator = 'TALLER DE MOTOS A&R Admin';
        workbook.created = new Date();

        // Sheet 1: Órdenes (resumen con datos de envío)
        const sheetOrders = workbook.addWorksheet('Órdenes', {
          properties: { defaultRowHeight: 18 },
          views: [{ state: 'frozen', ySplit: 1 }],
        });

        const ordersHeader = [
          'ID',
          'Fecha',
          'Estado',
          'Pago',
          'Referencia',
          'Cliente',
          'Email',
          'Teléfono',
          'Cédula',
          'Dirección',
          'Ciudad',
          'Departamento',
          'Postal',
          'Vendedor',
          'Código vendedor',
          'Promo',
          'Total',
        ];

        sheetOrders.addRow(ordersHeader);
        const ordersHeaderRow = sheetOrders.getRow(1);
        ordersHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ordersHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        ordersHeaderRow.height = 22;
        ordersHeaderRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF374151' } },
            left: { style: 'thin', color: { argb: 'FF374151' } },
            bottom: { style: 'thin', color: { argb: 'FF374151' } },
            right: { style: 'thin', color: { argb: 'FF374151' } },
          };
        });

        sheetOrders.columns = [
          { width: 10 },
          { width: 18 },
          { width: 14 },
          { width: 16 },
          { width: 22 },
          { width: 24 },
          { width: 28 },
          { width: 16 },
          { width: 16 },
          { width: 35 },
          { width: 18 },
          { width: 18 },
          { width: 10 },
          { width: 18 },
          { width: 16 },
          { width: 14 },
          { width: 14 },
        ];

        let grandTotal = 0;
        for (const order of orders) {
          const row = buildOrderExportRow(order);
          grandTotal += row.total || 0;

          const values = [
            row.orderId,
            dayjs(row.createdAt).format('DD/MM/YYYY HH:mm'),
            row.status,
            row.paymentMethod,
            row.referenceCode || '-',
            row.customerName,
            row.customerEmail,
            row.phone,
            row.cedula || '-',
            row.address,
            row.city,
            row.department || '-',
            row.postalCode || '-',
            row.sellerName || '-',
            row.sellerCode || '-',
            row.promoCodeApplied || '-',
            row.total || 0,
          ];

          const added = sheetOrders.addRow(values);
          added.alignment = { vertical: 'top', wrapText: true };
          added.getCell(17).numFmt = '$#,##0';
        }

        sheetOrders.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: ordersHeader.length },
        };

        sheetOrders.addRow([]);
        const totalRow = sheetOrders.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'TOTAL', grandTotal]);
        totalRow.getCell(16).font = { bold: true };
        totalRow.getCell(17).font = { bold: true };
        totalRow.getCell(17).numFmt = '$#,##0';
        totalRow.getCell(16).alignment = { horizontal: 'right' };

        // Sheet 2: Items
        const sheetItems = workbook.addWorksheet('Items', {
          properties: { defaultRowHeight: 18 },
          views: [{ state: 'frozen', ySplit: 1 }],
        });

        const itemsHeader = [
          'ID Orden',
          'Fecha',
          'Cliente',
          'Email',
          'Teléfono',
          'Producto',
          'Cantidad',
          'Precio unitario',
          'Subtotal',
        ];
        sheetItems.addRow(itemsHeader);
        const itemsHeaderRow = sheetItems.getRow(1);
        itemsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        itemsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
        itemsHeaderRow.height = 22;
        itemsHeaderRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0F766E' } },
            left: { style: 'thin', color: { argb: 'FF0F766E' } },
            bottom: { style: 'thin', color: { argb: 'FF0F766E' } },
            right: { style: 'thin', color: { argb: 'FF0F766E' } },
          };
        });

        sheetItems.columns = [
          { width: 10 },
          { width: 18 },
          { width: 24 },
          { width: 28 },
          { width: 16 },
          { width: 40 },
          { width: 12 },
          { width: 16 },
          { width: 16 },
        ];

        for (const order of orders) {
          const createdAt = dayjs(order.createdAt).format('DD/MM/YYYY HH:mm');
          for (const item of order.products || []) {
            const productName = item.product?.name || 'Sin nombre';
            const unit = item.product?.price ?? 0;
            const qty = item.quantity ?? 0;
            const subtotal = unit * qty;

            const row = sheetItems.addRow([
              order.id,
              createdAt,
              order.customerName || 'Sin nombre',
              order.customerEmail || 'Sin email',
              order.phone || 'Sin teléfono',
              productName,
              qty,
              unit,
              subtotal,
            ]);
            row.alignment = { vertical: 'top', wrapText: true };
            row.getCell(8).numFmt = '$#,##0';
            row.getCell(9).numFmt = '$#,##0';
          }
        }

        sheetItems.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: itemsHeader.length },
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ordenes_envio_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
        link.click();
        message.success('Excel generado correctamente.');
      }

      if (format === 'pdf') {
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.default;
        const autoTable = (await import('jspdf-autotable')).default;

        // A4 portrait tipo guía/packing slip
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;
        const headerColor: [number, number, number] = [17, 24, 39];
        const accentColor: [number, number, number] = [15, 118, 110];

        const drawHeader = (order: Order, pageIndex: number, totalPages: number) => {
          doc.setFillColor(...headerColor);
          doc.rect(0, 0, pageWidth, 22, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.text('TALLER DE MOTOS A&R', marginX, 14);

          doc.setFontSize(10);
          doc.text('Orden de envío / Packing slip', marginX, 19);

          doc.setFontSize(12);
          doc.text(`Orden #${order.id}`, pageWidth - marginX, 14, { align: 'right' });

          doc.setFontSize(9);
          doc.text(`Fecha: ${dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}`, pageWidth - marginX, 19, {
            align: 'right',
          });

          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.text(`Página ${pageIndex}/${totalPages}`, pageWidth - marginX, 28, { align: 'right' });
        };

        const drawInfoBlocks = (order: Order, startY: number) => {
          const boxGap = 6;
          const boxWidth = (pageWidth - marginX * 2 - boxGap) / 2;
          const boxHeight = 32;

          const leftX = marginX;
          const rightX = marginX + boxWidth + boxGap;

          doc.setDrawColor(229, 231, 235);
          doc.setFillColor(248, 250, 252);

          // Cliente
          doc.roundedRect(leftX, startY, boxWidth, boxHeight, 2, 2, 'FD');
          doc.setTextColor(...accentColor);
          doc.setFontSize(10);
          doc.text('Datos del cliente', leftX + 3, startY + 6);

          doc.setTextColor(17, 24, 39);
          doc.setFontSize(9);
          doc.text(`Nombre: ${sanitizeForPdf(order.customerName)}`, leftX + 3, startY + 12);
          doc.text(`Email: ${sanitizeForPdf(order.customerEmail)}`, leftX + 3, startY + 17);
          doc.text(`Tel: ${sanitizeForPdf(order.phone)}`, leftX + 3, startY + 22);
          if (order.cedula) doc.text(`C.C: ${sanitizeForPdf(order.cedula)}`, leftX + 3, startY + 27);

          // Envío
          doc.roundedRect(rightX, startY, boxWidth, boxHeight, 2, 2, 'FD');
          doc.setTextColor(...accentColor);
          doc.setFontSize(10);
          doc.text('Dirección de envío', rightX + 3, startY + 6);

          // Texto del envío en color acento (más legible y consistente con el título)
          doc.setTextColor(...accentColor);
          doc.setFontSize(9);
          doc.text(sanitizeForPdf(order.address), rightX + 3, startY + 12);

          const cityLine = `${sanitizeForPdf(order.city)}${
            order.department ? `, ${sanitizeForPdf(order.department)}` : ''
          }`;
          doc.text(cityLine, rightX + 3, startY + 17);
          doc.text(`Postal: ${sanitizeForPdf(order.postalCode || '-')}`, rightX + 3, startY + 22);

          // Meta
          const metaY = startY + boxHeight + 8;
          doc.setTextColor(17, 24, 39);
          doc.setFontSize(9);

          const status = translateOrderStatus(order.status);
          const payment = translatePaymentMethod(order.paymentMethod);
          const seller = order.seller ? `${order.seller.name} (${order.seller.code})` : '-';
          const promo = order.promoCodeApplied || '-';
          const ref = order.referenceCode || '-';

          doc.text(`Estado: ${sanitizeForPdf(status)}`, leftX, metaY);
          doc.text(`Pago: ${sanitizeForPdf(payment)}`, leftX, metaY + 5);
          doc.text(`Referencia: ${sanitizeForPdf(ref)}`, leftX, metaY + 10);

          doc.text(`Vendedor: ${sanitizeForPdf(seller)}`, rightX, metaY);
          doc.text(`Promoción: ${sanitizeForPdf(promo)}`, rightX, metaY + 5);

          return metaY + 10;
        };

        const totalOrders = orders.length;
        let orderIndex = 0;

        for (const order of orders) {
          orderIndex += 1;
          if (orderIndex > 1) doc.addPage();

          drawHeader(order, orderIndex, totalOrders);

          let cursorY = 32;
          cursorY = drawInfoBlocks(order, cursorY) + 6;

          const items = order.products || [];
          const rows = items.map((item) => {
            const productName = sanitizeForPdf(item.product?.name || 'Sin nombre');
            const qty = item.quantity ?? 0;
            const unit = item.product?.price ?? 0;
            const sub = unit * qty;
            return [productName, String(qty), formatMoneyCOP(unit), formatMoneyCOP(sub)];
          });

          autoTable(doc, {
            startY: cursorY,
            head: [['Producto', 'Cant.', 'Precio unit.', 'Subtotal']],
            body: rows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2.2 },
            headStyles: { fillColor: headerColor, textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
              0: { cellWidth: 110 },
              1: { halign: 'center', cellWidth: 20 },
              2: { halign: 'right', cellWidth: 30 },
              3: { halign: 'right', cellWidth: 30 },
            },
            margin: { left: marginX, right: marginX },
          });

          const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
          const afterTableY = (lastAutoTable?.finalY ?? cursorY) + 6;

          const { subtotal } = getOrderItemsTotals(items);
          const total = order.total ?? subtotal;

          doc.setTextColor(17, 24, 39);
          doc.setFontSize(10);
          doc.text('Resumen', marginX, afterTableY + 6);

          doc.setFontSize(9);
          doc.text('Subtotal:', pageWidth - marginX - 60, afterTableY + 6);
          doc.text(formatMoneyCOP(subtotal), pageWidth - marginX, afterTableY + 6, { align: 'right' });

          doc.setFontSize(11);
          doc.setTextColor(...accentColor);
          doc.text('Total:', pageWidth - marginX - 60, afterTableY + 12);
          doc.text(formatMoneyCOP(total), pageWidth - marginX, afterTableY + 12, { align: 'right' });

          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.text(
            `Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}  ·  Documento informativo para preparación de envío`,
            marginX,
            290
          );
        }

        doc.save(`ordenes_envio_${dayjs().format('YYYYMMDD_HHmm')}.pdf`);
        message.success('PDF generado correctamente.');
      }
    } catch (error) {
      console.error('[ORDER EXPORT ERROR]', error);
      message.error('Ocurrió un error al generar el reporte.');
    } finally {
      setIsDownloading(false);
    }
  };

  return { isDownloading, downloadReport };
};
