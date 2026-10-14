// datasets.ts — dataset/row/column CRUD methods, mirroring
// backend/routers/datasets.py one for one. Spread into the combined
// `api` object in index.ts.
import type { DatasetSummary, RowsPage, CellUpdate } from "../types";
import { req } from "./client";

export const datasetsApi = {
  listDatasets: () => req<DatasetSummary[]>("/api/datasets"),

  createDataset: (name: string, headers: string[], rows: (string | number)[][] = []) =>
    req<DatasetSummary>("/api/datasets", {
      method: "POST",
      body: JSON.stringify({ name, headers, rows }),
    }),

  deleteDataset: (id: number) =>
    req<{ ok: boolean }>(`/api/datasets/${id}`, { method: "DELETE" }),

  renameDataset: (id: number, name: string) =>
    req<{ ok: boolean }>(`/api/datasets/${id}/rename`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),

  getPage: (id: number, offset: number, limit: number) =>
    req<RowsPage>(`/api/datasets/${id}/page?offset=${offset}&limit=${limit}`),

  getColumn: (id: number, colIndex: number) =>
    req<{ values: (string | number | null)[] }>(`/api/datasets/${id}/column/${colIndex}`),

  updateCells: (id: number, updates: CellUpdate[]) =>
    req<{ ok: boolean; rows_updated: number; headers: string[] }>(
      `/api/datasets/${id}/cells`,
      { method: "PATCH", body: JSON.stringify({ updates }) }
    ),

  deleteRow: (id: number, rowIndex: number) =>
    req<{ ok: boolean }>(`/api/datasets/${id}/rows/${rowIndex}`, { method: "DELETE" }),

  addColumn: (id: number, name = "") =>
    req<{ ok: boolean; headers: string[] }>(`/api/datasets/${id}/columns`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  deleteColumn: (id: number, colIndex: number) =>
    req<{ ok: boolean; headers: string[] }>(`/api/datasets/${id}/columns/${colIndex}`, {
      method: "DELETE",
    }),
};
