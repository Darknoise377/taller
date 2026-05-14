'use client';

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useMemo, // ✨ AÑADIDO: Para calcular totales dinámicos
} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { CartItem as ICartItem } from '@/types/cart';
import { orderService } from '@/services/orderService';
import type { PaymentMethod } from '@/types/order';
import type { PromotionCode, SellerCode } from '@/types/code';
import colombia from '@/data/colombia.json';
import {
  MapPinIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { calculateDiscountedTotal, formatCurrency } from '@/utils/formatCurrency';
import ShippingPromo from '@/components/ShippingPromo';
import { estimateShippingWithConfig, CONTRAENTREGA_SURCHARGE, DEFAULT_SHIPPING_CONFIG } from '@/config/shippingRates';
import type { ShippingConfig } from '@/config/shippingRates';

// --- Interfaces ---

interface ShippingInfo {
  fullName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  cedula?: string;
}

// ✨ AÑADIDO: Tipo para el código validado
type ValidatedCode = {
  type: 'seller' | 'promotion';
  data: SellerCode | PromotionCode;
} | null;

type ColombiaDepartment = {
  departamento: string;
  ciudades: string[];
};

const colombiaData = colombia as unknown as ColombiaDepartment[];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado';
};

// --- Componente: FormInput ---
// (Sin cambios, ya era excelente)
interface FormInputProps {
  label: string;
  name: keyof ShippingInfo;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  pattern?: string;
  maxLength?: number;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  className = '',
  pattern,
  maxLength,
}) => (
  <div className={className}>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder || `Escribe tu ${label.toLowerCase()}...`}
      required={required}
      pattern={pattern}
      maxLength={maxLength}
      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0A2A66] focus:border-[#0A2A66] outline-none transition bg-white dark:bg-[#0b0a1f] text-gray-900 dark:text-slate-100"
    />
  </div>
);

// --- Componente: PaymentOption ---
// (Sin cambios, ya era excelente)
interface PaymentOptionProps {
  method: PaymentMethod;
  currentMethod: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const PaymentOption: React.FC<PaymentOptionProps> = ({
  method,
  currentMethod,
  setMethod,
  title,
  description,
  icon,
  children,
}) => {
  const isSelected = method === currentMethod;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => setMethod(method)}
      className={`relative border rounded-xl p-4 cursor-pointer shadow-sm transition-all ${
        isSelected
          ? 'border-[#0A2A66] dark:border-[#2E5FA7] bg-[#0A2A66]/5 dark:bg-[#2E5FA7]/10 ring-2 ring-[#0A2A66] dark:ring-[#2E5FA7]'
          : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0b0a1f] hover:border-gray-400 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="radio"
            name="paymentMethod"
            checked={isSelected}
            onChange={() => setMethod(method)}
            className="focus:ring-[#0A2A66] h-4 w-4 text-[#0A2A66] border-gray-300 dark:border-slate-600"
          />
        </div>
        <div className="ml-3 text-sm flex-grow">
          <span className="font-bold text-gray-900 dark:text-slate-100 flex items-center">
            {icon} {title}
          </span>
          <p className="text-gray-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      {isSelected && <div className="mt-4 pl-7">{children}</div>}
    </motion.div>
  );
};

// --- Componente Principal: CheckoutPage ---
const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { items, totalItems, cartTotal, clearCart, isCartLoaded } = useCart();

  // --- Estado del Formulario de Envío (de V1) ---
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    cedula: '',
  });

  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WOMPI');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- ✨ AÑADIDO: Estado de la Lógica de Códigos (de V2) ---
  const [inputCode, setInputCode] = useState(''); // El texto en el input
  const [validatedCode, setValidatedCode] = useState<ValidatedCode>(null);
  const [codeStatus, setCodeStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  const freeShippingThreshold = shippingConfig.freeShippingThreshold;
  const isFreeShipping = shippingConfig.freeShippingAll || cartTotal >= freeShippingThreshold;
  const missingForFreeShipping = Math.max(0, freeShippingThreshold - cartTotal);

  // --- Estimado de envío reactivo ---
  const shippingEstimate = useMemo(() => {
    if (!shippingInfo.state || (paymentMethod !== 'WOMPI' && paymentMethod !== 'CONTRAENTREGA')) {
      return null;
    }
    return estimateShippingWithConfig(
      shippingInfo.state,
      paymentMethod as 'WOMPI' | 'CONTRAENTREGA',
      cartTotal,
      shippingConfig,
    );
  }, [shippingInfo.state, paymentMethod, cartTotal, shippingConfig]);

  // --- ✨ AÑADIDO: Cálculos de Totales Dinámicos (de V2) ---
  const { finalTotal, discountAmount } = useMemo(() => {
    const shipping = shippingEstimate?.total ?? 0;
    if (validatedCode?.type === 'promotion') {
      const promo = validatedCode.data as PromotionCode;
      const { finalTotal: discounted, discountAmount } = calculateDiscountedTotal(cartTotal, promo.discount);
      return { finalTotal: discounted + shipping, discountAmount };
    }
    return { finalTotal: cartTotal + shipping, discountAmount: 0 };
  }, [cartTotal, validatedCode, shippingEstimate]);

  // --- Efectos de Carga (de V1) ---
  useEffect(() => {
    const deps = colombiaData.map((d) => d.departamento).sort();
    setDepartamentos(deps);
  }, []);

  // Load shipping config from DB
  useEffect(() => {
    fetch('/api/store-settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.shippingRules) setShippingConfig(data.shippingRules as ShippingConfig);
      })
      .catch(() => { /* use default */ });
  }, []);

  useEffect(() => {
    if (shippingInfo.state) {
      const dep = colombiaData.find((d) => d.departamento === shippingInfo.state);
      setMunicipios(dep ? dep.ciudades.sort() : []);
      // Resetea la ciudad si el departamento cambia
      setShippingInfo((prev) => ({ ...prev, city: '' }));
    } else {
      setMunicipios([]);
    }
  }, [shippingInfo.state]);

  useEffect(() => {
    if (isCartLoaded && items.length === 0 && !orderPlaced) {
      router.push('/products');
    }
  }, [items, orderPlaced, router, isCartLoaded]);

  // --- Handlers ---

  const handleShippingChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
  };

  // --- ✨ AÑADIDO: Handlers de Lógica de Códigos (de V2) ---

  /**
   * Llama a la API para validar el código.
   */
  const handleValidateCode = async () => {
    if (!inputCode) return;

    setCodeStatus({ loading: true, error: null });
    setValidatedCode(null);
    setError(null); // Limpia error general

    try {
      const response = await fetch(`/api/codes/validate?code=${encodeURIComponent(inputCode)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Código no válido');
      }

      // Éxito: Guardamos el código validado
      setValidatedCode({ type: result.type, data: result.data });
    } catch (err: unknown) {
      setCodeStatus({ loading: false, error: getErrorMessage(err) });
    } finally {
      setCodeStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  /**
   * Limpia el estado del código.
   */
  const handleRemoveCode = () => {
    setInputCode('');
    setValidatedCode(null);
    setCodeStatus({ loading: false, error: null });
  };

  // --- ✨ FUSIONADO: Handler de Envío de Orden (V1 + V2) ---
  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // --- Validaciones de V1 ---
    if (
      !shippingInfo.fullName ||
      !shippingInfo.address ||
      !shippingInfo.city ||
      !shippingInfo.state ||
      !shippingInfo.phone ||
      !shippingInfo.email
    ) {
      setError('Por favor completa toda la información de envío obligatoria.');
      return;
    }

    if (paymentMethod === 'CONTRAENTREGA' && !shippingInfo.cedula) {
      setError('Por favor ingresa tu cédula/NIT para el pago contraentrega.');
      return;
    }

    if (items.length === 0) {
      setError('Tu carrito está vacío.');
      return;
    }

    // --- ✨ AÑADIDO: Validación de V2 ---
    if (inputCode && !validatedCode) {
      setError(
        'El código ingresado no es válido. Por favor, elimínalo o aplica uno correcto.'
      );
      return;
    }

    // --- ✨ FUSIONADO: Payload (V1 + V2) ---
    const payload = {
      total: finalTotal, // incluye envío + descuento
      paymentMethod,
      customerName: shippingInfo.fullName?.trim(),
      customerEmail: shippingInfo.email?.trim(),
      address: shippingInfo.address,
      city: shippingInfo.city,
      department: shippingInfo.state,
      postalCode: shippingInfo.zipCode,
      phone: shippingInfo.phone,
      cedula:
        paymentMethod === 'CONTRAENTREGA' ? shippingInfo.cedula : undefined,
      products: items.map((item: ICartItem) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),

      // --- ✨ AÑADIDO: Lógica de Códigos Híbridos ---
      sellerId:
        validatedCode?.type === 'seller'
          ? (validatedCode.data as SellerCode).id
          : undefined,
      promoCodeApplied:
        validatedCode?.type === 'promotion'
          ? (validatedCode.data as PromotionCode).code
          : undefined,
    };

    // --- Lógica de Creación de Orden (de V1) ---
    try {
      setProcessing(true);
      // Usamos el orderService original, asumiendo que acepta los nuevos campos
      const newOrder = await orderService.createOrder(payload);

      if (newOrder?.id) {
        setOrderId(newOrder.id);
        clearCart();
        setOrderPlaced(true);
        if (paymentMethod === 'WOMPI') {
          window.location.href = `/api/wompi/redirect?ref=${newOrder.referenceCode}`;
          return;
        }
      } else {
        throw new Error('No se pudo obtener el ID de la nueva orden.');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err) || 'Ocurrió un error inesperado al procesar la orden.';
      setError(`Error: ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- Renderizado de Estados (de V1, sin cambios) ---
  if (!isCartLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-120px)] text-xl text-gray-600">
        Cargando carrito...
      </div>
    );
  }

  if (orderPlaced && paymentMethod === 'CONTRAENTREGA') {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573000000000';
    const whatsappMsg = encodeURIComponent(
      `¡Hola! Acabo de realizar un pedido y quiero obtener más detalles 🔧\nPedido: #${orderId ?? ''}\nNombre: ${shippingInfo.fullName}`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMsg}`;

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-16 px-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-[#070617] dark:to-[#0A2A66]/20">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <CheckCircleIcon className="w-20 h-20 text-green-500 dark:text-green-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-md"
        >
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 mb-3">
            ¡Pedido Registrado!
          </h1>
          {orderId && (
            <p className="text-base font-medium text-[#0A2A66] dark:text-blue-300 mb-2">
              Pedido #{orderId}
            </p>
          )}
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-8">
            Te enviamos un correo con el resumen. El pago se cobra al momento de la entrega.
          </p>

          {/* Pasos */}
          <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
              ¿Qué sigue?
            </p>
            {[
              { emoji: '✅', label: 'Pedido registrado', done: true },
              { emoji: '📞', label: 'Confirmar por WhatsApp para coordinar la entrega', done: false },
              { emoji: '🚚', label: 'Envío a tu dirección', done: false },
              { emoji: '💳', label: 'Paga al recibir el paquete', done: false },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 ${i < 3 ? 'mb-4' : ''}`}>
                <div
                  className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                    step.done
                      ? 'bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {step.done ? step.emoji : i + 1}
                </div>
                <p
                  className={`text-sm ${
                    step.done
                      ? 'font-semibold text-gray-900 dark:text-slate-100'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm shadow-md transition-colors mb-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Obtener detalles y seguimiento
          </a>

          <Link
            href="/"
            className="flex items-center justify-center w-full py-3 px-6 rounded-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            Volver al inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // --- Renderizado del formulario principal (V1 + V2) ---

  // Progress step: 1 = datos, 2 = pago, 3 = confirmar
  const step1Done = Boolean(
    shippingInfo.fullName && shippingInfo.email && shippingInfo.phone &&
    shippingInfo.address && shippingInfo.city && shippingInfo.state
  );
  const step2Done = step1Done && Boolean(paymentMethod);
  const currentStep = step2Done ? 3 : step1Done ? 2 : 1;

  const checkoutSteps = [
    { label: "Datos de envío", step: 1 },
    { label: "Método de pago", step: 2 },
    { label: "Confirmar", step: 3 },
  ];

  return (
    <>
      <Head>
        <title>Finalizar Compra - TALLER DE MOTOS A&amp;R</title>
      </Head>

      <main className="bg-gray-50 dark:bg-[#070617] min-h-screen">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800 dark:text-slate-100"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Finalizar Compra
          </motion.h1>

          {/* Progress steps */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-0 mb-10 max-w-md mx-auto"
          >
            {checkoutSteps.map(({ label, step }, idx) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                      step < currentStep
                        ? "bg-[#0A2A66] dark:bg-[#2E5FA7] border-[#0A2A66] dark:border-[#2E5FA7] text-white"
                        : step === currentStep
                        ? "bg-white dark:bg-slate-900 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#5B9BD5] ring-4 ring-[#0A2A66]/15 dark:ring-[#2E5FA7]/20"
                        : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500"
                    }`}
                  >
                    {step < currentStep ? (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-semibold text-center leading-tight transition-colors duration-300 ${
                      step <= currentStep
                        ? "text-[#0A2A66] dark:text-[#5B9BD5]"
                        : "text-gray-400 dark:text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < checkoutSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-500 rounded-full ${
                      step < currentStep
                        ? "bg-[#0A2A66] dark:bg-[#2E5FA7]"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Formulario (de V1, sin cambios) */}
            <motion.div
              className="w-full lg:w-3/5 bg-white dark:bg-[#0b0a1f] rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-800"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Usamos un <form> para englobar, pero el botón de submit está 
                en la otra columna. handlePlaceOrder se llama con onClick en el botón.
                Si prefieres un <form> HTML estándar, el botón debería estar dentro.
                Por ahora, mantenemos la estructura de V1 que funciona con onClick.
              */}
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center border-b border-gray-200 dark:border-slate-800 pb-3">
                  <MapPinIcon className="w-7 h-7 mr-3 text-[#0A2A66] dark:text-[#2E5FA7]" />
                  1. Información de Envío
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormInput
                    label="Nombre Completo"
                    name="fullName"
                    value={shippingInfo.fullName}
                    onChange={handleShippingChange}
                    required
                    className="sm:col-span-2"
                  />
                  <FormInput
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={shippingInfo.email}
                    onChange={handleShippingChange}
                    required
                  />
                  <FormInput
                    label="Teléfono"
                    name="phone"
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={handleShippingChange}
                    required
                  />
                  <FormInput
                    label="Dirección"
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleShippingChange}
                    required
                    className="sm:col-span-2"
                  />

                  {/* Select de departamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Departamento
                    </label>
                    <select
                      name="state"
                      value={shippingInfo.state}
                      onChange={handleShippingChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0b0a1f] text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0A2A66] focus:border-[#0A2A66] outline-none transition"
                    >
                      <option value="">Selecciona un departamento</option>
                      {departamentos.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select de ciudad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Ciudad
                    </label>
                    <select
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleShippingChange}
                      required
                      disabled={!shippingInfo.state}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0b0a1f] text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0A2A66] focus:border-[#0A2A66] disabled:bg-gray-100 dark:disabled:bg-[#0b0a1f] outline-none transition"
                    >
                      <option value="">Selecciona una ciudad</option>
                      {municipios.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <FormInput
                    label="Código Postal (Opcional)"
                    name="zipCode"
                    value={shippingInfo.zipCode}
                    onChange={handleShippingChange}
                  />
                </div>

                {/* Método de pago (de V1, sin cambios) */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center border-b border-gray-200 dark:border-slate-800 pb-3">
                    <CreditCardIcon className="w-7 h-7 mr-3 text-[#0A2A66] dark:text-[#2E5FA7]" />
                    2. Método de Pago
                  </h2>

                  <div className="space-y-4">
                    <PaymentOption
                      method="WOMPI"
                      currentMethod={paymentMethod}
                      setMethod={setPaymentMethod}
                      title="Wompi (Pago seguro)"
                      description="Tarjetas de crédito/débito, PSE, Nequi y más medios."
                      icon={
                        <CreditCardIcon className="w-5 h-5 mr-2 text-sky-600" />
                      }
                    />
                    <PaymentOption
                      method="CONTRAENTREGA"
                      currentMethod={paymentMethod}
                      setMethod={setPaymentMethod}
                      title="Pago Contraentrega"
                      description="Paga en efectivo al recibir tu pedido."
                      icon={
                        <BanknotesIcon className="w-5 h-5 mr-2 text-yellow-600" />
                      }
                    >
                      <FormInput
                        label="Cédula / NIT (Requerido)"
                        name="cedula"
                        value={shippingInfo.cedula || ''}
                        onChange={handleShippingChange}
                        required={paymentMethod === 'CONTRAENTREGA'}
                      />
                    </PaymentOption>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Resumen (V1 + V2) */}
            <motion.div
              className="w-full lg:w-2/5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Usamos position: sticky para que el resumen se quede fijo al hacer scroll.
                'top-24' es un valor común (depende de la altura de tu header).
              */}
              <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
                  Resumen del Pedido
                </h2>

                {/* Lista de Items (de V1, sin cambios) */}
                <div className="max-h-72 sm:max-h-80 overflow-y-auto">
                  <ul className="divide-y divide-gray-200 dark:divide-slate-800">
                    {items.map((item) => (
                      <li key={item.product.id} className="flex items-center py-4">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden mr-4 border border-gray-200 dark:border-slate-700">
                          <Image
                            src={
                              item.product.imageUrl ||
                              'https://placehold.co/64x64'
                            }
                            alt={item.product.name}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">
                            {item.product.name}
                          </p>
                          <p className="text-gray-500 dark:text-slate-400 text-sm">
                            Cantidad: {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-slate-100">
                          {formatCurrency(item.product.price * item.quantity, item.product.currency ?? 'COP')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* --- ✨ AÑADIDO: Sección de Código Híbrido (de V2) --- */}
                <div className="border-t border-b border-gray-200 dark:border-slate-700 py-4 my-4">
                  <label
                    htmlFor="promo-code"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                  >
                    Código de Vendedor o Promocional
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <input
                      type="text"
                      id="promo-code"
                      value={inputCode}
                      onChange={(e) =>
                        setInputCode(e.target.value.toUpperCase())
                      }
                      className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-l-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0b0a1f] text-gray-900 dark:text-slate-100 focus:ring-[#0A2A66] focus:border-[#0A2A66] sm:text-sm"
                      placeholder="Ingresa un código"
                      disabled={!!validatedCode}
                    />
                    {!validatedCode ? (
                      <button
                        type="button"
                        onClick={handleValidateCode}
                        disabled={codeStatus.loading || !inputCode}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-700 text-sm font-medium rounded-r-lg text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none disabled:opacity-50 transition-colors"
                      >
                        {codeStatus.loading ? '...' : 'Aplicar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRemoveCode}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-lg text-white bg-red-600 hover:bg-red-700"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  {/* --- Mensajes de Estado Dinámicos --- */}
                  {codeStatus.error && (
                    <p className="mt-2 text-sm text-red-600">
                      {codeStatus.error}
                    </p>
                  )}
                  {validatedCode?.type === 'seller' && (
                    <div className="mt-2 p-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
                      Venta asignada a:{' '}
                      <strong>{(validatedCode.data as SellerCode).name}</strong>
                    </div>
                  )}
                  {validatedCode?.type === 'promotion' && (
                    <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-lg text-sm">
                      ¡Descuento aplicado!{' '}
                      <strong>
                        {(validatedCode.data as PromotionCode).description}
                      </strong>
                    </div>
                  )}
                </div>

                {/* --- ✨ MODIFICADO: Resumen de Totales Dinámico (V1 + V2) --- */}
                <div className="space-y-3">
                  <ShippingPromo
                    subtotal={cartTotal}
                    freeShippingThreshold={freeShippingThreshold}
                    missingForFreeShipping={missingForFreeShipping}
                    isFreeShipping={isFreeShipping}
                  />

                  <div className="flex justify-between text-md text-gray-600 dark:text-slate-400">
                    <span>
                      Subtotal ({totalItems}{' '}
                      {totalItems === 1 ? 'artículo' : 'artículos'})
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-md text-gray-600 dark:text-slate-400">
                    <span>Envío</span>
                    <span className="font-semibold text-right">
                      {!shippingInfo.state ? (
                        <span className="text-gray-400 dark:text-slate-500 text-sm">Selecciona departamento</span>
                      ) : shippingEstimate ? (
                        <span className="flex flex-col items-end gap-0.5">
                          {shippingEstimate.isFreeBase && shippingEstimate.surcharge === 0 && (
                            <span className="text-green-600 dark:text-green-400">GRATIS</span>
                          )}
                          {shippingEstimate.isFreeBase && shippingEstimate.surcharge > 0 && (
                            <>
                              <span className="text-green-600 dark:text-green-400 text-xs">Flete GRATIS</span>
                              <span className="text-yellow-600 dark:text-yellow-400 text-xs">+ {formatCurrency(shippingEstimate.surcharge)} recargo CE</span>
                            </>
                          )}
                          {!shippingEstimate.isFreeBase && (
                            <>
                              <span className="text-gray-800 dark:text-slate-200">{formatCurrency(shippingEstimate.baseRate)}</span>
                              {shippingEstimate.surcharge > 0 && (
                                <span className="text-yellow-600 dark:text-yellow-400 text-xs">+ {formatCurrency(shippingEstimate.surcharge)} recargo CE</span>
                              )}
                              {shippingEstimate.regionLabel && (
                                <span className="text-gray-400 dark:text-slate-500 text-xs">{shippingEstimate.regionLabel}</span>
                              )}
                            </>
                          )}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  
                  {/* Descuento (si aplica) */}
                  {validatedCode?.type === 'promotion' && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>
                        Descuento (
                        {(validatedCode.data as PromotionCode).discount}%)
                      </span>
                      <span>
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>
                  )}

                  {/* Total Final */}
                  <div className="flex justify-between text-xl font-bold border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
                    <span className="text-gray-900 dark:text-slate-100">Total a Pagar:</span>
                    <span className="text-[#0A2A66] dark:text-[#2E5FA7]">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Error General */}
                {error && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-lg flex items-center text-sm">
                    <ExclamationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <motion.button
                  onClick={handlePlaceOrder}
                  disabled={
                    items.length === 0 ||
                    processing ||
                    (!!inputCode && !validatedCode)
                  }
                  whileTap={{ scale: 0.97 }}
                  className={`w-full mt-6 px-6 py-3.5 rounded-full text-lg font-semibold text-white flex items-center justify-center shadow-lg
                    ${
                      processing
                        ? 'bg-gray-500 dark:bg-slate-600'
                        : 'bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90'
                    }
                    transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <CheckCircleIcon className="w-6 h-6 mr-2" />
                  {processing
                    ? 'Procesando...'
                    : paymentMethod === 'WOMPI'
                    ? 'Pagar con Wompi'
                    : 'Confirmar Pedido'}
                </motion.button>

                {/* Trust badges */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <LockClosedIcon className="w-5 h-5 text-[#0A2A66] dark:text-[#2E5FA7]" />
                      <span className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Pago 100% seguro</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-5 h-5 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Datos protegidos</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-5 h-5 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                      <span className="text-xs text-gray-500 dark:text-slate-400 leading-tight">Envío nacional</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CheckoutPage;