"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeLabelProps {
  value: string;
  productName: string;
  price: number;
  format?: string;
}

export function BarcodeLabel({
  value,
  productName,
  price,
  format = "EAN13",
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (e) {
        console.error("Barcode generation failed:", e);
      }
    }
  }, [value, format]);

  return (
    <div className="inline-block border p-2 text-center bg-white">
      <p className="text-xs font-medium truncate max-w-[200px]">
        {productName}
      </p>
      <svg ref={svgRef} />
      <p className="text-sm font-bold">{price.toFixed(2)} MAD</p>
    </div>
  );
}
