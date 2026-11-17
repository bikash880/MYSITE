import { useMemo } from "react";
import { FormScreen } from "@/components/admin/form-screen";
import { useSaveSingleton, useSingleton } from "@/hooks/use-admin-data";
import { settingsForm, toFormValues } from "@/lib/resources";

export default function SettingsScreen() {
  const q = useSingleton("settings");
  const save = useSaveSingleton("settings");
  const initial = useMemo(() => (q.data !== undefined ? toFormValues(settingsForm.fields, q.data) : undefined), [q.data]);

  return (
    <FormScreen
      title="Settings"
      fields={settingsForm.fields}
      initial={initial}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      save={(v) => save.mutateAsync(v)}
    />
  );
}
