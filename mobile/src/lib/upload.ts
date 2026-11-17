import { Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { api } from "./api";

const MAX_BYTES = 4 * 1024 * 1024; // server limit (Vercel request bodies max out at 4.5 MB)
const MAX_DIMENSION = 2000;

async function ensurePermission(source: "camera" | "library") {
  const res =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (res.granted) return true;
  Alert.alert(
    "Permission needed",
    `Allow ${source === "camera" ? "camera" : "photo library"} access in Settings to upload images.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

/** Opens the camera or gallery. Returns null if the user cancels. */
export async function pickImage(source: "camera" | "library", aspect?: [number, number]) {
  if (!(await ensurePermission(source))) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect, quality: 0.85, exif: false };
  const result =
    source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

/** Downscales large photos and converts to JPEG so uploads stay small and HEIC works everywhere. */
async function prepareImage(asset: ImagePicker.ImagePickerAsset) {
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_DIMENSION || asset.height > MAX_DIMENSION) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION });
  }
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: out.uri, mimeType: "image/jpeg", fileName: `${(asset.fileName ?? "photo").replace(/\.[^.]+$/, "")}.jpg` };
}

export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

/** Uploads a local file to MongoDB GridFS via the admin API. Returns its path ("/api/media/<id>"). */
export async function uploadUri(uri: string, { folder, mimeType, fileName }: { folder: string; mimeType?: string | null; fileName?: string | null }) {
  const size = new File(uri).size ?? 0;
  if (size > MAX_BYTES) throw new Error("File is too large (max 4 MB).");

  const form = new FormData();
  const name = fileName || uri.split("/").pop() || "upload";
  const type = mimeType || "application/octet-stream";
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(uri)).blob(), name);
  } else {
    // React Native's FormData streams the file from disk when given { uri, name, type }.
    form.append("file", { uri, name, type } as unknown as Blob);
  }
  form.append("folder", folder);

  const res = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form, auth: true });
  return res.url;
}

/** Shows a "Take photo / Choose from library" sheet, then resizes + uploads. Returns the URL or null. */
export function chooseAndUploadImage(folder: string, onStart?: () => void, aspect?: [number, number]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const go = async (source: "camera" | "library") => {
      try {
        const asset = await pickImage(source, aspect);
        if (!asset) return resolve(null);
        onStart?.();
        const img = await prepareImage(asset);
        resolve(await uploadUri(img.uri, { folder, mimeType: img.mimeType, fileName: img.fileName }));
      } catch (e) {
        reject(e);
      }
    };
    Alert.alert("Add image", undefined, [
      { text: "Take photo", onPress: () => go("camera") },
      { text: "Choose from library", onPress: () => go("library") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
