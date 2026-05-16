/**
 * Selector de calificación por estrellas (1-5) para el módulo de feedback.
 */
import { useState } from 'react';

export default function StarRating({ value = 0, onChange, readOnly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1" role="group" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`text-2xl transition-transform ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${star <= (hover || value) ? 'text-yellow-400' : 'text-gray-300'}`}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
