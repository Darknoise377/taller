"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  author: string;
  createdAt: string;
};

type ReviewStats = {
  average: number;
  count: number;
};

type ProductReviewsProps = {
  productId: string;
};

function StarRating({
  rating,
  onSelect,
  size = "w-5 h-5",
}: {
  rating: number;
  onSelect?: (value: number) => void;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating ? (
          <StarIcon
            key={star}
            className={`${size} text-amber-400 ${onSelect ? "cursor-pointer" : ""}`}
            onClick={() => onSelect?.(star)}
          />
        ) : (
          <StarOutlineIcon
            key={star}
            className={`${size} text-amber-400 ${onSelect ? "cursor-pointer" : ""}`}
            onClick={() => onSelect?.(star)}
          />
        )
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} dias`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
  return `Hace ${Math.floor(days / 365)} anos`;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0 });
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setStats({
        average: Number(data?.stats?.average ?? 0),
        count: Number(data?.stats?.count ?? 0),
      });
    } catch {
      // Silent fail to avoid breaking product page
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const roundedAvg = useMemo(() => Math.round(stats.average), [stats.average]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          author,
          email,
          comment,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(String(data?.error || "No se pudo enviar la resena."));
        return;
      }

      setSubmitted(true);
      setShowForm(false);
      setRating(5);
      setAuthor("");
      setEmail("");
      setComment("");
      fetchReviews();
    } catch {
      setError("Error de conexion. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-14 sm:mt-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Resenas</h2>
          {stats.count > 0 ? (
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={roundedAvg} />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {stats.average.toFixed(1)} ({stats.count} {stats.count === 1 ? "resena" : "resenas"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Aun no hay resenas para este producto.</p>
          )}
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90"
          >
            Escribir resena
          </button>
        )}
      </div>

      {submitted && (
        <div className="mb-6 p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">
          Gracias. Tu resena fue publicada correctamente.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Calificacion</label>
            <StarRating rating={rating} onSelect={setRating} size="w-7 h-7" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              maxLength={100}
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0a1f] text-slate-900 dark:text-slate-100"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Tu email"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0a1f] text-slate-900 dark:text-slate-100"
            />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tu comentario (opcional)"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0a1f] text-slate-900 dark:text-slate-100 resize-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Publicar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{review.author}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(review.createdAt)}</p>
                </div>
                <StarRating rating={review.rating} size="w-4 h-4" />
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{review.comment}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
