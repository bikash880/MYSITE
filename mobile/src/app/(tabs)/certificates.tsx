import { useMemo, useState } from "react";
import { FlatList, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { CertificateCard } from "@/components/cards";
import { useRefreshControl } from "@/components/screen";
import { Chip, EmptyState, ErrorState, ListSkeleton } from "@/components/ui";
import { useCertificates, useRefresh } from "@/hooks/use-public-data";

export default function CertificatesScreen() {
  const { data, isLoading, error, refetch } = useCertificates();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const refreshControl = useRefreshControl(refreshing, onRefresh);
  const [issuer, setIssuer] = useState("All");

  const issuers = useMemo(() => ["All", ...Array.from(new Set((data ?? []).map((c) => c.issuer))).sort()], [data]);
  const filtered = issuer === "All" ? data ?? [] : (data ?? []).filter((c) => c.issuer === issuer);

  return (
    <FlatList
      data={isLoading ? [] : filtered}
      keyExtractor={(c) => c.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
      refreshControl={refreshControl}
      ListHeaderComponent={
        issuers.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
            {issuers.map((i) => (
              <Chip key={i} label={i} active={i === issuer} onPress={() => setIssuer(i)} />
            ))}
          </ScrollView>
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <ListSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <EmptyState icon="ribbon-outline" title="No certificates yet" description="Certificates appear here once published." />
        )
      }
      renderItem={({ item }) => (
        <Animated.View entering={FadeIn}>
          <CertificateCard cert={item} />
        </Animated.View>
      )}
    />
  );
}
