"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CartItem as ICartItem } from "@/types/cart";
import { useCart } from "@/hooks/useCart";
import { MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface CartItemProps {
  item: ICartItem;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { removeItem, updateItemQuantity } = useCart();

  const handleRemove = () => {
    removeItem(item.product.id, item.selectedSize, item.selectedColor);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;
    if (item.product.stock !== undefined && newQuantity > item.product.stock) return;
    updateItemQuantity(item.product.id, newQuantity, item.selectedSize, item.selectedColor);
  };

  const imageUrl =
    item.product.imageUrl || "https://placehold.co/80x80/cccccc/ffffff?text=No+Img";

  return (
    <li className="flex py-4 border-b border-slate-200 dark:border-slate-700/50 last:border-b-0 items-start gap-3">
      {/* Imagen */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
        <Image
          src={imageUrl}
          alt={item.product.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      {/* Detalles */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.product.id}`}>
          <h4 className="text-slate-900 dark:text-slate-100 text-sm font-semibold line-clamp-2 hover:text-[#0A2A66] dark:hover:text-[#2E5FA7] transition-colors duration-200">
            {item.product.name}
          </h4>
        </Link>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {item.selectedSize && (
            <p className="text-slate-500 dark:text-slate-400 text-xs">Medida: {item.selectedSize}</p>
          )}
          {item.selectedColor && (
            <p className="text-slate-500 dark:text-slate-400 text-xs">Comp: {item.selectedColor}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Controles de cantidad */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleQuantityChange(-1)}
              aria-label="Disminuir cantidad"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={item.quantity <= 1}
            >
              <MinusIcon className="w-3.5 h-3.5" />
            </button>

            <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold w-6 text-center">
              {item.quantity}
            </span>

            <button
              onClick={() => handleQuantityChange(1)}
              aria-label="Aumentar cantidad"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Precio */}
          <span className="text-[#0A2A66] dark:text-[#2E5FA7] font-bold text-sm">
            ${(item.product.price * item.quantity).toLocaleString("es-CO")}
          </span>
        </div>
      </div>

      {/* Eliminar */}
      <button
        onClick={handleRemove}
        aria-label={`Remover ${item.product.name} del carrito`}
        className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-200"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </li>
  );
};

export default CartItem;
