'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Spin,
  Typography,
  Tag,
  Alert,
  Radio,
  Checkbox,
  Button,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  AimOutlined,
  ThunderboltOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ListingRow } from '../types';

const { Text } = Typography;

interface PredictedCategoryCandidate {
  domainId: string;
  domainName: string;
  categoryId: string;
  categoryName: string;
  path: string;
}

interface CategoryPredictResponse {
  product: {
    id: string;
    name: string;
    category?: string | null;
  };
  audit: ListingRow['categoryAudit'];
  bestCandidate?: PredictedCategoryCandidate | null;
  candidates: PredictedCategoryCandidate[];
}

interface MeliCategoryModalProps {
  listing: ListingRow | null;
  open: boolean;
  onClose: () => void;
  onCategoryFixed: () => void;
}

export default function MeliCategoryModal({
  listing,
  open,
  onClose,
  onCategoryFixed,
}: MeliCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [predictData, setPredictData] = useState<CategoryPredictResponse | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  useEffect(() => {
    if (!open || !listing) {
      setPredictData(null);
      setSelectedCategoryId('');
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch('/api/admin/meli/categories/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: listing.productId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al diagnosticar categoría');
        }
        return res.json() as Promise<CategoryPredictResponse>;
      })
      .then((data) => {
        if (isMounted) {
          setPredictData(data);
          if (data.bestCandidate?.categoryId) {
            setSelectedCategoryId(data.bestCandidate.categoryId);
          }
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
  }, [open, listing]);

  const handleFixCategory = async () => {
    if (!listing || !selectedCategoryId) {
      message.warning('Selecciona una categoría recomendada');
      return;
    }

    setFixing(true);
    try {
      const res = await fetch('/api/admin/meli/categories/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: listing.productId,
          newCategoryId: selectedCategoryId,
          saveAsDefaultMapping: saveAsDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la categoría');

      message.success(data.notice || 'Categoría corregida con éxito 🚀');
      onCategoryFixed();
      onClose();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setFixing(false);
    }
  };

  if (!open || !listing) return null;

  const audit = listing.categoryAudit;
  const isMismatch = audit?.status === 'mismatch';
  const isWarning = audit?.status === 'warning';
  const isCorrect = audit?.status === 'correct';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(720px, 95vw)"
      title={
        <div className="flex items-center gap-2">
          <AimOutlined className="text-blue-600 text-lg" />
          <span className="text-lg font-bold text-slate-800">
            Diagnóstico de Categoría en Mercado Libre
          </span>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Product Info Banner */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
            Producto Seleccionado
          </div>
          <div className="text-base font-bold text-slate-900">{listing.productName}</div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
            <span>Sección en tienda: <strong className="text-blue-700 capitalize">{listing.productCategory || 'Sin categoría'}</strong></span>
            <span>·</span>
            <span>ID MeLi: {listing.meliItemId || 'No publicado aún'}</span>
          </div>
        </div>

        {/* Current State Diagnostic Alert */}
        {isMismatch ? (
          <Alert
            type="error"
            showIcon
            icon={<CloseCircleOutlined className="text-red-500" />}
            message={<span className="font-bold text-red-800">Categoría incorrecta detectada</span>}
            description={
              <div className="text-xs text-red-700 space-y-1 mt-1">
                <div>{audit?.reason}</div>
                <div>
                  <strong>Ubicación actual en MeLi:</strong> {listing.meliCategoryPath || listing.meliCategoryName || 'Sin datos'}
                </div>
              </div>
            }
          />
        ) : isWarning ? (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined className="text-amber-500" />}
            message={<span className="font-bold text-amber-800">Categoría ambigua o a revisar</span>}
            description={
              <div className="text-xs text-amber-700 space-y-1 mt-1">
                <div>{audit?.reason}</div>
                <div>
                  <strong>Ubicación actual en MeLi:</strong> {listing.meliCategoryPath || listing.meliCategoryName}
                </div>
              </div>
            }
          />
        ) : isCorrect ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined className="text-green-500" />}
            message={<span className="font-bold text-green-800">Categoría correcta y verificada</span>}
            description={
              <div className="text-xs text-green-700 mt-1">
                El producto está en la sección especializada de repuestos para motocicletas: <strong>{listing.meliCategoryPath || listing.meliCategoryName}</strong>
              </div>
            }
          />
        ) : null}

        {/* AI Predictor Candidates */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Text strong className="text-sm text-slate-800 flex items-center gap-1.5">
              <ThunderboltOutlined className="text-amber-500" /> Categorías recomendadas por MeLi (IA Predictor)
            </Text>
            {loading && <Spin size="small" />}
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Consultando árbol de categorías de Mercado Libre Colombia...
            </div>
          ) : (predictData?.candidates?.length ?? 0) > 0 ? (
            <Radio.Group
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full space-y-2"
            >
              {predictData!.candidates.map((cand, idx) => {
                const isSelected = selectedCategoryId === cand.categoryId;
                const isCurrent = cand.categoryId === listing.meliCategoryId;

                return (
                  <label
                    key={cand.categoryId}
                    className={`block p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Radio value={cand.categoryId} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {cand.categoryName}
                          </span>
                          <Tag className="text-[10px] m-0" color={idx === 0 ? 'blue' : 'default'}>
                            {idx === 0 ? 'Mejor coincidencia' : `Opción ${idx + 1}`}
                          </Tag>
                          {isCurrent && (
                            <Tag color="cyan" className="text-[10px] m-0">
                              Actual
                            </Tag>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 break-words">
                          {cand.path}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </Radio.Group>
          ) : (
            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl text-xs">
              No se encontraron categorías predictivas automáticas para este término.
            </div>
          )}
        </div>

        {/* Options and Action Button */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <Checkbox
            checked={saveAsDefault}
            onChange={(e) => setSaveAsDefault(e.target.checked)}
            className="text-xs text-slate-600"
          >
            Guardar también esta categoría como predeterminada para todos los productos de <strong>«{listing.productCategory || 'este tipo'}»</strong>
          </Checkbox>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={fixing}
              disabled={!selectedCategoryId || loading}
              onClick={handleFixCategory}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Corregir y Guardar Categoría
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
