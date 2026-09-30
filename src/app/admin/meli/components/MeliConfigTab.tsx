'use client';

import React from 'react';
import {
  Button,
  Card,
  Form,
  InputNumber,
  Popconfirm,
  Row,
  Col,
  Select,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { MELI_COMMISSION_RATES } from '@/lib/meli/pricing';
import type { MeliStatus, MeliConfig } from '../types';

const { Text } = Typography;

interface MeliConfigTabProps {
  status: MeliStatus | null;
  config: MeliConfig | null;
  form: FormInstance;
  configLoading: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
  handleSaveConfig: () => Promise<void>;
  loadStatus: () => Promise<void>;
}

export default function MeliConfigTab({
  status,
  config,
  form,
  configLoading,
  handleConnect,
  handleDisconnect,
  handleSaveConfig,
  loadStatus,
}: MeliConfigTabProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card
        title={
          <span className="flex items-center gap-2 text-lg">
            <ApiOutlined className="text-blue-600" />
            Conexión con Mercado Libre
          </span>
        }
        className="shadow-sm border-slate-200"
      >
        {status?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-green-50/50 p-4 rounded-xl border border-green-100">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircleOutlined className="text-2xl" />
              <div>
                <Text strong className="block text-green-700 text-lg">Cuenta Conectada</Text>
                {status.nickname && (
                  <Text className="text-green-600/80">
                    Usuario: <strong>{status.nickname}</strong>
                  </Text>
                )}
              </div>
            </div>
            <div className="sm:ml-auto flex flex-wrap gap-2">
              <Button icon={<ReloadOutlined />} onClick={loadStatus}>Verificar Conexión</Button>
              <Popconfirm
                title="¿Desconectar cuenta de MeLi?"
                description="Se eliminarán los tokens guardados y se pausará la sincronización."
                onConfirm={handleDisconnect}
                okText="Sí, desconectar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DisconnectOutlined />}>Desconectar</Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <CloseCircleOutlined className="text-3xl text-red-500" />
            </div>
            <Typography.Title level={4} className="!mb-2 text-slate-800">
              Cuenta no conectada
            </Typography.Title>
            <Text type="secondary" className="max-w-md mb-6 text-base">
              Conecta tu cuenta para sincronizar automáticamente tu inventario, precios y estados con Mercado Libre Colombia.
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<ApiOutlined />}
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              Conectar con Mercado Libre
            </Button>
          </div>
        )}
      </Card>

      <Card 
        title={<span className="text-lg">⚙️ Configuración de Precios y Publicaciones</span>} 
        className="shadow-sm border-slate-200"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            extraMarginPercent: config?.extraMarginPercent ?? 0,
            fixedCostCOP: config?.fixedCostCOP ?? 3500,
            defaultListingType: config?.defaultListingType ?? 'gold_special',
            freeInstallments: config?.freeInstallments ?? 3,
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="defaultListingType" label="Tipo de publicación por defecto" tooltip="El tipo de publicación afecta la comisión y el nivel de exposición en Mercado Libre.">
                <Select size="large">
                  <Select.Option value="gold_special">
                    <span className="font-medium">Clásica</span> — Exposición alta ({MELI_COMMISSION_RATES['gold_special']}%)
                  </Select.Option>
                  <Select.Option value="gold_premium">
                    <span className="font-medium">Premium</span> — Exposición máxima ({MELI_COMMISSION_RATES['gold_premium']}%)
                  </Select.Option>
                  <Select.Option value="free">
                    <span className="font-medium">Gratuita</span> — Exposición baja ({MELI_COMMISSION_RATES['free']}%)
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="freeInstallments" label="Cuotas sin interés ofrecidas" tooltip="Solo aplica para publicaciones Premium" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value={3}>3 cuotas sin interés</Select.Option>
                  <Select.Option value={6}>6 cuotas sin interés (Cuotas Extra)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="extraMarginPercent" label="Margen de seguridad adicional (%)" tooltip="Agrega un porcentaje extra al precio final calculado para cubrir variaciones." rules={[{ required: true }]}>
                <InputNumber size="large" min={0} max={79} step={0.5} suffix="%" className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="fixedCostCOP" label="Costo fijo por venta (COP)" tooltip="Tarifa fija que cobra Mercado Libre por ventas de monto bajo." rules={[{ required: true }]}>
                <InputNumber size="large" min={0} step={500} prefix="$" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end mt-4">
            <Button type="primary" size="large" loading={configLoading} onClick={handleSaveConfig} className="bg-slate-900 px-8 hover:!bg-slate-800">
              Guardar configuración
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
