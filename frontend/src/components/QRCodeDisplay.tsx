import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  className?: string;
  centerLogo?: boolean;
}

export function QRCodeDisplay({
  url,
  size = 280,
  className = "",
  centerLogo = true,
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    QRCode.toDataURL(url, {
      width: size * 2, // 2x for high-DPI screens
      margin: 2,
      errorCorrectionLevel: "H", // High error correction allows center badge without breaking scan
      color: {
        dark: "#0a0a0c",
        light: "#ffffff",
      },
    })
      .then((generatedUrl) => {
        if (isMounted) {
          setDataUrl(generatedUrl);
          setHasError(false);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [url, size]);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground p-6 rounded-2xl text-center text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <p>Could not generate QR code</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl border border-border/20 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {dataUrl ? (
        <>
          <img
            src={dataUrl}
            alt={`QR code to open ${url}`}
            className="w-full h-full object-contain rounded-xl"
            width={size}
            height={size}
          />
          {centerLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-white shadow-md flex items-center justify-center">
                <span className="text-white font-bold text-base font-mono tracking-tighter">
                  AM
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center animate-pulse bg-muted/40 rounded-xl">
          <span className="text-xs text-muted-foreground font-mono">
            Generating QR...
          </span>
        </div>
      )}
    </div>
  );
}
