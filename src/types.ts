export interface BarcodeItem {
  id: string;
  code: string;
  quantity: number;
}

export interface BarcodeConfig {
  items: BarcodeItem[];
  labelWidth: number; // mm
  labelHeight: number; // mm
  columns: number;
  rows: number;
  marginTop: number; // mm
  marginLeft: number; // mm
}

export const DEFAULT_CONFIG: BarcodeConfig = {
  items: [
    { id: "1", code: "4250001791070", quantity: 24 }
  ],
  labelWidth: 65,
  labelHeight: 34,
  columns: 3,
  rows: 8,
  marginTop: 10,
  marginLeft: 7,
};
