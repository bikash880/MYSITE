import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { Screen } from "@/components/screen";
import { toast } from "@/components/toast";
import { Button, Card, ErrorState, IconButton, ListSkeleton } from "@/components/ui";
import { ValidationError } from "@/hooks/use-admin-data";
import type { FieldConfig } from "@/lib/resources";
import { errorMessage } from "@/lib/utils";
import { useTheme } from "@/providers/theme";
import { FormFields } from "./form-fields";

/**
 * Shared edit screen: renders fields, validates with Zod (inside `save`),
 * shows toasts, and warns before leaving with unsaved changes.
 */
export function FormScreen({
  title,
  fields,
  initial,
  loading,
  error,
  onRetry,
  save,
  onSaved,
  footer,
}: {
  title: string;
  fields: FieldConfig[];
  initial: Record<string, unknown> | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  save: (values: Record<string, unknown>) => Promise<unknown>;
  onSaved?: () => void;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (initial && !loaded.current) {
      loaded.current = true;
      setValues(initial);
    }
  }, [initial]);

  usePreventRemove(dirty && !saving, ({ data }) => {
    Alert.alert("Discard changes?", "You have unsaved changes.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  function onChange(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
    setDirty(true);
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  }

  async function submit() {
    setSaving(true);
    try {
      await save(values);
      setDirty(false);
      setErrors({});
      toast.success(`${title} saved`);
      // Let the dirty flag clear before navigating away.
      setTimeout(() => onSaved?.(), 0);
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(e.fields);
        toast.error("Please fix the highlighted fields.");
      } else toast.error("Save failed", errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <Stack.Screen
      options={{
        title,
        headerRight: () => <IconButton icon="checkmark" label="Save" color={colors.primary} onPress={submit} />,
      }}
    />
  );

  if (loading && !initial) {
    return (
      <Screen>
        {header}
        <ListSkeleton rows={3} image={false} />
      </Screen>
    );
  }
  if (error && !initial) {
    return (
      <Screen>
        {header}
        <ErrorState error={error} onRetry={onRetry} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      {header}
      <Screen>
        <Card className="p-4">
          <FormFields fields={fields} values={values} errors={errors} onChange={onChange} />
        </Card>
        <Button title="Save" icon="save-outline" size="lg" loading={saving} onPress={submit} />
        {footer}
      </Screen>
    </KeyboardAvoidingView>
  );
}
