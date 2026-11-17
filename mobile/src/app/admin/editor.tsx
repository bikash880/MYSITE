import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CoreBridge,
  darkEditorCss,
  darkEditorTheme,
  defaultEditorTheme,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";
import { toast } from "@/components/toast";
import { IconButton } from "@/components/ui";
import { editorStore } from "@/lib/editor-store";
import { chooseAndUploadImage } from "@/lib/upload";
import { API_URL, mediaUrl } from "@/lib/api";
import { errorMessage } from "@/lib/utils";
import { useTheme } from "@/providers/theme";

/**
 * Full-screen rich text editor (TenTap = Tiptap in a WebView), producing the same
 * HTML as the website's Tiptap editor.
 */
export default function EditorScreen() {
  const { scheme, colors } = useTheme();
  const session = editorStore.get();
  const [uploading, setUploading] = useState(false);

  const editor = useEditorBridge({
    // Make relative media paths absolute so images preview inside the editor's WebView.
    initialContent: (session?.html ?? "").replace(/(src=["'])\/api\/media\//g, `$1${API_URL}/api/media/`),
    autofocus: !session?.html,
    avoidIosKeyboard: true,
    bridgeExtensions:
      scheme === "dark"
        ? [...TenTapStartKit, CoreBridge.configureCSS(`${darkEditorCss} a { color: ${colors.primary}; } img { max-width: 100%; border-radius: 12px; }`)]
        : [...TenTapStartKit, CoreBridge.configureCSS(`a { color: ${colors.primary}; } img { max-width: 100%; border-radius: 12px; }`)],
    theme: scheme === "dark" ? darkEditorTheme : defaultEditorTheme,
  });
  const html = useEditorContent(editor, { type: "html", debounceInterval: 300 });

  useEffect(() => {
    if (!session) router.back();
  }, [session]);

  function done() {
    session?.onSave(html ?? session.html);
    editorStore.close();
    router.back();
  }

  async function insertImage() {
    try {
      const url = await chooseAndUploadImage(session?.folder ?? "content", () => setUploading(true));
      if (url) (editor as unknown as { setImage: (src: string) => void }).setImage(mediaUrl(url)!);
    } catch (e) {
      toast.error("Upload failed", errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: scheme === "dark" ? "#1C1C1E" : colors.card }}>
      <Stack.Screen
        options={{
          title: session?.title ?? "Editor",
          headerLeft: () => (
            <IconButton
              icon="close"
              label="Cancel"
              onPress={() => {
                editorStore.close();
                router.back();
              }}
            />
          ),
          headerRight: () => (
            <View className="flex-row items-center">
              {uploading ? (
                <ActivityIndicator color={colors.primary} style={{ marginHorizontal: 10 }} />
              ) : (
                <IconButton icon="image-outline" label="Insert image" onPress={insertImage} />
              )}
              <IconButton icon="checkmark" label="Done" color={colors.primary} onPress={done} />
            </View>
          ),
        }}
      />
      <RichText editor={editor} style={{ backgroundColor: "transparent" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ position: "absolute", width: "100%", bottom: 0 }}>
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
