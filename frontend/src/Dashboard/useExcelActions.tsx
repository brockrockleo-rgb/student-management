import { App as AntApp } from "antd";
import { api } from "../api";
import type { ResourceKey } from "../types";
import type { ImportExcelResult, ResourceConfig } from "./dashboard.types";

type UseExcelActionsOptions = {
  activeResource: ResourceKey;
  config: ResourceConfig;
  classFilter?: string;
  loadRows: () => Promise<void>;
  loadLookups: () => Promise<void>;
};

export function useExcelActions({
  activeResource,
  config,
  classFilter,
  loadRows,
  loadLookups,
}: UseExcelActionsOptions) {
  const { message, modal } = AntApp.useApp();

  const downloadExcel = async (template = false) => {
    if (!config.excel) {
      return;
    }

    try {
      const endpoint = template
        ? `${config.endpoint}/import-template`
        : `${config.endpoint}/export`;

      const { data } = await api.get<Blob>(endpoint, {
        responseType: "blob",
        params:
          !template && activeResource === "students" && classFilter
            ? { classId: classFilter }
            : undefined,
      });

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = url;
      link.download = template
        ? config.excel.templateFile
        : config.excel.exportFile;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      message.error(
        error.response?.data?.message ?? "Không thể tải file Excel",
      );
    }
  };

  const importExcel = async (file: File) => {
    if (!config.excel) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    try {
      const { data } = await api.post<ImportExcelResult>(
        `${config.endpoint}/import`,
        formData,
      );

      await Promise.all([loadRows(), loadLookups()]);

      if (!data.errors.length) {
        message.success(`Đã nhập ${data.imported} ${config.singular}`);
        return;
      }

      modal.warning({
        title: `Đã nhập ${data.imported}, bỏ qua ${data.skipped} dòng`,
        width: 620,
        content: (
          <div className="import-errors">
            {data.errors.slice(0, 10).map((item) => (
              <div key={`${item.row}-${item.message}`}>
                Dòng {item.row}: {item.message}
              </div>
            ))}

            {data.errors.length > 10 && (
              <div>… và {data.errors.length - 10} lỗi khác.</div>
            )}
          </div>
        ),
      });
    } catch (error: any) {
      message.error(
        error.response?.data?.message ?? "Không thể nhập file Excel",
      );
    }
  };

  return {
    downloadExcel,
    importExcel,
  };
}
