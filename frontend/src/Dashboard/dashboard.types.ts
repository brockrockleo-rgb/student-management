import type { Key } from "react";
import type { resourceConfigs } from "../config";
import type { Action, ResourceKey } from "../types";

export type ResourceConfig = (typeof resourceConfigs)[ResourceKey];

export type PermissionChecker = (
  action: Action,
  resource: ResourceKey,
) => boolean;

export type ImportExcelResult = {
  imported: number;
  skipped: number;
  importedCodes: string[];
  errors: {
    row: number;
    message: string;
  }[];
};

export type SelectedKeys = Key[];
