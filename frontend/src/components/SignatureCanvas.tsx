import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import SignaturePad from 'signature_pad';

export interface SignaturePadHandle {
  getDataURL: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
}

interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
}

export const SignatureCanvas = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePad | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pad = new SignaturePad(canvas, { penColor: '#000' });
      padRef.current = pad;

      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(ratio, ratio);
        pad.clear();
      };

      resizeCanvas();

      pad.addEventListener('endStroke', () => {
        if (onChange) onChange(pad.isEmpty());
      });

      window.addEventListener('resize', resizeCanvas);
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        pad.off();
      };
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      getDataURL: () => {
        const pad = padRef.current;
        if (!pad || pad.isEmpty()) return null;
        return pad.toDataURL('image/png');
      },
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      clear: () => {
        padRef.current?.clear();
        if (onChange) onChange(true);
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 160,
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          touchAction: 'none',
          background: '#f8fafc',
        }}
      />
    );
  },
);

SignatureCanvas.displayName = 'SignatureCanvas';
