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
import {
  PaymentMethod,
  Seller, // ✨ AÑADIDO: Tipo de Prisma
  Promotion, // ✨ AÑADIDO: Tipo de Prisma
} from '@prisma/client';
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
  data: Seller | Promotion;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYU');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- ✨ AÑADIDO: Estado de la Lógica de Códigos (de V2) ---
  const [inputCode, setInputCode] = useState(''); // El texto en el input
  const [validatedCode, setValidatedCode] = useState<ValidatedCode>(null);
  const [codeStatus, setCodeStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // --- ✨ AÑADIDO: Cálculos de Totales Dinámicos (de V2) ---
  const { finalTotal, discountAmount } = useMemo(() => {
    let finalTotal = cartTotal;
    let discountAmount = 0;

    if (validatedCode?.type === 'promotion') {
      const promo = validatedCode.data as Promotion;
      discountAmount = cartTotal * (promo.discount / 100);
      finalTotal = cartTotal - discountAmount;
    }

    return { finalTotal, discountAmount };
  }, [cartTotal, validatedCode]);

  // --- Efectos de Carga (de V1) ---
  useEffect(() => {
    const deps = colombiaData.map((d) => d.departamento).sort();
    setDepartamentos(deps);
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
      total: finalTotal, // ✨ MODIFICADO: Usa el total final calculado
      paymentMethod,
      customerName: shippingInfo.fullName,
      customerEmail: shippingInfo.email,
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
          ? (validatedCode.data as Seller).id
          : undefined,
      promoCodeApplied:
        validatedCode?.type === 'promotion'
          ? (validatedCode.data as Promotion).code
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
        if (paymentMethod === 'PAYU') {
          window.location.href = `/api/payu/redirect?ref=${newOrder.referenceCode}`;
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-20 bg-gradient-to-br from-green-50 to-green-100 dark:from-[#070617] dark:to-[#0A2A66]/20 text-gray-800 dark:text-slate-100">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <CheckCircleIcon className="w-24 h-24 text-green-600 dark:text-green-400 mb-6" />
        </motion.div>
        <h1 className="text-4xl font-extrabold text-green-800 dark:text-green-300 text-center mb-4">
          ¡Pedido Confirmado!
        </h1>
        <p className="text-lg text-gray-700 dark:text-slate-300 text-center">
          {orderId
            ? `Tu número de orden es #${orderId}.`
            : 'Tu pedido ha sido procesado exitosamente.'}
        </p>
        <Link
          href="/"
          className="mt-6 px-8 py-3 bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90 text-white rounded-full font-semibold shadow-md transition-opacity"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  // --- Renderizado del formulario principal (V1 + V2) ---
  return (
    <>
      <Head>
        <title>Finalizar Compra - TALLER DE MOTOS A&amp;R</title>
      </Head>

      <main className="bg-gray-50 dark:bg-[#070617] min-h-screen">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-800 dark:text-slate-100"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Finalizar Compra
          </motion.h1>

          <div className="flex flex-col lg:flex-row gap-8">
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
                      method="PAYU"
                      currentMethod={paymentMethod}
                      setMethod={setPaymentMethod}
                      title="PayU (Pago seguro)"
                      description="Tarjetas de crédito/débito, PSE, Nequi y más."
                      icon={
                        <LockClosedIcon className="w-5 h-5 mr-2 text-green-600" />
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
              <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
                  Resumen del Pedido
                </h2>

                {/* Lista de Items (de V1, sin cambios) */}
                <div className="max-h-80 overflow-y-auto">
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
                          $
                          {(
                            item.product.price * item.quantity
                          ).toLocaleString('es-CO')}
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
                      <strong>{(validatedCode.data as Seller).name}</strong>
                    </div>
                  )}
                  {validatedCode?.type === 'promotion' && (
                    <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-lg text-sm">
                      ¡Descuento aplicado!{' '}
                      <strong>
                        {(validatedCode.data as Promotion).description}
                      </strong>
                    </div>
                  )}
                </div>

                {/* --- ✨ MODIFICADO: Resumen de Totales Dinámico (V1 + V2) --- */}
                <div className="space-y-3">
                  <div className="flex justify-between text-md text-gray-600 dark:text-slate-400">
                    <span>
                      Subtotal ({totalItems}{' '}
                      {totalItems === 1 ? 'artículo' : 'artículos'})
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">
                      ${cartTotal.toLocaleString('es-CO')}
                    </span>

                  </div>
                  
                  {/* Descuento (si aplica) */}
                  {validatedCode?.type === 'promotion' && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>
                        Descuento (
                        {(validatedCode.data as Promotion).discount}%)
                      </span>
                      <span>
                        -${discountAmount.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}

                  {/* Total Final */}
                  <div className="flex justify-between text-xl font-bold border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
                    <span className="text-gray-900 dark:text-slate-100">Total a Pagar:</span>
                    <span className="text-[#0A2A66] dark:text-[#2E5FA7]">
                      ${finalTotal.toLocaleString('es-CO')}
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
                    : paymentMethod === 'PAYU'
                    ? 'Pagar con PayU'
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