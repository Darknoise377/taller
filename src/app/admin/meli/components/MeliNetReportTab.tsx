'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Select,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import { MELI_COMMISSION_RATES } from '@/lib/meli/pricing';
import type { MeliConfig, MeliOrderRow, MeliStatus } from '../types';

const { Text } = Typography;

interface NetReportRow {
  key: string;
  meliOrderId: string;
  productName: string;
  status: string;
  grossAmount: number;
  commissionRate: number;
  meliCommission: number;
  isCommissionReal: boolean;
  shippingCost: number;
  isShippingReal: boolean;
  extraMargin: number;
  netAmount: number;
  saleDate: string;
}

interface MeliNetReportTabProps {
  status: MeliStatus | null;
  orders: MeliOrderRow[];
  config: MeliConfig | null;
  loading?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'Pagada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'error' },
  payment_required: { label: 'Pago pendiente', color: 'warning' },
  partially_refunded: { label: 'Reembolso parcial', color: 'processing' },
  confirmed: { label: 'Confirmada', color: 'processing' },
};

function formatOrderProducts(payload: NonNullable<MeliOrderRow['rawPayload']> | null | undefined): string {
  if (!payload?.order_items?.length) return 'Sin detalle de producto';

  return payload.order_items
    .map((orderItem) => {
      const title = orderItem?.item?.title?.trim();
      if (!title) return null;
      const quantity = orderItem?.quantity ?? 1;
      return quantity > 1 ? `${title} (x${quantity})` : title;
    })
    .filter(Boolean)
    .join(', ');
}

export default function MeliNetReportTab({
  status,
  orders,
  config,
  loading = false,
}: MeliNetReportTabProps) {
  const [selectedListingType, setSelectedListingType] = React.useState<string>(
    config?.defaultListingType ?? 'gold_special',
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      message.warning('No hay datos para exportar.');
      return;
    }
    setIsExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'TALLER DE MOTOS A&R Admin';
      wb.created = new Date();
      const ws = wb.addWorksheet('Reporte Neto MeLi');

      ws.columns = [
        { header: 'Orden ID', key: 'meliOrderId', width: 22 },
        { header: 'Producto', key: 'productName', width: 50 },
        { header: 'Estado', key: 'status', width: 20 },
        { header: 'Vendido (Bruto)', key: 'grossAmount', width: 18 },
        { header: 'Comisión MeLi', key: 'meliCommission', width: 18 },
        { header: 'Envío', key: 'shippingCost', width: 16 },
        { header: 'Margen extra', key: 'extraMargin', width: 16 },
        { header: 'Neto (Liquidado)', key: 'netAmount', width: 18 },
        { header: 'Fecha venta', key: 'saleDate', width: 16 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2A66' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      reportData.forEach((row) => {
        ws.addRow({
          meliOrderId: row.meliOrderId,
          productName: row.productName,
          status: row.status,
          grossAmount: row.grossAmount,
          meliCommission: row.meliCommission,
          shippingCost: row.shippingCost,
          extraMargin: row.extraMargin,
          netAmount: row.netAmount,
          saleDate: row.saleDate,
        });
      });

      const totalsRow = ws.addRow({
        meliOrderId: 'TOTAL',
        productName: '',
        status: '',
        grossAmount: totals.grossAmount,
        meliCommission: totals.meliCommission,
        shippingCost: totals.shippingCost,
        extraMargin: totals.extraMargin,
        netAmount: totals.netAmount,
        saleDate: '',
      });
      totalsRow.font = { bold: true };

      ws.autoFilter = { from: 'A1', to: 'I1' };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_neto_meli_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`${reportData.length} órdenes exportadas correctamente.`);
    } catch (err) {
      console.error('Error exportando reporte neto:', err);
      message.error('Error al exportar a Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const reportData: NetReportRow[] = useMemo(() => {
    const extraMargin = config?.extraMarginPercent ?? 0;
    const fallbackShippingCost = config?.fixedCostCOP ?? 3500;

    // Excluir órdenes canceladas: no generan ingresos netos efectivos
    const activeOrders = orders.filter((o) => o.status !== 'cancelled');

    return activeOrders.map((order) => {
      const grossAmount = order.rawPayload?.total_amount || 0;

      // Preferir datos REALES que MeLi ya calculó (payments[].marketplace_fee y
      // shipment.order_cost) en vez de re-estimar con una comisión/costo fijos que
      // no reflejan lo que realmente se liquida por pedido.
      const isCommissionReal = order.realCommission != null;
      const commissionRate = MELI_COMMISSION_RATES[selectedListingType] ?? 16.5;
      const meliCommission = isCommissionReal
        ? (order.realCommission as number)
        : Math.round((grossAmount * commissionRate) / 100);

      const isShippingReal = order.realShippingCost != null;
      const shippingCost = isShippingReal ? (order.realShippingCost as number) : fallbackShippingCost;

      const extraMarginAmount = Math.round((grossAmount * extraMargin) / 100);
      const netAmount = grossAmount - meliCommission - shippingCost - extraMarginAmount;
      const saleDate = new Date(
        order.rawPayload?.date_created ?? order.createdAt,
      ).toLocaleDateString('es-CO');

      return {
        key: order.meliOrderId,
        meliOrderId: order.meliOrderId,
        productName: formatOrderProducts(order.rawPayload),
        status: order.status,
        grossAmount,
        commissionRate,
        meliCommission,
        isCommissionReal,
        shippingCost,
        isShippingReal,
        extraMargin: extraMarginAmount,
        netAmount,
        saleDate,
      };
    });
  }, [orders, config, selectedListingType]);

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        grossAmount: acc.grossAmount + row.grossAmount,
        meliCommission: acc.meliCommission + row.meliCommission,
        shippingCost: acc.shippingCost + row.shippingCost,
        extraMargin: acc.extraMargin + row.extraMargin,
        netAmount: acc.netAmount + row.netAmount,
      }),
      {
        grossAmount: 0,
        meliCommission: 0,
        shippingCost: 0,
        extraMargin: 0,
        netAmount: 0,
      },
    );
  }, [reportData]);

  const columns: ColumnsType<NetReportRow> = [
    {
      title: 'Orden',
      dataIndex: 'meliOrderId',
      key: 'meliOrderId',
      width: 180,
      render: (id: string, row: NetReportRow) => (
        <div>
          <Text strong>#{id.slice(-8)}</Text>
          <div className="text-xs text-slate-500 mt-0.5">{row.productName}</div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const normalized = status?.toLowerCase?.() ?? '';
        const mapped = STATUS_LABELS[normalized] ?? {
          label: normalized ? normalized.replace(/_/g, ' ') : 'Sin estado',
          color: 'default',
        };
        return <Tag color={mapped.color}>{mapped.label.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Vendido (Bruto)',
      dataIndex: 'grossAmount',
      key: 'grossAmount',
      width: 140,
      align: 'right',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Comisión MeLi',
      dataIndex: 'meliCommission',
      key: 'meliCommission',
      width: 130,
      align: 'right',
      render: (v: number, row: NetReportRow) =>
        `${formatCurrency(v)} (${row.commissionRate}%)`,
    },
    {
      title: 'Envío',
      dataIndex: 'shippingCost',
      key: 'shippingCost',
      width: 120,
      align: 'right',
      render: (v: number, row: NetReportRow) =>
        `${formatCurrency(v)}${row.isShippingReal ? '' : ' (fijo)'}`,
    },
    {
      title: 'Margen extra',
      dataIndex: 'extraMargin',
      key: 'extraMargin',
      width: 120,
      align: 'right',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Neto (Liquidado)',
      dataIndex: 'netAmount',
      key: 'netAmount',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>
          {formatCurrency(v)}
        </Text>
      ),
    },
    {
      title: 'Fecha venta',
      dataIndex: 'saleDate',
      key: 'saleDate',
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      {!status?.connected && (
        <Text type="warning" className="block mb-2 text-sm">
          Conecta tu cuenta de MeLi para obtener datos financieros completos.
        </Text>
      )}

      {/* ── Resumen financiero ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
            <Statistic
              title="Total Vendido (Bruto)"
              value={totals.grossAmount}
              prefix="$"
              valueStyle={{ color: '#0A2A66', fontWeight: 700 }}
              groupSeparator="."
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#fff1f0', border: '1px solid #ffa39e' }}>
            <Statistic
              title="Comisión MeLi"
              value={totals.meliCommission}
              prefix="$"
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              groupSeparator="."
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#fff7e6', border: '1px solid #ffd591' }}>
            <Statistic
              title="Envíos + Margen extra"
              value={totals.shippingCost + totals.extraMargin}
              prefix="$"
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
              groupSeparator="."
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Statistic
              title="Neto (Liquidado)"
              value={totals.netAmount}
              prefix="$"
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
              groupSeparator="."
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla de reporte ── */}
      <Card
        title={
          <Space>
            <span>Detalle por orden</span>
            <Select
              size="small"
              value={selectedListingType}
              onChange={setSelectedListingType}
              options={[
                { value: 'gold_special', label: 'Clásica (16.5%)' },
                { value: 'gold_premium', label: 'Premium (18.5%)' },
                { value: 'free', label: 'Gratuita (0%)' },
              ]}
              style={{ width: 160 }}
            />
          </Space>
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            size="small"
            loading={isExporting}
            onClick={handleExportExcel}
          >
            Exportar
          </Button>
        }
      >
        <Table
          dataSource={reportData}
          columns={columns}
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} órdenes` }}
          scroll={{ x: 'max-content' }}
          rowKey="key"
          sticky
        />
      </Card>
    </div>
  );
}
