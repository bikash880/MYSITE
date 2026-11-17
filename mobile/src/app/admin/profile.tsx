import { useMemo } from "react";
import { FormScreen } from "@/components/admin/form-screen";
import { useSaveSingleton, useSingleton } from "@/hooks/use-admin-data";
import { profileForm, toFormValues } from "@/lib/resources";

export default function ProfileScreen() {
  const q = useSingleton("profile");
  const save = useSaveSingleton("profile");
  const initial = useMemo(() => (q.data !== undefined ? toFormValues(profileForm.fields, q.data) : undefined), [q.data]);

  return (
    <FormScreen
      title="Profile"
      fields={profileForm.fields}
      initial={initial}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      save={(v) => save.mutateAsync(v)}
    />
  );
}
