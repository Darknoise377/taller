'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  InputNumber,
  Form,
  Space,
  Typography,
  Tag,
  Alert,
  Divider,
  message,
  Card,
  Image,
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { FaWhatsapp } from 'react-icons/fa';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/formatCurrency';

interface PaymentLinkModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

interface GeneratedLinkData {
  paymentUrl: string;
  referenceCode: string;
  orderId: number;
  total: number;
  currency: string;
  waMessage: string;
  customerPhone?: string;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  open,
  product,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedLinkData | null>(null);
  const [copied, setCopied] = useState(false);

  // Valores dinámicos del formulario
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [shippingCost, setShippingCost] = useState<number>(0);

  // Inicializar o resetear cuando se abra el modal
  useEffect(() => {
    if (open && product) {
      const basePrice = Number(product.price) || 0;
      setUnitPrice(basePrice);
      setQuantity(1);
      setShippingCost(0);
      setGeneratedData(null);
      setCopied(false);
      form.setFieldsValue({
        unitPrice: basePrice,
        quantity: 1,
        shippingCost: 0,
        customerName: '',
        customerPhone: '',
        notes: product.stock <= 0 ? 'Venta de producto agotado / bajo pedido' : '',
      });
    }
  }, [open, product, form]);

  // Cálculo del total en vivo
  const total = useMemo(() => {
    return Math.max(0, unitPrice * quantity + shippingCost);
  }, [unitPrice, quantity, shippingCost]);

  // Manejador para generar el enlace
  const handleGenerateLink = async () => {
    if (!product) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      const res = await fetch('/api/admin/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          unitPrice: values.unitPrice,
          quantity: values.quantity,
          shippingCost: values.shippingCost || 0,
          customerName: values.customerName?.trim() || undefined,
          customerPhone: values.customerPhone?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo generar el enlace de pago');
      }

      setGeneratedData(data);
      message.success('¡Enlace de pago generado con éxito!');
    } catch (err: unknown) {
      console.error('Error generating link:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Copiar al portapapeles
  const handleCopy = (text: string) => {
    if (!navigator?.clipboard) {
      message.error('El portapapeles no está disponible');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('¡Enlace copiado al portapapeles!');
    setTimeout(() => setCopied(false), 3000);
  };

  // Enviar a WhatsApp
  const handleSendWhatsApp = () => {
    if (!generatedData) return;

    let phone = (generatedData.customerPhone || '').replace(/\D/g, '');
    // Si tiene 10 dígitos y empieza por 3 (Colombia), anteponer 57
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = `57${phone}`;
    }

    const encodedMessage = encodeURIComponent(generatedData.waMessage);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (!product) return null;

  const isAgotado = (product.stock ?? 0) <= 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnClose
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              background: '#0A2A66',
              color: '#ffffff',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarCircleOutlined style={{ fontSize: 18 }} />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 16, display: 'block', color: '#0A2A66' }}>
              Generar Link de Pago (Wompi)
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Venta directa por WhatsApp o productos bajo pedido
            </Typography.Text>
          </div>
        </div>
      }
    >
      <div style={{ marginTop: 16 }}>
        {/* Tarjeta de resumen del Producto */}
        <Card
          size="small"
          style={{
            background: isAgotado ? '#fffbe6' : '#f8fafc',
            borderColor: isAgotado ? '#ffe58f' : '#e2e8f0',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Image
              width={64}
              height={64}
              src={product.imageUrl || product.images?.[0]}
              alt={product.name}
              style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
              fallback="/placeholder.png"
              preview={false}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Typography.Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                  {product.name}
                </Typography.Text>
                {isAgotado ? (
                  <Tag color="warning" icon={<WarningOutlined />} style={{ fontWeight: 600 }}>
                    Agotado (Venta especial / Bajo pedido)
                  </Tag>
                ) : (
                  <Tag color="green" icon={<ShopOutlined />}>
                    Stock actual: {product.stock}
                  </Tag>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                <span>
                  Precio catálogo:{' '}
                  <strong style={{ color: '#0A2A66' }}>{formatCurrency(product.price)}</strong>
                </span>
                {product.sku && (
                  <span>
                    SKU: <code>{product.sku}</code>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Alerta informativa si está agotado */}
        {isAgotado && !generatedData && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, fontSize: 12 }}
            message="Venta de producto sin inventario"
            description="Puedes generar el link de cobro sin problema. Esto registrará una orden pendiente en el sistema para que apartes el producto o lo traigas de tu proveedor."
          />
        )}

        {!generatedData ? (
          /* Formulario de Configuración del Link */
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              unitPrice: product.price,
              quantity: 1,
              shippingCost: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <Form.Item
                label="Precio unitario a cobrar ($ COP)"
                name="unitPrice"
                rules={[{ required: true, message: 'Ingresa el precio' }]}
                tooltip="Puedes ajustar el precio si acordaste un descuento con el cliente"
              >
                <InputNumber<number>
                  min={100}
                  step={1000}
                  style={{ width: '100%' }}
                  formatter={(val) =>
                    val !== undefined ? `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                  }
                  parser={(val) => (val ? Number(val.replace(/\$\s?|(\.*)/g, '')) : 0)}
                  onChange={(val) => setUnitPrice(val || 0)}
                />
              </Form.Item>

              <Form.Item
                label="Cantidad"
                name="quantity"
                rules={[{ required: true, message: 'Ingresa la cantidad' }]}
              >
                <InputNumber
                  min={1}
                  max={999}
                  style={{ width: '100%' }}
                  onChange={(val) => setQuantity(val || 1)}
                />
              </Form.Item>

              <Form.Item
                label="Costo de envío ($ COP)"
                name="shippingCost"
                tooltip="Ingresa 0 si el envío es gratis o si el cliente lo paga contraentrega al recibir"
              >
                <InputNumber<number>
                  min={0}
                  step={1000}
                  style={{ width: '100%' }}
                  formatter={(val) =>
                    val !== undefined ? `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                  }
                  parser={(val) => (val ? Number(val.replace(/\$\s?|(\.*)/g, '')) : 0)}
                  onChange={(val) => setShippingCost(val || 0)}
                />
              </Form.Item>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Datos opcionales del cliente para personalizar el WhatsApp */}
            <Typography.Text
              strong
              style={{ fontSize: 13, color: '#334155', display: 'block', marginBottom: 8 }}
            >
              Datos del Cliente (Opcionales para agilizar WhatsApp)
            </Typography.Text>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="Nombre del cliente" name="customerName">
                <Input placeholder="Ej. Carlos Rodríguez" />
              </Form.Item>

              <Form.Item
                label="Celular WhatsApp"
                name="customerPhone"
                tooltip="Si lo ingresas, el botón de WhatsApp abrirá directamente el chat con este número"
              >
                <Input placeholder="Ej. 3101234567" maxLength={15} />
              </Form.Item>
            </div>

            <Form.Item
              label="Notas u observación interna"
              name="notes"
              style={{ marginBottom: 16 }}
            >
              <Input placeholder="Ej. Apartado para entrega el viernes / Venta WhatsApp" />
            </Form.Item>

            {/* Resumen del cobro destacado */}
            <div
              style={{
                background: '#0A2A66',
                color: '#ffffff',
                padding: '14px 18px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 12, opacity: 0.85, display: 'block' }}>
                  Total que pagará el cliente:
                </span>
                <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                  {formatCurrency(total)}
                </span>
              </div>
              <Tag
                color="cyan"
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, margin: 0 }}
              >
                Pasarela Segura Wompi
              </Tag>
            </div>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>Cancelar</Button>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                loading={loading}
                onClick={handleGenerateLink}
                style={{
                  background: '#0A2A66',
                  borderColor: '#0A2A66',
                  fontWeight: 600,
                  height: 40,
                  padding: '0 20px',
                }}
              >
                Generar Link de Pago
              </Button>
            </Space>
          </Form>
        ) : (
          /* Pantalla de Éxito: Enlace Generado y Botones de Acción */
          <div style={{ padding: '8px 0' }}>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined style={{ fontSize: 20 }} />}
              message={<strong style={{ fontSize: 15 }}>¡Enlace de Pago Creado con Éxito!</strong>}
              description={
                <span>
                  Orden registrada: <strong>{generatedData.referenceCode}</strong> por valor de{' '}
                  <strong>{formatCurrency(generatedData.total)}</strong>.
                </span>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
            />

            {/* Caja con el Enlace */}
            <div style={{ marginBottom: 16 }}>
              <Typography.Text
                strong
                style={{ fontSize: 13, color: '#334155', display: 'block', marginBottom: 6 }}
              >
                Enlace de pago para el cliente:
              </Typography.Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  value={generatedData.paymentUrl}
                  readOnly
                  style={{
                    background: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 500,
                  }}
                />
                <Button
                  icon={
                    copied ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CopyOutlined />
                    )
                  }
                  onClick={() => handleCopy(generatedData.paymentUrl)}
                  style={{
                    minWidth: 120,
                    fontWeight: 600,
                    borderColor: copied ? '#52c41a' : undefined,
                    color: copied ? '#52c41a' : undefined,
                  }}
                >
                  {copied ? '¡Copiado!' : 'Copiar Link'}
                </Button>
              </div>
            </div>

            {/* Vista previa del mensaje de WhatsApp */}
            <Card
              size="small"
              style={{
                background: '#f0fdf4',
                borderColor: '#bbf7d0',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <FaWhatsapp style={{ color: '#25D366', fontSize: 16 }} />
                <Typography.Text strong style={{ fontSize: 12, color: '#166534' }}>
                  Mensaje listo para enviar por WhatsApp:
                </Typography.Text>
              </div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                  color: '#1e293b',
                  fontFamily: 'inherit',
                  background: '#ffffff',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #dcfce7',
                }}
              >
                {generatedData.waMessage}
              </pre>
            </Card>

            {/* Botones de acción principales */}
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Button
                  type="primary"
                  icon={<FaWhatsapp style={{ fontSize: 17, marginRight: 4 }} />}
                  onClick={handleSendWhatsApp}
                  style={{
                    background: '#25D366',
                    borderColor: '#25D366',
                    color: '#ffffff',
                    fontWeight: 600,
                    height: 42,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Enviar por WhatsApp
                </Button>

                <Button
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(generatedData.waMessage)}
                  style={{ height: 42, fontWeight: 500 }}
                >
                  Copiar Todo el Mensaje
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                }}
              >
                <Button
                  type="link"
                  icon={<ArrowRightOutlined />}
                  onClick={() =>
                    window.open(generatedData.paymentUrl, '_blank', 'noopener,noreferrer')
                  }
                  style={{ padding: 0 }}
                >
                  Abrir enlace en nueva pestaña (probar)
                </Button>

                <Space>
                  <Button
                    onClick={() => {
                      setGeneratedData(null);
                      setCopied(false);
                    }}
                  >
                    Generar otro enlace
                  </Button>
                  <Button type="primary" onClick={onClose} style={{ background: '#0A2A66' }}>
                    Listo / Cerrar
                  </Button>
                </Space>
              </div>
            </Space>

            <div
              style={{
                marginTop: 14,
                padding: '8px 12px',
                background: '#f8fafc',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                fontSize: 11,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <SafetyCertificateOutlined style={{ color: '#0A2A66', fontSize: 14 }} />
              <span>
                La orden queda registrada en el panel de Órdenes como <strong>PENDIENTE</strong>. Al
                pagarse en Wompi, el sistema la actualizará a <strong>APROBADA</strong>{' '}
                automáticamente.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
