import { invoke } from "@tauri-apps/api/core";
import { open, message } from "@tauri-apps/plugin-dialog";

const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;

const setIgnoreBlurSafely = async (ignore: boolean) => {
  try {
    await invoke("set_ignore_blur", { ignore });
  } catch {
    // Non-fatal: dialog/background selection should still work if this fails.
  }
};

export const chooseCustomBackgroundImage = async (t: (key: string) => string) => {
  await setIgnoreBlurSafely(true);

  let selected: string | string[] | null = null;
  try {
    selected = await open({
      multiple: false,
      filters: [
        {
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"]
        }
      ]
    });
  } finally {
    await setIgnoreBlurSafely(false);
    try {
      await invoke("focus_clipboard_window");
    } catch {
      // Ignore focus restore errors.
    }
  }

  if (!selected || typeof selected !== "string") return null;

  try {
    const stats = await invoke<{ size: number }>("get_file_size", { path: selected });
    if (stats.size > MAX_BACKGROUND_SIZE) {
      await message(
        t("background_size_error") ||
          `图片文件过大！请选择小于 ${Math.round(MAX_BACKGROUND_SIZE / 1024 / 1024)}MB 的图片。`,
        { title: t("error") || "错误", kind: "error" }
      );
      return null;
    }
  } catch (err) {
    console.warn("Failed to check background size:", err);
  }

  try {
    return await invoke<string>("save_custom_background", { sourcePath: selected });
  } catch (err) {
    console.error("Failed to save custom background:", err);
    await message(t("background_save_error") || "背景保存失败，请重新选择图片。", {
      title: t("error") || "错误",
      kind: "error"
    });
    return null;
  }
};
