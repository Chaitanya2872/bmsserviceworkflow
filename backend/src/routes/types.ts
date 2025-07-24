export interface Asset {
  id: number;
  name: string;
  [key: string]: any;
}

export interface DB {
  assets: Asset[];
}
