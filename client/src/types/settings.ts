export interface OrganizationSettings {
  id: string;
  name: string;
  defaultLowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  defaultLowStockThreshold: number;
}

