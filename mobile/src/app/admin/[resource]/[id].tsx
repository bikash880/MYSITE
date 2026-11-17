import { useMemo } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FormScreen } from "@/components/admin/form-screen";
import { toast } from "@/components/toast";
import { Button, EmptyState } from "@/components/ui";
import { useAdminRecord, useDeleteRecord, useSaveRecord } from "@/hooks/use-admin-data";
import { isResourceKey, RESOURCES, toFormValues, type ResourceKey } from "@/lib/resources";
import { errorMessage } from "@/lib/utils";

export default function EditRecordScreen() {
  const { resource, id } = useLocalSearchParams<{ resource: string; id: string }>();
  if (!isResourceKey(resource)) return <EmptyState icon="help-circle-outline" title="Unknown section" />;
  return <EditRecord resourceKey={resource} id={id === "new" ? null : id} />;
}

function EditRecord({ resourceKey, id }: { resourceKey: ResourceKey; id: string | null }) {
  const cfg = RESOURCES[resourceKey];
  const record = useAdminRecord(resourceKey, id);
  const save = useSaveRecord(resourceKey);
  const del = useDeleteRecord(resourceKey);

  const initial = useMemo(() => {
    if (!id) return toFormValues(cfg.fields, null, cfg.defaults);
    return record.data ? toFormValues(cfg.fields, record.data, cfg.defaults) : undefined;
  }, [id, record.data, cfg]);

  if (id && !record.isLoading && !record.data && !record.error) {
    return <EmptyState icon="search-outline" title={`${cfg.singular} not found`} />;
  }

  return (
    <FormScreen
      title={id ? `Edit ${cfg.singular.toLowerCase()}` : `New ${cfg.singular.toLowerCase()}`}
      fields={cfg.fields}
      initial={initial}
      loading={record.isLoading}
      error={record.error}
      onRetry={record.refetch}
      save={(values) => save.mutateAsync({ id, values })}
      onSaved={() => router.back()}
      footer={
        id ? (
          <Button
            title={`Delete ${cfg.singular.toLowerCase()}`}
            icon="trash-outline"
            variant="ghost"
            textClassName="text-danger"
            loading={del.isPending}
            onPress={() =>
              Alert.alert(`Delete ${cfg.singular.toLowerCase()}?`, "This cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () =>
                    del.mutate(id, {
                      onSuccess: () => {
                        toast.success(`${cfg.singular} deleted`);
                        router.back();
                      },
                      onError: (e) => toast.error("Delete failed", errorMessage(e)),
                    }),
                },
              ])
            }
          />
        ) : null
      }
    />
  );
}
