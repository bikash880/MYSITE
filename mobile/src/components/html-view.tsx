import { useMemo, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/providers/theme";
import { HEIGHT_SCRIPT, htmlDocument } from "@/lib/html";
import { API_URL } from "@/lib/api";

/** Renders rich-text HTML (from the Tiptap editor) with the app theme; links open in the browser. */
export function HtmlView({ html }: { html: string }) {
  const { colors } = useTheme();
  const [height, setHeight] = useState(200);
  // baseUrl lets relative "/api/media/<id>" images resolve against the API server.
  const source = useMemo(() => ({ html: htmlDocument(html, colors), baseUrl: API_URL || "" }), [html, colors]);

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={["*"]}
        source={source}
        style={{ backgroundColor: "transparent" }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        injectedJavaScript={HEIGHT_SCRIPT}
        onMessage={(e) => {
          const h = Number(e.nativeEvent.data);
          if (Number.isFinite(h) && h > 0) setHeight(Math.ceil(h) + 8);
        }}
        onShouldStartLoadWithRequest={(req) => {
          // Allow the initial document load (which uses baseUrl); open every link in the browser.
          const isDocument = !API_URL ? false : req.url === API_URL || req.url === `${API_URL}/`;
          if (req.url.startsWith("http") && !isDocument) {
            WebBrowser.openBrowserAsync(req.url).catch(() => {});
            return false;
          }
          return true;
        }}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        accessibilityLabel="Article content"
      />
    </View>
  );
}
