import React, { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import { Printer, Download, Plus, Minus, RefreshCw, Barcode as BarcodeIcon, Settings2, Trash2, PlusCircle } from "lucide-react";
import { cn } from "./lib/utils";
import { DEFAULT_CONFIG, type BarcodeConfig, type BarcodeItem } from "./types";

// EAN-13 Checksum Calculator
const calculateEAN13Checksum = (code: string): string => {
  const digits = code.split("").map(Number);
  if (digits.length < 12) return "";
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
};

const getFullCode = (code: string): string => {
  const digits = code.replace(/\D/g, "");
  if (digits.length >= 13) return digits.slice(0, 13);
  if (digits.length === 12) return digits + calculateEAN13Checksum(digits);
  return digits;
};

const isValidEAN13 = (code: string): boolean => getFullCode(code).length === 13;

const isChecksumCorrect = (code: string): boolean => {
  const full = getFullCode(code);
  if (full.length !== 13) return false;
  const base = full.slice(0, 12);
  return calculateEAN13Checksum(base) === full[12];
};

export default function App() {
  const [config, setConfig] = useState<BarcodeConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if the app is being embedded (e.g., in an iframe)
  const isEmbedded = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("embed") === "true";
  }, []);

  const addItem = () => {
    const newItem: BarcodeItem = {
      id: Math.random().toString(36).substr(2, 9),
      code: "",
      quantity: 1,
    };
    setConfig({ ...config, items: [...config.items, newItem] });
  };

  const removeItem = (id: string) => {
    if (config.items.length <= 1) return;
    setConfig({ ...config, items: config.items.filter(item => item.id !== id) });
  };

  const updateItem = (id: string, updates: Partial<BarcodeItem>) => {
    setConfig({
      ...config,
      items: config.items.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const allItemsValid = useMemo(() => {
    return config.items.every(item => isValidEAN13(item.code));
  }, [config.items]);

  const totalQuantity = useMemo(() => {
    return config.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [config.items]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const { labelWidth, labelHeight, columns, rows, marginTop, marginLeft } = config;
      
      // Cache for base64 images to avoid redundant fetches
      const imageCache: Record<string, string> = {};

      let currentCount = 0;
      let page = 1;
      let itemIndex = 0;
      let itemQuantityRemaining = config.items[0]?.quantity || 0;

      while (itemIndex < config.items.length) {
        if (currentCount > 0 && currentCount % (columns * rows) === 0) {
          doc.addPage();
          page++;
        }

        const currentItem = config.items[itemIndex];
        const fullCode = getFullCode(currentItem.code);
        
        if (!imageCache[fullCode]) {
          const proxyUrl = `/api/barcode?data=${fullCode}&code=EAN13`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Failed to fetch barcode ${fullCode}`);
          const blob = await response.blob();
          imageCache[fullCode] = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }

        const base64 = imageCache[fullCode];
        
        // Detect format from data URL (e.g., "data:image/png;base64,..." -> "PNG")
        const formatMatch = base64.match(/^data:image\/(\w+);base64,/);
        const format = (formatMatch ? formatMatch[1].toUpperCase() : "PNG") as any;
        
        // Calculate position on current page
        const posOnPage = currentCount % (columns * rows);
        const r = Math.floor(posOnPage / columns);
        const c = posOnPage % columns;
        
        const x = marginLeft + c * labelWidth;
        const y = marginTop + r * labelHeight;
        
        const padding = 2;
        doc.addImage(
          base64, 
          format, 
          x + padding, 
          y + padding, 
          labelWidth - padding * 2, 
          labelHeight - padding * 2
        );
        
        doc.setDrawColor(200);
        doc.rect(x, y, labelWidth, labelHeight);
        
        currentCount++;
        itemQuantityRemaining--;

        if (itemQuantityRemaining <= 0) {
          itemIndex++;
          if (itemIndex < config.items.length) {
            itemQuantityRemaining = config.items[itemIndex].quantity;
          }
        }
      }

      doc.save(`barcodes-batch.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Errore durante la generazione del PDF. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-[#F8F9FA] text-[#212529] font-sans", !isEmbedded ? "pb-20" : "pb-6")}>
      {/* Header */}
      {!isEmbedded && (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <img 
              src="http://www.cavallinomatto.it/wp-content/uploads/2025/09/Risorsa1300x-scaled.png" 
              alt="Cavallino Matto" 
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://www.cavallinomatto.it/wp-content/uploads/2021/03/logo-cavallino-matto.png";
              }}
              referrerPolicy="no-referrer"
            />
            <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Genera il tuo Barcode</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Generatore di barcode ean-13 per negozi del Parco</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !allItemsValid || totalQuantity === 0}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all shadow-sm",
                (!allItemsValid || totalQuantity === 0)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              )}
            >
              {isGenerating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Scarica PDF A4 ({totalQuantity})
            </button>
          </div>
        </header>
      )}

      <main className={cn("max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8", isEmbedded && "pt-4")}>
        {/* Sidebar Controls */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-blue-600">
                <BarcodeIcon size={20} />
                <h2 className="font-bold text-lg">Articoli</h2>
              </div>
              <div className="flex items-center gap-3">
                {isEmbedded && (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating || !allItemsValid || totalQuantity === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      (!allItemsValid || totalQuantity === 0)
                        ? "bg-gray-100 text-gray-400" 
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    PDF
                  </button>
                )}
                <button 
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PlusCircle size={16} />
                  AGGIUNGI
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {config.items.map((item, index) => {
                const full = getFullCode(item.code);
                const valid = isValidEAN13(item.code);
                const correct = isChecksumCorrect(item.code);
                
                return (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Articolo {index + 1}</span>
                      {config.items.length > 1 && (
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-8 space-y-1">
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={13}
                            value={item.code}
                            onChange={(e) => updateItem(item.id, { code: e.target.value.replace(/\D/g, "") })}
                            placeholder="Codice EAN-13..."
                            className={cn(
                              "w-full bg-white border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 outline-none transition-all",
                              valid && !correct ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                            )}
                          />
                          {valid && (
                            <div className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold",
                              correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {correct ? "OK" : "ERR"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                          <button 
                            onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                            className="px-2 py-2 hover:bg-gray-50 text-gray-500"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-full text-center font-bold text-xs bg-transparent outline-none py-2"
                          />
                          <button 
                            onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                            className="px-2 py-2 hover:bg-gray-50 text-gray-500"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Settings2 size={20} />
              <h2 className="font-bold text-lg">Layout Pagina</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Colonne</label>
                <input
                  type="number"
                  value={config.columns}
                  onChange={(e) => setConfig({ ...config, columns: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Righe</label>
                <input
                  type="number"
                  value={config.rows}
                  onChange={(e) => setConfig({ ...config, rows: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Largh. (mm)</label>
                <input
                  type="number"
                  value={config.labelWidth}
                  onChange={(e) => setConfig({ ...config, labelWidth: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Alt. (mm)</label>
                <input
                  type="number"
                  value={config.labelHeight}
                  onChange={(e) => setConfig({ ...config, labelHeight: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Main Content: A4 Sheet Preview */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-600 flex items-center gap-2">
              <Printer size={18} />
              Anteprima Foglio A4
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 font-mono">Totale Etichette: {totalQuantity}</span>
              <span className="text-xs text-gray-400 font-mono">210 x 297 mm</span>
            </div>
          </div>
          
          {/* Virtual A4 Page */}
          <div className="bg-white shadow-2xl border border-gray-200 mx-auto overflow-hidden relative" 
               style={{ 
                 width: '210mm', 
                 height: '297mm',
                 transform: 'scale(0.7)',
                 transformOrigin: 'top center'
               }}>
            <div 
              className="grid gap-0"
              style={{
                paddingTop: `${config.marginTop}mm`,
                paddingLeft: `${config.marginLeft}mm`,
                gridTemplateColumns: `repeat(${config.columns}, ${config.labelWidth}mm)`,
                gridTemplateRows: `repeat(${config.rows}, ${config.labelHeight}mm)`,
              }}
            >
              {(() => {
                const previewItems = [];
                let count = 0;
                const maxPreview = config.columns * config.rows;
                
                for (const item of config.items) {
                  if (count >= maxPreview) break;
                  const full = getFullCode(item.code);
                  const valid = isValidEAN13(item.code);
                  
                  for (let i = 0; i < item.quantity; i++) {
                    if (count >= maxPreview) break;
                    previewItems.push(
                      <div 
                        key={`${item.id}-${i}`} 
                        className="border border-gray-100 flex flex-col items-center justify-center p-2 overflow-hidden"
                        style={{ width: `${config.labelWidth}mm`, height: `${config.labelHeight}mm` }}
                      >
                        {valid ? (
                          <>
                            <img 
                              src={`https://barcode.tec-it.com/barcode.ashx?data=${full}&code=EAN13&translate-esc=on&imagetype=png&dpi=300`} 
                              alt="Barcode" 
                              className="w-full h-auto max-h-[70%]"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8px] font-mono mt-1">{full}</span>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
                             <span className="text-[8px] text-gray-300">Codice non valido</span>
                          </div>
                        )}
                      </div>
                    );
                    count++;
                  }
                }
                return previewItems;
              })()}
            </div>
          </div>
          
          <p className="text-center text-gray-400 text-xs mt-[-80px] relative z-20">
            L'anteprima mostra solo la prima pagina. Il PDF finale includerà tutte le pagine necessarie.
          </p>
        </div>
      </main>

      {/* Footer */}
      {!isEmbedded && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 py-4 px-6 flex items-center justify-center gap-4 z-20">
          <p className="text-sm font-medium text-gray-600">App creata da</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
            <img 
              src="http://www.cavallinomatto.it/wp-content/uploads/2025/09/Risorsa1300x-scaled.png" 
              alt="Cavallino Matto" 
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://www.cavallinomatto.it/wp-content/uploads/2021/03/logo-cavallino-matto.png";
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-sm font-bold text-blue-600">| Andrea</p>
        </footer>
      )}
    </div>
  );
}
