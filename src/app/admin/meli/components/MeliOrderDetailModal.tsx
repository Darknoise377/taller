'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Modal,
  Spin,
  Typography,
  Tag,
  Divider,
  Button,
  Card,
  Alert,
  message,
} from 'antd';
import {
  CarOutlined,
  CopyOutlined,
  ExportOutlined,
  FilePdfOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { formatCurrency } from '@/utils/formatCurrency';

const { Text } = Typography;

interface OrderDetailResponse {
  id: number;
  meliOrderId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  realCommission?: number | null;
  realShippingCost?: number | null;
  rawPayload?: {
    total_amount?: number;
    date_created?: string;
    buyer?: {
      first_name?: string;
      last_name?: string;
      nickname?: string;
      email?: string;
      phone?: { area_code?: string; number?: string } | string;
      billing_info?: { doc_type?: string; doc_number?: string };
    };
    shipping?: {
      status?: string;
      receiver_address?: {
        street_name?: string;
        street_number?: string;
        comment?: string;
        city?: { name: string } | string;
        state?: { name: string } | string;
        receiver_name?: string;
        receiver_phone?: string;
      };
    };
    order_items?: Array<{
      quantity?: number;
      unit_price?: number;
      full_unit_price?: number;
      sale_fee?: number;
      item?: { id?: string; title?: string; thumbnail?: string };
      localProduct?: { name: string; images?: string[]; stock: number };
      localCombo?: { name: string; imageUrl?: string };
    }>;
  };
  shipment?: {
    status?: string;
    tracking_number?: string;
    receiver_address?: {
      street_name?: string;
      street_number?: string;
      comment?: string;
      city?: { name: string } | string;
      state?: { name: string } | string;
      receiver_name?: string;
      receiver_phone?: string;
    };
  };
  labelUrl?: string | null;
}

interface MeliOrderDetailModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function MeliOrderDetailModal({
  orderId,
  open,
  onClose,
}: MeliOrderDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);

  useEffect(() => {
    if (!open || !orderId) {
      setOrderData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/admin/meli/orders/${orderId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'No se pudo cargar la orden');
        }
        return res.json() as Promise<{ order: OrderDetailResponse }>;
      })
      .then((data) => {
        if (isMounted) {
          setOrderData(data.order);
        }
      })
      .catch((err) => {
        if (isMounted) {
          message.error(err.message);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, orderId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copiado al portapapeles`);
  };

  if (!open) return null;

  const payload = orderData?.rawPayload;
  const buyer = payload?.buyer;
  const shipment = orderData?.shipment;
  const receiverAddr = shipment?.receiver_address || payload?.shipping?.receiver_address;
  const items = payload?.order_items || [];
  const totalAmount = payload?.total_amount || 0;
  const realCommission = orderData?.realCommission ?? 0;
  const realShipping = orderData?.realShippingCost ?? 0;
  const netLiquidation = totalAmount - realCommission - realShipping;

  const statusMap: Record<string, { label: string; color: string }> = {
    paid: { label: 'Pagada', color: 'success' },
    cancelled: { label: 'Cancelada', color: 'error' },
    payment_required: { label: 'Pago pendiente', color: 'warning' },
    partially_refunded: { label: 'Reembolso parcial', color: 'processing' },
    confirmed: { label: 'Confirmada', color: 'processing' },
  };

  const shippingStatusMap: Record<string, { label: string; color: string }> = {
    to_be_agreed: { label: 'Acordar con comprador', color: 'default' },
    pending: { label: 'Pendiente de despacho', color: 'warning' },
    ready_to_ship: { label: 'Listo para despachar', color: 'blue' },
    shipped: { label: 'En camino / Despachado', color: 'processing' },
    delivered: { label: 'Entregado al comprador', color: 'success' },
    not_delivered: { label: 'No entregado', color: 'error' },
    cancelled: { label: 'Envío cancelado', color: 'error' },
  };

  const rawStatus = orderData?.status?.toLowerCase() || '';
  const currentStatus = statusMap[rawStatus] || { label: rawStatus || 'Sin estado', color: 'default' };

  const rawShipStatus = shipment?.status || payload?.shipping?.status || 'to_be_agreed';
  const currentShipStatus = shippingStatusMap[rawShipStatus] || {
    label: rawShipStatus.replace(/_/g, ' ').toUpperCase(),
    color: 'default',
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(860px, 95vw)"
      styles={{
        body: { padding: '20px 24px', maxHeight: '82vh', overflowY: 'auto' },
      }}
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">Orden MeLi #{orderId}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined className="text-slate-400 hover:text-blue-600" />}
              onClick={() => copyToClipboard(orderId || '', 'ID de orden')}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tag color={currentStatus.color} className="uppercase font-semibold">
              {currentStatus.label}
            </Tag>
            <a
              href={`https://www.mercadolibre.com.co/ventas/${orderId}/detalle`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors font-medium"
            >
              Ver en Mercado Libre <ExportOutlined />
            </a>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-16 text-center">
          <Spin size="large" />
          <div className="mt-4 text-slate-500 font-medium">Cargando detalles de la orden...</div>
        </div>
      ) : !orderData ? (
        <Alert
          type="error"
          message="No se pudo cargar la orden"
          description="Verifica tu conexión y permisos de administrador."
        />
      ) : (
        <div className="space-y-6">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div>
              <Text type="secondary" className="text-xs uppercase font-medium">Fecha de Venta</Text>
              <div className="font-semibold text-slate-800 text-sm">
                {new Date(payload?.date_created || orderData.createdAt).toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <Text type="secondary" className="text-xs uppercase font-medium">Total Cobrado</Text>
              <div className="font-bold text-slate-900 text-base">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div>
              <Text type="secondary" className="text-xs uppercase font-medium">Comisión MeLi</Text>
              <div className="font-semibold text-red-600 text-sm">
                -{formatCurrency(realCommission)}
              </div>
            </div>
            <div>
              <Text type="secondary" className="text-xs uppercase font-medium">Neto Liquidado</Text>
              <div className="font-bold text-emerald-600 text-base">
                {formatCurrency(netLiquidation)}
              </div>
            </div>
          </div>

          {/* Section: Buyer & Shipping Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Card */}
            <Card
              size="small"
              className="shadow-none border-slate-200"
              title={
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <UserOutlined className="text-blue-600" /> Datos del Comprador
                </span>
              }
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500 text-xs">Nombre:</span>
                  <span className="font-medium text-slate-800">
                    {buyer?.first_name || buyer?.last_name
                      ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim()
                      : buyer?.nickname || 'Sin nombre registrado'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500 text-xs">Usuario MeLi:</span>
                  <span className="font-semibold text-blue-600">{buyer?.nickname || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500 text-xs">Email:</span>
                  <span className="text-slate-700 flex items-center gap-1 font-mono text-xs">
                    <MailOutlined className="text-slate-400" />
                    {buyer?.email || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500 text-xs">Teléfono:</span>
                  <span className="text-slate-800 font-medium flex items-center gap-1">
                    <PhoneOutlined className="text-slate-400" />
                    {typeof buyer?.phone === 'object'
                      ? `${buyer?.phone?.area_code || ''} ${buyer?.phone?.number || ''}`.trim()
                      : buyer?.phone || receiverAddr?.receiver_phone || '—'}
                  </span>
                </div>
                {buyer?.billing_info?.doc_number && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 text-xs">Documento / NIT:</span>
                    <span className="text-slate-800 font-medium">
                      {buyer?.billing_info?.doc_type || 'CC'}: {buyer?.billing_info?.doc_number}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Shipping Card */}
            <Card
              size="small"
              className="shadow-none border-slate-200"
              title={
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CarOutlined className="text-emerald-600" /> Envío y Destino
                </span>
              }
              extra={
                <Tag color={currentShipStatus.color} className="text-xs uppercase">
                  {currentShipStatus.label}
                </Tag>
              }
            >
              {receiverAddr ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 py-1 border-b border-slate-100">
                    <EnvironmentOutlined className="text-slate-400 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-800">
                        {receiverAddr.street_name || ''} {receiverAddr.street_number || ''}
                      </div>
                      {receiverAddr.comment && (
                        <div className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200/50">
                          <strong>Indicaciones:</strong> {receiverAddr.comment}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">Ciudad / Depto:</span>
                    <span className="font-medium text-slate-800">
                      {typeof receiverAddr.city === 'object' ? receiverAddr.city?.name : receiverAddr.city || '—'},{' '}
                      {typeof receiverAddr.state === 'object' ? receiverAddr.state?.name : receiverAddr.state || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">Destinatario:</span>
                    <span className="font-medium text-slate-800">
                      {receiverAddr.receiver_name || buyer?.nickname || '—'}
                      {receiverAddr.receiver_phone ? ` (${receiverAddr.receiver_phone})` : ''}
                    </span>
                  </div>

                  {shipment?.tracking_number && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500 text-xs">Número de Guía:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {shipment.tracking_number}
                      </span>
                    </div>
                  )}

                  {orderData.labelUrl && (
                    <div className="pt-2">
                      <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        href={orderData.labelUrl}
                        target="_blank"
                        size="small"
                        className="bg-emerald-600 hover:bg-emerald-700 w-full"
                      >
                        Imprimir Etiqueta de Envío
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs">
                  Sin información de despacho registrada (puede ser entrega a convenir o retiro en persona).
                </div>
              )}
            </Card>
          </div>

          {/* Section: Order Items List */}
          <Card
            size="small"
            className="shadow-none border-slate-200"
            title={
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShopOutlined className="text-blue-600" /> Productos Vendidos ({items.length})
              </span>
            }
          >
            <div className="divide-y divide-slate-100">
              {items.map((it, idx) => {
                const title = it?.item?.title || 'Producto sin título';
                const qty = it?.quantity ?? 1;
                const unitPrice = it?.unit_price || it?.full_unit_price || 0;
                const lineTotal = unitPrice * qty;
                const localProd = it?.localProduct;
                const localCombo = it?.localCombo;
                const thumb =
                  localProd?.images?.[0] || localCombo?.imageUrl || it?.item?.thumbnail;

                return (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">
                            <ShopOutlined />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate max-w-md">
                          {title}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Cant: <strong>{qty}</strong></span>
                          <span>·</span>
                          <span>Unitario: {formatCurrency(unitPrice)}</span>
                          {localProd && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                                Stock tienda: {localProd.stock}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(lineTotal)}
                      </div>
                      {it.sale_fee ? (
                        <div className="text-[11px] text-red-500">
                          Comisión: -{formatCurrency(it.sale_fee * qty)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Financial Breakdown */}
          <Card size="small" className="shadow-none border-slate-200 bg-slate-50/50">
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal venta (cobrado al cliente):</span>
                <span className="font-semibold text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Comisión retenida por Mercado Libre:</span>
                <span className="font-semibold">-{formatCurrency(realCommission)}</span>
              </div>
              {realShipping > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Costo de flete asumido por el vendedor (Envío Gratis):</span>
                  <span className="font-semibold">-{formatCurrency(realShipping)}</span>
                </div>
              )}
              <Divider className="!my-2" />
              <div className="flex justify-between text-base font-bold text-emerald-700">
                <span>Total Neto acreditado en Mercado Pago:</span>
                <span>{formatCurrency(netLiquidation)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
