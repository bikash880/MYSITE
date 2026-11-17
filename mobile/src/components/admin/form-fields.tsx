import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { toast } from "@/components/toast";
import { Button, Chip, cn, FieldMessage, Image, Input, Label } from "@/components/ui";
import { editorStore } from "@/lib/editor-store";
import type { FieldConfig } from "@/lib/resources";
import { chooseAndUploadImage, pickDocument, uploadUri } from "@/lib/upload";
import { errorMessage, stripHtml } from "@/lib/utils";
import { isHex } from "@/lib/theme";
import { useTheme } from "@/providers/theme";

type Values = Record<string, unknown>;

export function FormFields({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: FieldConfig[];
  values: Values;
  errors: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
}) {
  return (
    <View className="gap-5">
      {fields.map((f) => (
        <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => onChange(f.name, v)} />
      ))}
    </View>
  );
}

function Field({ field: f, value, error, onChange }: { field: FieldConfig; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const { colors } = useTheme();
  const str = value == null ? "" : String(value);

  if (f.type === "switch") {
    return (
      <View>
        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="flex-1 text-base text-foreground">{f.label}</Text>
          <Switch
            value={Boolean(value)}
            onValueChange={onChange}
            trackColor={{ true: colors.primary, false: colors.muted }}
            thumbColor="#fff"
            accessibilityLabel={f.label}
          />
        </View>
        <FieldMessage error={error} help={f.help} />
      </View>
    );
  }

  let control: React.ReactNode;
  switch (f.type) {
    case "textarea":
      control = <Input value={str} onChangeText={onChange} multiline placeholder={f.placeholder} invalid={Boolean(error)} />;
      break;
    case "number":
      control = (
        <Input
          value={str}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder={f.placeholder}
          invalid={Boolean(error)}
        />
      );
      break;
    case "url":
    case "email":
      control = (
        <Input
          value={str}
          onChangeText={onChange}
          placeholder={f.placeholder}
          keyboardType={f.type === "url" ? "url" : "email-address"}
          autoCapitalize="none"
          autoCorrect={false}
          invalid={Boolean(error)}
        />
      );
      break;
    case "select":
      control = (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {f.options?.map((o) => (
            <Chip key={o.value} label={o.label} active={str === o.value} onPress={() => onChange(o.value)} />
          ))}
        </ScrollView>
      );
      break;
    case "tags":
      control = <TagsField value={(value as string[]) ?? []} onChange={onChange} placeholder={f.placeholder} invalid={Boolean(error)} />;
      break;
    case "date":
      control = <DateField value={str} onChange={onChange} required={f.required} invalid={Boolean(error)} />;
      break;
    case "image":
      control = <ImageField value={str} onChange={onChange} folder={f.folder ?? "uploads"} />;
      break;
    case "file":
      control = <FileField value={str} onChange={onChange} folder={f.folder ?? "files"} />;
      break;
    case "richtext":
      control = <RichTextField value={str} onChange={onChange} folder={f.folder ?? "content"} label={f.label} invalid={Boolean(error)} />;
      break;
    case "color":
      control = <ColorField value={str} onChange={onChange} invalid={Boolean(error)} />;
      break;
    default:
      control = (
        <Input
          value={str}
          onChangeText={onChange}
          placeholder={f.placeholder}
          autoCapitalize={f.name === "slug" ? "none" : "sentences"}
          autoCorrect={f.name !== "slug"}
          invalid={Boolean(error)}
        />
      );
  }

  return (
    <View>
      <Label required={f.required}>{f.label}</Label>
      {control}
      <FieldMessage error={error} help={f.help} />
    </View>
  );
}

/* ------------------------------------------------------------------ */

function TagsField({ value, onChange, placeholder, invalid }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; invalid?: boolean }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !value.some((v) => v.toLowerCase() === t.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  return (
    <View className="gap-2">
      {value.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {value.map((t) => (
            <Pressable
              key={t}
              onPress={() => onChange(value.filter((x) => x !== t))}
              accessibilityLabel={`Remove ${t}`}
              className="flex-row items-center gap-1 rounded-xl bg-primary/15 py-1.5 pl-3 pr-2"
            >
              <Text className="text-sm font-medium text-primary">{t}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      )}
      <Input
        value={draft}
        onChangeText={(t) => (t.endsWith(",") ? (setDraft(t), setTimeout(commit, 0)) : setDraft(t))}
        onSubmitEditing={commit}
        onBlur={() => draft && commit()}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={placeholder ?? "Type and press return"}
        autoCapitalize="none"
        invalid={invalid}
      />
    </View>
  );
}

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromISODate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date());

function DateField({ value, onChange, required, invalid }: { value: string; onChange: (v: string) => void; required?: boolean; invalid?: boolean }) {
  const { colors, scheme } = useTheme();
  const date = fromISODate(value);
  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: date, mode: "date", onChange: (e, d) => e.type === "set" && d && onChange(toISODate(d)) });
    } else onChange(toISODate(date));
  };

  return (
    <View className="flex-row items-center gap-2">
      {Platform.OS === "ios" && value ? (
        <View className={cn("flex-1 flex-row items-center rounded-2xl border bg-card px-2 py-1.5", invalid ? "border-danger" : "border-border")}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            themeVariant={scheme}
            accentColor={colors.primary}
            onChange={(_, d) => d && onChange(toISODate(d))}
          />
        </View>
      ) : (
        <Pressable
          onPress={open}
          accessibilityRole="button"
          className={cn("h-12 flex-1 flex-row items-center gap-2 rounded-2xl border bg-card px-4", invalid ? "border-danger" : "border-border")}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
          <Text className={value ? "text-base text-foreground" : "text-base text-muted-foreground"}>{value || "Select a date"}</Text>
        </Pressable>
      )}
      {value && !required ? (
        <Pressable onPress={() => onChange("")} accessibilityLabel="Clear date" className="h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ImageField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder: string }) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  async function choose() {
    try {
      const url = await chooseAndUploadImage(folder, () => setUploading(true));
      if (url) {
        onChange(url);
        toast.success("Image uploaded");
      }
    } catch (e) {
      toast.error("Upload failed", errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={choose}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={value ? "Replace image" : "Add image"}
        className="aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card"
      >
        {value ? <Image source={{ uri: value }} className="absolute inset-0" contentFit="cover" /> : null}
        {uploading ? (
          <View className="items-center gap-2 rounded-2xl bg-black/50 px-4 py-3">
            <ActivityIndicator color="#fff" />
            <Text className="text-xs text-white">Uploading…</Text>
          </View>
        ) : !value ? (
          <View className="items-center gap-1">
            <Ionicons name="camera-outline" size={30} color={colors.mutedForeground} />
            <Text className="text-sm text-muted-foreground">Take a photo or choose from library</Text>
          </View>
        ) : null}
      </Pressable>
      {value ? (
        <View className="flex-row gap-2">
          <Button title="Replace" icon="images-outline" size="sm" variant="outline" className="flex-1" onPress={choose} disabled={uploading} />
          <Button title="Remove" icon="trash-outline" size="sm" variant="ghost" onPress={() => onChange("")} disabled={uploading} />
        </View>
      ) : null}
    </View>
  );
}

function FileField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder: string }) {
  const [uploading, setUploading] = useState(false);
  async function choose() {
    try {
      const doc = await pickDocument();
      if (!doc) return;
      setUploading(true);
      const url = await uploadUri(doc.uri, { folder, mimeType: doc.mimeType, fileName: doc.name });
      onChange(url);
      toast.success("File uploaded");
    } catch (e) {
      toast.error("Upload failed", errorMessage(e));
    } finally {
      setUploading(false);
    }
  }
  return (
    <View className="gap-2">
      {value ? (
        <Text className="text-sm text-primary" numberOfLines={1}>
          {decodeURIComponent(value.split("/").pop() ?? value)}
        </Text>
      ) : (
        <Text className="text-sm text-muted-foreground">No file uploaded</Text>
      )}
      <View className="flex-row gap-2">
        <Button title={value ? "Replace file" : "Upload file"} icon="document-attach-outline" size="sm" variant="outline" className="flex-1" loading={uploading} onPress={choose} />
        {value ? <Button title="Remove" icon="trash-outline" size="sm" variant="ghost" onPress={() => onChange("")} /> : null}
      </View>
    </View>
  );
}

function RichTextField({ value, onChange, folder, label, invalid }: { value: string; onChange: (v: string) => void; folder: string; label: string; invalid?: boolean }) {
  const preview = stripHtml(value);
  return (
    <Pressable
      onPress={() => {
        editorStore.open({ html: value, folder, title: label, onSave: onChange });
        router.push("/admin/editor");
      }}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}`}
      className={cn("min-h-28 rounded-2xl border bg-card p-4", invalid ? "border-danger" : "border-border")}
    >
      <Text className={preview ? "text-sm leading-5 text-foreground" : "text-sm text-muted-foreground"} numberOfLines={5}>
        {preview || "Tap to write…"}
      </Text>
      <Text className="mt-3 text-sm font-semibold text-primary">Open editor →</Text>
    </Pressable>
  );
}

const SWATCHES = ["#6C63FF", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6"];

function ColorField({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 rounded-2xl border border-border" style={{ backgroundColor: isHex(value) ? value : "transparent" }} />
        <Input value={value} onChangeText={onChange} autoCapitalize="characters" maxLength={7} className="flex-1 font-mono" invalid={invalid} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityLabel={`Use colour ${c}`}
            className={cn("h-9 w-9 rounded-full", value.toUpperCase() === c && "border-4 border-foreground")}
            style={{ backgroundColor: c }}
          />
        ))}
      </View>
    </View>
  );
}
